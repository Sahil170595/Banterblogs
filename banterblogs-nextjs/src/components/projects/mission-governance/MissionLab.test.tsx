import { webcrypto } from 'node:crypto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MissionLab } from './MissionLab';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));
afterEach(()=>{ cleanup();vi.unstubAllGlobals(); });
describe('mission governance operator workflow',()=>{
  const validateApproveStart=()=>{
    fireEvent.click(screen.getByRole('button',{ name:'Validate mission' }));
    fireEvent.click(screen.getByRole('button',{ name:'Approve simulation' }));
    fireEvent.click(screen.getByRole('button',{ name:'Start simulation' }));
  };
  it('enforces gates, pauses, returns and resets',()=>{
    render(<MissionLab/>);
    expect((screen.getByRole('button',{ name:'Start simulation' }) as HTMLButtonElement).disabled).toBe(true);
    validateApproveStart();
    fireEvent.click(screen.getByRole('button',{ name:'Step mission' }));
    expect(screen.getByTestId('mission-progress').textContent).toBe('1 / 4');
    fireEvent.click(screen.getByRole('button',{ name:'Pause mission' }));
    expect(screen.getByTestId('mission-state').textContent).toBe('paused');
    fireEvent.click(screen.getByRole('button',{ name:'Resume mission' }));
    fireEvent.click(screen.getByRole('button',{ name:'Return to launch' }));
    expect(screen.getByTestId('mission-state').textContent).toBe('rtl');
    fireEvent.click(screen.getByRole('button',{ name:'Reset mission' }));
    expect(screen.getByTestId('mission-state').textContent).toBe('draft');
  });
  it('applies an invalid boundary fixture and exposes concrete failed checks',()=>{
    render(<MissionLab/>);
    fireEvent.change(screen.getByLabelText('Synthetic mission fixture'),{ target:{ value:'boundary' } });
    fireEvent.click(screen.getByRole('button',{ name:'Load fixture' }));
    fireEvent.click(screen.getByRole('button',{ name:'Validate mission' }));
    expect(screen.getByTestId('mission-state').textContent).toBe('draft');
    expect(screen.getByText('waypoint_seq_1_outside_geofence')).toBeTruthy();
    expect(screen.getByText('waypoint_seq_2_exceeds_30m')).toBeTruthy();
  });
  it('injects actual runtime fault state and verifies replay',async()=>{
    render(<MissionLab/>);
    validateApproveStart();
    fireEvent.change(screen.getByLabelText('Fault scenario'),{ target:{ value:'battery' } });
    fireEvent.click(screen.getByRole('button',{ name:'Inject fault' }));
    fireEvent.click(screen.getByRole('button',{ name:'Step mission' }));
    expect(screen.getByTestId('mission-state').textContent).toBe('rtl');
    fireEvent.click(screen.getByRole('button',{ name:'Verify replay' }));
    await waitFor(()=>expect(screen.getByText('All four content hashes and deterministic replay match.')).toBeTruthy());
  });
  it('edits a synthetic waypoint and invalidates earlier approval on apply',()=>{
    render(<MissionLab/>);
    validateApproveStart();
    const details=screen.getByLabelText('Waypoint 1 X').closest('details')!;
    expect(details.open).toBe(false);
    fireEvent.click(details.querySelector('summary')!);
    fireEvent.change(screen.getByLabelText('Waypoint 1 X'),{ target:{ value:'150' } });
    fireEvent.click(screen.getByRole('button',{ name:'Apply edited mission' }));
    expect(screen.getByTestId('mission-state').textContent).toBe('draft');
    fireEvent.click(screen.getByRole('button',{ name:'Validate mission' }));
    expect(screen.getByText('waypoint_seq_1_outside_geofence')).toBeTruthy();
  });
});
