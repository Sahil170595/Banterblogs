import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { evaluate, implementationSource, initialConfig } from '@/lib/projects/code-verification/engine';
import { CodeVerificationDemo } from './CodeVerificationDemo';
import { changedStretch } from './diff';
import { Verifier } from './Verifier';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});
// jsdom has no layout or scrolling; the reveal is asserted by its call
const { revealResult } = vi.hoisted(() => ({ revealResult: vi.fn() }));
// a reveal waiting for its element to render reveals it at once here
vi.mock('../reveal', () => ({ revealResult, revealWhenRendered: (get: () => HTMLElement | null) => revealResult(get()) }));

afterEach(cleanup);

const verdict = () => screen.getByRole('status').textContent ?? '';
const matrix = () => screen.getByRole('table');

describe('code verification demo', () => {
  it('opens where the smoke suite misleads: the example-only patch, passing two tests', () => {
    render(<CodeVerificationDemo />);
    expect(screen.getByText(/On the two-test smoke suite, 3 of 4 patches pass\. On the full suite, 1 does\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Example-only repair', pressed: true })).toBeTruthy();
    expect(verdict()).toContain('Suite satisfied');
  });

  it('states the task and the bug before the matrix, and names each test by the transition it requires', () => {
    render(<CodeVerificationDemo />);
    // the verifier below repeats them beside its controls; the matrix's lead says them first
    const [lead] = screen.getAllByText(/Merge overlapping or touching closed intervals/);
    expect(lead.textContent).toMatch(/The bug:.*The baseline treats equality at an endpoint as a gap/);
    expect(lead.compareDocumentPosition(matrix()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const headers = within(matrix())
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    // both verdicts follow the patch's name, so a phone card leads with them
    expect(headers.slice(0, 3)).toEqual(['Patch', 'Smoke verdict', 'Full verdict']);
    expect(headers.filter((h) => h?.startsWith('Fail-to-pass'))).toHaveLength(3);
    expect(headers.filter((h) => h?.startsWith('Pass-to-pass'))).toHaveLength(3);
  });

  // re-review: the board opened on Smoke beside "Passes" for both bad patches,
  // so the finding needed a click
  it('shows the smoke and full verdicts side by side, whichever suite is picked', () => {
    render(<CodeVerificationDemo />);
    const verdicts = (patch: string) => {
      const row = screen.getByRole('button', { name: patch }).closest('tr')!;
      const cell = (label: string) => row.querySelector(`[data-label="${label}"]`)?.textContent;
      return [cell('Smoke verdict'), cell('Full verdict')];
    };
    expect(verdicts('Example-only repair')).toEqual(['Passes', 'Fails']);
    expect(verdicts('Repair + ordering regression')).toEqual(['Passes', 'Fails']);
    expect(verdicts('General repair')).toEqual(['Passes', 'Passes']);
    fireEvent.click(screen.getByRole('radio', { name: /Full/ }));
    expect(verdicts('Example-only repair')).toEqual(['Passes', 'Fails']);
  });

  it('tags the tests the smoke suite skips instead of fading them, and labels every cell for the phone cards', () => {
    render(<CodeVerificationDemo />);
    expect(within(matrix()).getAllByText('not in smoke suite')).toHaveLength(4);
    for (const cell of within(matrix()).getAllByRole('cell')) expect(cell.getAttribute('data-label')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Full/ }));
    expect(within(matrix()).queryByText('not in smoke suite')).toBeNull();
  });

  it('brings the verifier into view when a patch is picked, not when the task or suite changes', async () => {
    render(<CodeVerificationDemo />);
    revealResult.mockClear();
    fireEvent.click(screen.getByRole('radio', { name: /Full/ }));
    fireEvent.click(screen.getByRole('button', { name: 'General repair' }));
    await waitFor(() => expect(revealResult).toHaveBeenCalledOnce());
    expect((revealResult.mock.calls[0][0] as HTMLElement).contains(screen.getByRole('status'))).toBe(true);
  });

  it('shows the full suite rejecting the example-only patch, and the evidence for it', () => {
    render(<CodeVerificationDemo />);
    fireEvent.click(screen.getByRole('radio', { name: /Full/ }));
    expect(verdict()).toContain('Not resolved');
    const matrix = screen.getByRole('region', { name: /Closed-interval union: patches against tests/ });
    // the example-only patch leaves two failures, the empty patch three
    expect(within(matrix).getAllByRole('img', { name: /still broken/ })).toHaveLength(5);
    // the verifier opens on the first test the patch still fails
    expect(within(screen.getByLabelText('Selected test evidence')).getByRole('heading').textContent).toBe('Unsorted touching chain');
  });

  // live QA: the verifier's own selects and an imported report changed the
  // panel while the matrix and its controls still showed the old selection
  it('keeps one selection: the verifier’s selects and an imported report move the matrix too', async () => {
    render(<CodeVerificationDemo />);
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: 'unique' } });
    expect(screen.getByRole('region', { name: /Stable case-fold deduplication/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Deduplication' })).toHaveProperty('checked', true);
    fireEvent.change(screen.getByLabelText('Implementation'), { target: { value: 'regression' } });
    expect(screen.getByRole('button', { name: 'Repair + ordering regression', pressed: true })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Verification suite'), { target: { value: 'full' } });
    expect(screen.getByRole('radio', { name: /^Full/ })).toHaveProperty('checked', true);

    const report = evaluate({ ...initialConfig('intervals'), candidateId: 'empty', scope: 'smoke' });
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [{ size: 1000, text: async () => JSON.stringify(report) }] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Empty patch / baseline', pressed: true })).toBeTruthy());
    expect(screen.getByRole('radio', { name: 'Interval union' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: /^Smoke/ })).toHaveProperty('checked', true);
  });

  it('resets the whole demo, matrix included, to where the page opened', () => {
    render(<CodeVerificationDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Deduplication' }));
    fireEvent.click(screen.getByRole('radio', { name: /^Full/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Empty patch / baseline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset verifier' }));
    expect(screen.getByRole('radio', { name: 'Interval union' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: /^Smoke/ })).toHaveProperty('checked', true);
    expect(screen.getByRole('button', { name: 'Example-only repair', pressed: true })).toBeTruthy();
    expect(verdict()).toContain('Suite satisfied');
  });

  // live QA: switching task in the matrix silently dropped the assertions a visitor had written
  it('keeps authored assertions per task across a switch in the matrix', () => {
    render(<CodeVerificationDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Test synthesis' }));
    fireEvent.change(screen.getByLabelText('Assertion input (JSON)'), { target: { value: '[[0, 2], [2, 7]]' } });
    fireEvent.change(screen.getByLabelText('Expected output (JSON)'), { target: { value: '[[0, 7]]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add assertion' }));
    expect(screen.getAllByText('Authored assertion 1').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('radio', { name: 'Deduplication' }));
    expect(screen.queryAllByText('Authored assertion 1')).toHaveLength(0);
    fireEvent.click(screen.getByRole('radio', { name: 'Interval union' }));
    expect(screen.getAllByText('Authored assertion 1').length).toBeGreaterThan(0);
  });

  // live QA: Passes and Fails differed only by a warm hue
  it('marks each verdict with a shape as well as a colour', () => {
    render(<CodeVerificationDemo />);
    const row = screen.getByRole('button', { name: 'Example-only repair' }).closest('tr')!;
    const [smoke, full] = ['Smoke verdict', 'Full verdict'].map((label) => row.querySelector(`[data-label="${label}"]`)!);
    expect(smoke.querySelector('svg')?.getAttribute('data-verdict')).toBe('passes');
    expect(full.querySelector('svg')?.getAttribute('data-verdict')).toBe('fails');
  });

  it('loads another patch and task from the matrix', () => {
    render(<CodeVerificationDemo />);
    fireEvent.click(screen.getByRole('radio', { name: /Full/ }));
    fireEvent.click(screen.getByRole('button', { name: 'General repair' }));
    expect(verdict()).toContain('Resolved on full suite');
    fireEvent.click(screen.getByRole('radio', { name: 'Deduplication' }));
    expect(screen.getByRole('region', { name: /Stable case-fold deduplication/ })).toBeTruthy();
    expect((screen.getByLabelText('Task') as HTMLSelectElement).value).toBe('unique');
  });
});

describe('verifier', () => {
  const opened = { taskId: 'intervals' as const, scope: 'full' as const, candidateId: 'fixed' as const };

  // live QA: these messages appeared in the results panel, off screen above the inputs, as raw validation text
  it('answers a refused assertion beside the inputs, in plain words', () => {
    render(<Verifier selection={opened} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test synthesis' }));
    fireEvent.change(screen.getByLabelText('Assertion input (JSON)'), { target: { value: '[[5, 2]]' } });
    fireEvent.change(screen.getByLabelText('Expected output (JSON)'), { target: { value: '[[2, 5]]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add assertion' }));
    const authoring = screen.getByRole('region', { name: 'Author an assertion' });
    expect(within(authoring).getByRole('alert').textContent).toMatch(/Interval start must be at most its end/);
    expect(within(authoring).getByRole('alert').textContent).not.toMatch(/"code"|^0:/);
  });

  it('answers a refused report file beside the replay button, and brings a replayed result into view', async () => {
    render(<Verifier selection={opened} />);
    const files = screen.getByRole('button', { name: 'Replay JSON report' }).closest('[data-file-tools]')!;
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [{ size: 10, text: async () => '{"trunc' }] } });
    await waitFor(() => expect(within(files as HTMLElement).getByRole('alert').textContent).toBe('Replay refused: The file is not valid JSON.'));
    revealResult.mockClear();
    const report = evaluate({ ...initialConfig('intervals'), candidateId: 'overfit' });
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [{ size: 1000, text: async () => JSON.stringify(report) }] } });
    await waitFor(() => expect(files.querySelector('[data-file-notice]')?.textContent).toMatch(/Replayed/));
    expect(revealResult).toHaveBeenCalled();
  });

  it('calls a rejected authored suite rejected, and brings an inspected assertion into view', () => {
    render(<Verifier selection={opened} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test synthesis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear assertions' }));
    fireEvent.click(screen.getByRole('button', { name: /Already passing/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(verdict()).toContain('Rejected');
    expect(verdict()).toContain('No assertion reproduces the bug');
    revealResult.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Already passing' }));
    expect(revealResult).toHaveBeenCalledWith(screen.getByLabelText('Selected test evidence'));
  });

  it('uses the matrix’s names for the transitions and the test groups', () => {
    render(<Verifier selection={opened} />);
    const transitions = screen.getByRole('figure', { name: 'Baseline-to-after test transitions' });
    for (const name of ['Repaired', 'Still passes', 'Still broken', 'Regressed']) expect(within(transitions).getByText(name)).toBeTruthy();
    expect(screen.getAllByText('Fail-to-pass test')).toHaveLength(3);
    expect(screen.getAllByText('Pass-to-pass test')).toHaveLength(3);
  });

  // re-review: the diff was one minified line that widened the whole page
  it('marks only the characters a patch changes, inside its own wrapping block', async () => {
    const before = implementationSource('intervals', 'empty');
    const after = implementationSource('intervals', 'fixed');
    const stretch = changedStretch(before, after);
    expect(stretch.prefix + stretch.removed + stretch.suffix).toBe(before);
    expect(stretch.prefix + stretch.added + stretch.suffix).toBe(after);
    expect(stretch.added.length).toBeLessThan(after.length);
    expect(changedStretch('abc', 'abc')).toEqual({ prefix: 'abc', removed: '', added: '', suffix: '' });
    expect(changedStretch('a<b', 'a<=b')).toEqual({ prefix: 'a<', removed: '', added: '=', suffix: 'b' });

    render(<Verifier selection={opened} />);
    fireEvent.click(screen.getByText(/Implementation & replacement diff/));
    const panel = screen.getByText(/Implementation & replacement diff/).closest('details')!;
    await waitFor(() => expect(panel.querySelector('ins')?.textContent).toBe(stretch.added));
    expect(panel.querySelector('del')?.textContent).toBe(stretch.removed);
  });

  it('does not serialize bundler-dependent function text into the initial HTML', () => {
    expect(renderToStaticMarkup(<Verifier selection={opened} />)).not.toContain('function interval');
  });

  it('replays configuration rather than trusting an imported verdict', async () => {
    render(<Verifier selection={opened} />);
    const report = evaluate({ ...initialConfig(), candidateId: 'empty' });
    const file = { size: 1000, text: async () => JSON.stringify({ ...report, resolved: true }) };
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [file] } });
    await waitFor(() => expect(verdict()).toContain('Not resolved'));
    expect((screen.getByLabelText('Implementation') as HTMLSelectElement).value).toBe('empty');
  });

  it('accepts a maximum-sized export from the bounded assertion editor', async () => {
    render(<Verifier selection={opened} />);
    const input = Array.from({ length: 64 }, (_, i) => `${i}-${'a'.repeat(124)}`);
    const report = evaluate({
      ...initialConfig('unique'),
      mode: 'synthesis',
      assertions: Array.from({ length: 16 }, (_, i) => ({ id: `large-${i}`, label: 'Bounded assertion', input, expected: input })),
    });
    const body = JSON.stringify(report, null, 2);
    expect(body.length).toBeGreaterThan(100_000);
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [{ size: body.length, text: async () => body }] } });
    await waitFor(() => expect(screen.getByText('16/16 candidates')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clears a stale result when the configuration changes, and resets to where the page opens', () => {
    render(<Verifier selection={opened} />);
    expect(verdict()).toContain('Resolved on full suite');
    fireEvent.change(screen.getByLabelText('Implementation'), { target: { value: 'regression' } });
    expect(verdict()).toContain('Not run');
    fireEvent.click(screen.getByRole('button', { name: 'Run verification' }));
    expect(verdict()).toContain('Not resolved');
    // the page opens on the example-only patch under the smoke suite
    fireEvent.click(screen.getByRole('button', { name: 'Reset verifier' }));
    expect(verdict()).toContain('Suite satisfied');
    expect((screen.getByLabelText('Implementation') as HTMLSelectElement).value).toBe('overfit');
  });

  it('scores authored assertions on buggy and fixed code, and rejects invalid JSON', () => {
    render(<Verifier selection={opened} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test synthesis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(verdict()).toContain('Reproduces');
    fireEvent.click(screen.getByRole('button', { name: 'Clear assertions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(verdict()).toContain('Rejected');
    fireEvent.change(screen.getByLabelText('Assertion input (JSON)'), { target: { value: 'oops' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add assertion' }));
    expect(screen.getByRole('alert').textContent).toContain('valid JSON');
    fireEvent.change(screen.getByLabelText('Assertion input (JSON)'), { target: { value: '[[0, 2], [2, 7]]' } });
    fireEvent.change(screen.getByLabelText('Expected output (JSON)'), { target: { value: '[[0, 7]]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add assertion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(verdict()).toContain('Reproduces');
  });
});
