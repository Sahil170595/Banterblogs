import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Observatory } from './Observatory';
import { DEFAULT_CONFIG, FIXTURE_VERSION, SCHEMA_VERSION } from '@/lib/projects/workflow-observatory/engine';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('same-origin native DOM execution', () => {
  it('does not restore a pending trace import after reset', async () => {
    render(<Observatory />);
    let finish!: (text: string) => void;
    const text = new Promise<string>(resolve => { finish = resolve; });
    fireEvent.change(screen.getByLabelText('Trace file'), { target: { files: [{ size: 10, text: () => text }] } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset observatory' }));
    await act(async () => { finish(JSON.stringify({ schemaVersion: SCHEMA_VERSION, fixtureVersion: FIXTURE_VERSION, config: DEFAULT_CONFIG, events: [] })); });
    expect(screen.queryByLabelText('Recomputed event replay')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('ignores a pending rejection after a configuration change', async () => {
    render(<Observatory />);
    let finish!: (text: string) => void;
    const text = new Promise<string>(resolve => { finish = resolve; });
    fireEvent.change(screen.getByLabelText('Trace file'), { target: { files: [{ size: 10, text: () => text }] } });
    fireEvent.change(screen.getByLabelText('Requested room'), { target: { value: 'south' } });
    await act(async () => { finish('invalid JSON'); });
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('does not let an older import replace the newest replay', async () => {
    render(<Observatory />);
    let finish!: (text: string) => void;
    const text = new Promise<string>(resolve => { finish = resolve; });
    const report = (room: string) => JSON.stringify({ schemaVersion: SCHEMA_VERSION, fixtureVersion: FIXTURE_VERSION, config: { ...DEFAULT_CONFIG, room }, events: [] });
    fireEvent.change(screen.getByLabelText('Trace file'), { target: { files: [{ size: 10, text: () => text }] } });
    fireEvent.change(screen.getByLabelText('Trace file'), { target: { files: [{ size: 10, text: async () => report('south') }] } });
    await waitFor(() => expect(screen.getByLabelText('Recomputed event replay')).toBeTruthy());
    await act(async () => { finish(report('north')); });
    fireEvent.click(screen.getByRole('button', { name: 'Load configuration for a fresh run' }));
    expect(screen.getByLabelText('Requested room')).toHaveProperty('value', 'south');
  });
  it('freezes the terminal fixture until reset so the trace still describes its state', async () => {
    render(<Observatory />);
    fireEvent.change(screen.getByLabelText('Save latency'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('Complete'));
    const reopen = screen.getByRole('button', { name: 'Reserve slot' });
    expect(reopen.hasAttribute('disabled')).toBe(true);
    fireEvent.click(reopen);
    expect(screen.getByRole('row', { name: /Spectral scan/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export trace' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Reset observatory' }));
    expect(screen.getByRole('button', { name: 'Reserve slot' }).hasAttribute('disabled')).toBe(false);
  });
  it('keeps the workflow configuration when its mobile panel closes', () => {
    render(<Observatory />);
    const toggle = screen.getByRole('button', { name: 'Workflow settings' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText('Requested room'), { target: { value: 'south' } });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('Requested room')).toHaveProperty('value', 'south');
  });
  it('steps only the next action and exposes its actual input evidence', async () => {
    render(<Observatory />);
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Step' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByRole('dialog', { name: 'Reservation' })).toBeTruthy();
    expect((screen.getByLabelText('Reservation title') as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('button', { name: 'Inspect step 2' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Inspect step 2' })).toBeTruthy());
    expect((screen.getByLabelText('Reservation title') as HTMLInputElement).value).toBe('Spectral scan');
  });
  it('exports observed evidence and imports reconstruction without fabricating a new live result', async () => {
    render(<Observatory />);
    fireEvent.change(screen.getByLabelText('Save latency'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('Complete'));
    let captured: Blob | null = null;
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: (blob: Blob) => { captured = blob; return 'blob:fixture'; }, revokeObjectURL: revoke });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Export trace' }));
    expect(captured).toBeTruthy();
    expect(revoke).toHaveBeenCalledWith('blob:fixture');
    const body = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsText(captured!);
    });
    const report = JSON.parse(body);
    expect(report.trace.finalObservation.recordTitle).toBe('Spectral scan');
    expect(report.trace.entries).toHaveLength(5);
    report.trace.status = 'failed';
    fireEvent.click(screen.getByRole('button', { name: 'Reset observatory' }));
    fireEvent.change(screen.getByLabelText('Trace file'), { target: { files: [{ size: body.length, text: async () => JSON.stringify(report) }] } });
    await waitFor(() => expect(screen.getByLabelText('Recomputed event replay')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Replay frame'), { target: { value: String(report.events.length) } });
    expect(screen.getByText('Conditions met')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('Ready');
    expect(screen.queryByRole('row', { name: /Spectral scan/ })).toBeNull();
  });
  it('actually opens, fills, selects and commits the rendered fixture', async () => {
    render(<Observatory />);
    fireEvent.change(screen.getByLabelText('Save latency'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Requested room'), { target: { value: 'south' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
    expect(await screen.findByRole('dialog', { name: 'Reservation' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('Complete'));
    const row = screen.getByRole('row', { name: /Spectral scan South lab/ });
    expect(row).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Inspect step 5' })).toBeTruthy();
  });
  it('fails a misleading toast because no actual committed row exists', async () => {
    render(<Observatory />);
    fireEvent.change(screen.getByLabelText('Save latency'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Injected failure'), { target: { value: 'false-toast' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('Failed'));
    expect(screen.getByRole('status', { name: 'Fixture notice' }).textContent).toContain('Reservation saved');
    expect(screen.queryByRole('row', { name: /Spectral scan/ })).toBeNull();
  });
  it('uses the actual renamed button only with the configured alias fallback', async () => {
    render(<Observatory />);
    fireEvent.change(screen.getByLabelText('Injected failure'), { target: { value: 'label-drift' } });
    fireEvent.change(screen.getByLabelText('Selector policy'), { target: { value: 'strict' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('Failed'));
    fireEvent.change(screen.getByLabelText('Selector policy'), { target: { value: 'fallback' } });
    fireEvent.change(screen.getByLabelText('Save latency'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run workflow' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('Complete'));
    expect(screen.getByRole('row', { name: /Spectral scan/ })).toBeTruthy();
  });
  it('resets a genuinely pending save and clears its late timer', async () => {
    vi.useFakeTimers();
    render(<Observatory />);
    fireEvent.click(screen.getByRole('button', { name: 'Reserve slot' }));
    fireEvent.input(screen.getByRole('textbox', { name: 'Reservation title' }), { target: { value: 'Manual task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reservation' }));
    expect(screen.getByText('Saving reservation…')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset observatory' }));
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(screen.queryByRole('row', { name: /Manual task/ })).toBeNull();
    expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('Ready');
  });
});
