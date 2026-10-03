import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, exportTrace, step } from '@/lib/projects/customer-service/engine';
import { scriptedActions } from '@/lib/projects/customer-service/scripts';
import ServiceLab from './ServiceLab';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('service workbench controls (DOM unit tests, not browser QA)', () => {
  it('steps real tool observations, completes a remedy, and resets effects', () => {
    render(<ServiceLab />);
    const trace = screen.getByLabelText('Episode actions');
    expect(within(trace).queryAllByRole('button')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    expect(within(trace).getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('Order evidence retrieved.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Run script' }));
    expect(screen.getByText('Coherent branch completed')).toBeDefined();
    expect(screen.getByLabelText('Total reward').textContent).toBe('1.00');
    fireEvent.click(screen.getByRole('button', { name: 'Reset current episode' }));
    expect(within(trace).queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Resolution incomplete')).toBeDefined();
  });

  it('runs a zero-stock partial remedy and a genuine conflicting-write failure', () => {
    render(<ServiceLab />);
    fireEvent.change(screen.getByLabelText('Preferred stock'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'New episode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run script' }));
    expect(screen.getByLabelText('Total reward').textContent).toBe('0.60');
    fireEvent.change(screen.getByLabelText('Preferred stock'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'New episode' }));
    fireEvent.change(screen.getByLabelText('Scripted control'), { target: { value: 'double-remedy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run script' }));
    expect(screen.getByText('Off-goal effects committed')).toBeDefined();
    expect(screen.getByLabelText('Total reward').textContent).toBe('-0.40');
  });

  it('validates manual commands and closes the episode without mutating state', () => {
    render(<ServiceLab />);
    fireEvent.change(screen.getByLabelText('Tool'), { target: { value: 'refund' } });
    fireEvent.click(screen.getByRole('button', { name: 'Execute tool' }));
    expect(screen.getByText(/Record the synthetic customer choice for this exact/)).toBeDefined();
    fireEvent.change(screen.getByLabelText('Order ID'), { target: { value: 'S-990' } });
    fireEvent.change(screen.getByLabelText('Tool'), { target: { value: 'order' } });
    fireEvent.click(screen.getByRole('button', { name: 'Execute tool' }));
    expect(screen.getByText('That order or related record is unavailable for this account.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close episode' }));
    expect((screen.getByRole('button', { name: 'Execute tool' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('exports a download and imports a replayed trace through the file control', async () => {
    const createObjectURL = vi.fn(() => 'blob:synthetic-trace');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ServiceLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Export versioned JSON trace' }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-trace');

    const initial = createSession({ scenario: 'duplicate' });
    const session = scriptedActions(initial.config, 'verified').reduce(step, initial);
    const json = JSON.stringify(exportTrace(session));
    const file = { size: json.length, text: async () => json };
    fireEvent.change(screen.getByLabelText('Trace file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByLabelText('Total reward').textContent).toBe('1.00'));
    expect(screen.getByRole('heading', { name: 'Two full captures' })).toBeDefined();
  });
});
