import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import SchedulingLab from './SchedulingLab';
import { exportTrace, freshSession } from '@/lib/projects/scheduling-lab/engine';

afterEach(cleanup);
describe('scheduling lab controls', () => {
  it('opens and closes settings without discarding a draft', () => {
    render(<SchedulingLab />);
    const toggle = screen.getByRole('button', { name: 'Schedule settings' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '74' } });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('Seed')).toHaveProperty('value', '74');
  });
  it('recomputes an edited seed and resets configuration and virtual progress', () => {
    render(<SchedulingLab />);
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '99' } });
    expect(screen.getByText('Pending edits')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export JSON' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Recompute schedule' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step simulation' }));
    expect(screen.getByText(/1 simulated processed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset schedule' }));
    expect(screen.getByLabelText('Seed')).toHaveProperty('value', '41');
    expect(screen.getByText(/0 simulated processed/)).toBeTruthy();
  });
  it('exposes no-window infeasibility and clamp violations as separate outcomes', () => {
    render(<SchedulingLab />);
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'after-hours' } });
    expect(screen.getByText('No forward-feasible slot within the campaign and business-hour bounds.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Bounds policy'), { target: { value: 'clamp-audit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recompute schedule' }));
    expect(screen.getAllByText('business-hours').length).toBeGreaterThan(0);
  });
  it('replays configuration and recomputes rather than trusting result fields', async () => {
    render(<SchedulingLab />);
    const trace = exportTrace(freshSession('after-hours'));
    trace.result.metrics.admitted = 99;
    const file = new File([JSON.stringify(trace)], 'schedule.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify(trace) });
    fireEvent.change(screen.getByLabelText('JSON replay file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('Replayed session; schedule recomputed.')).toBeTruthy());
    expect(screen.getByText('No forward-feasible slot within the campaign and business-hour bounds.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Step simulation' }).hasAttribute('disabled')).toBe(true);
  });
  it('prevents selection of deleted events on a pending last-run timeline', () => {
    render(<SchedulingLab />);
    fireEvent.change(screen.getByLabelText('Event count'), { target: { value: '2' } });
    const removed = screen.getByRole('button', { name: 'Select timeline event E12' });
    expect(removed.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(removed);
    expect(screen.getByRole('heading', { name: 'E01 / synthetic event' })).toBeTruthy();
  });
  it('preserves second precision when a UTC start is replayed and edited', async () => {
    render(<SchedulingLab />);
    const session = freshSession(); session.config.start = '2026-01-12T10:03:27Z';
    const text = JSON.stringify(exportTrace(session));
    const file = new File([text], 'schedule.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => text });
    fireEvent.change(screen.getByLabelText('JSON replay file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('Replayed session; schedule recomputed.')).toBeTruthy());
    expect(screen.getByLabelText('Campaign start UTC')).toHaveProperty('valueAsNumber', Date.parse('2026-01-12T10:03:27Z'));
    fireEvent.change(screen.getByLabelText('Campaign start UTC'), { target: { value: '2026-01-12T10:04:28' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recompute schedule' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/Virtual clock: 2026-01-12 10:04:28Z/)).toBeTruthy();
  });
});
