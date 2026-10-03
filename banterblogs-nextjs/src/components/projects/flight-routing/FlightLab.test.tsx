import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlightLab } from './FlightLab';
afterEach(cleanup);
describe('routing lab controls', () => {
  it('keeps advanced settings closed without removing the controls', () => {
    render(<FlightLab />);
    const seed = screen.getByLabelText('Scenario seed');
    const advanced = seed.closest('details')!;
    expect(advanced.open).toBe(false);
    expect(screen.getByLabelText('Continuation policy').closest('details')).toBe(advanced);
    fireEvent.click(advanced.querySelector('summary')!);
    expect(advanced.open).toBe(true);
    fireEvent.change(seed, { target: { value: '17' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply scenario' }));
    expect(advanced.textContent).toContain('seed 17');
  });
  it('steps a selected itinerary, rewinds, runs and resets', () => {
    render(<FlightLab />);
    fireEvent.click(screen.getByLabelText('Select F1 to ORD'));
    fireEvent.click(screen.getByRole('button', { name: 'Step selected flight' }));
    expect(screen.getByTestId('episode-status').textContent).toContain('no candidates');
    fireEvent.click(screen.getByRole('button', { name: 'Rewind one decision' }));
    expect(screen.getByTestId('episode-status').textContent).toContain('in progress');
    fireEvent.click(screen.getByRole('button', { name: 'Run policy' }));
    expect(screen.getByTestId('episode-status').textContent).not.toContain('in progress');
    fireEvent.click(screen.getByRole('button', { name: 'Reset scenario' }));
    expect(screen.getByTestId('episode-status').textContent).toContain('in progress');
  });
  it('applies meaningful configuration and compares shared worlds', () => {
    render(<FlightLab />);
    fireEvent.change(screen.getByLabelText('Disruption profile'), { target: { value: 'clear' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply scenario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compare policies' }));
    expect(screen.getByText('64 shared synthetic worlds')).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Policy comparison' }).textContent).toContain('Nonstop first');
  });
  it('rejects incompatible numeric inputs without losing the active episode', () => {
    render(<FlightLab />);
    fireEvent.change(screen.getByLabelText('Deadline (minutes)'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply scenario' }));
    expect(screen.getByRole('alert').textContent).toContain('Deadline must not exceed');
    expect(screen.getByTestId('episode-status').textContent).toContain('in progress');
  });
  it('exports versioned trace JSON', () => {
    const create = vi.fn(() => 'blob:trace');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<FlightLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON trace' }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledOnce();
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
