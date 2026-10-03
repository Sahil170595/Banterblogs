import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RetrievalDemo from './RetrievalDemo';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const query = () => screen.getByRole('textbox', { name: 'Query' });
const run = () => fireEvent.click(screen.getByRole('button', { name: 'Run retrieval' }));

describe('retrieval workbench', () => {
  it('opens on computed synthetic results with score evidence', () => {
    render(<RetrievalDemo />);
    expect(screen.getByText(/18 fictional engineering notes/)).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Term evidence' })).toBeTruthy();
    expect(screen.getByText('Final filters')).toBeTruthy();
  });
  it('starts phone settings collapsed, toggles them, and collapses them on reset', () => {
    render(<RetrievalDemo />);
    const toggle = screen.getByRole('button', { name: 'Ranking and filters' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Reset experiment' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
  it('runs a visitor query, exposes failure, and resets the full experiment', () => {
    render(<RetrievalDemo />);
    fireEvent.change(query(), { target: { value: 'quasar' } });
    expect(screen.getByText('Unapplied changes')).toBeTruthy();
    run();
    expect(screen.getByText('No lexical matches')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset experiment' }));
    expect((query() as HTMLInputElement).value).toBe('search latency');
    expect(screen.getByRole('table', { name: 'Term evidence' })).toBeTruthy();
  });
  it('changes channel mode and shows its actual units', () => {
    render(<RetrievalDemo />);
    fireEvent.change(screen.getByLabelText('Ranking'), { target: { value: 'body' } });
    run();
    expect(screen.getByText('Body score')).toBeTruthy();
  });
  it('exposes gated records and missing evidence', () => {
    render(<RetrievalDemo />);
    fireEvent.change(screen.getByLabelText('Required tokens'), { target: { value: 'quasar' } });
    run();
    expect(screen.getByText('All retrieved documents rejected')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Rejected/ }));
    expect(screen.getAllByText('Missing: quasar').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: /^Inspect / })[0]);
    expect(screen.getByRole('table', { name: 'Term evidence' })).toBeTruthy();
  });
  it('selects evidence only from the currently displayed result category', () => {
    render(<RetrievalDemo />);
    fireEvent.change(screen.getByLabelText('Required tokens'), { target: { value: 'cache' } });
    run();
    fireEvent.click(screen.getByRole('tab', { name: /Rejected/ }));
    expect(screen.getAllByRole('button', { name: /^Inspect / })[0].getAttribute('aria-pressed')).toBe('true');
  });
  it('displays every actual filter-relaxation attempt', () => {
    render(<RetrievalDemo />);
    fireEvent.click(screen.getByRole('tab', { name: 'Attempts' }));
    const table = screen.getByRole('table', { name: 'Filter attempts' });
    expect(within(table).getByText('Initial')).toBeTruthy();
    expect(within(table).getByText('Drop year')).toBeTruthy();
    expect(within(table).getByText('Drop kind')).toBeTruthy();
  });
  it('supports arrow, Home and End keyboard navigation between inspection tabs', () => {
    render(<RetrievalDemo />);
    const results = screen.getByRole('tab', { name: 'Results' });
    results.focus();
    fireEvent.keyDown(results, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Rejected/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Replay' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(results.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(results);
  });
  it('keeps a protected filter through a shortage', () => {
    render(<RetrievalDemo />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Protect year' }));
    fireEvent.change(screen.getByLabelText('Minimum year'), { target: { value: '2030' } });
    run();
    expect(screen.getByText('No lexical matches')).toBeTruthy();
    expect(screen.getByText('year >= 2030 (protected)')).toBeTruthy();
  });
  it('validates edited corpus and preserves the last valid experiment on failure', () => {
    render(<RetrievalDemo />);
    fireEvent.click(screen.getByRole('tab', { name: 'Corpus' }));
    fireEvent.change(screen.getByLabelText('Corpus JSON'), { target: { value: '[]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply corpus' }));
    expect(screen.getByRole('alert').textContent).toContain('Corpus');
    expect(screen.getByText(/18 fictional engineering notes/)).toBeTruthy();
  });
  it('recomputes ranking after a valid corpus replacement', () => {
    render(<RetrievalDemo />);
    fireEvent.click(screen.getByRole('tab', { name: 'Corpus' }));
    const editor = screen.getByLabelText('Corpus JSON') as HTMLTextAreaElement;
    const docs = JSON.parse(editor.value);
    docs[0].body = 'quasar quasar'; docs[0].title = 'Quasar'; docs[0].tags = [];
    fireEvent.change(editor, { target: { value: JSON.stringify(docs) } });
    fireEvent.change(query(), { target: { value: 'quasar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply corpus' }));
    expect(screen.getByText('User-supplied corpus')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Inspect note-01 Quasar' })).toBeTruthy();
  });
  it('exports, replays after a changed query, and rejects forged scores', () => {
    const create = vi.fn(() => 'blob:test');
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<RetrievalDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Export run' }));
    expect(create).toHaveBeenCalled();
    const editor = screen.getByLabelText('Replay JSON') as HTMLTextAreaElement;
    const exported = editor.value;
    fireEvent.change(query(), { target: { value: 'quasar' } }); run();
    fireEvent.click(screen.getByRole('button', { name: 'Replay run' }));
    expect((query() as HTMLInputElement).value).toBe('search latency');
    const payload = JSON.parse(exported); payload.result.rows[0].score = 999;
    fireEvent.change(editor, { target: { value: JSON.stringify(payload) } });
    fireEvent.click(screen.getByRole('button', { name: 'Replay run' }));
    expect(screen.getByRole('alert').textContent).toContain('recomputed');
    vi.unstubAllGlobals();
  });
  it('surfaces invalid numerical settings rather than showing NaNs', () => {
    render(<RetrievalDemo />);
    fireEvent.change(screen.getByLabelText('Channel depth'), { target: { value: '0' } });
    run();
    expect(screen.getByRole('alert').textContent).toContain('depth');
    expect(screen.getByRole('table', { name: 'Term evidence' })).toBeTruthy();
  });
});
