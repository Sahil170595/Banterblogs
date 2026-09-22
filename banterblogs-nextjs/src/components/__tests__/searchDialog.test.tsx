import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchEntry } from '@/lib/search';
import { contrast, over, token } from '@/test/contrast';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const INDEX: SearchEntry[] = [
  { type: 'episode', slug: 'episode-138', href: '/episodes/episode-138', title: 'Episode 138: TR138 notes' },
  {
    type: 'report',
    slug: 'technical-report-138',
    href: '/reports/technical-report-138',
    title: 'TR138: Batch Inference Safety',
    description: 'Audit-layer flip adjudication.',
    phase: 'Phase 5 — Attack Surface',
  },
  { type: 'tool', slug: 'quantfit', href: '/tools/quantfit', title: 'quantfit', description: 'Quantization CLI.' },
];

let fetchMock: ReturnType<typeof vi.fn>;
// jsdom lays nothing out and has no scrollIntoView
const scrollIntoView = vi.fn();

beforeEach(() => {
  // the index loader is module state: start every test from a cold page
  vi.resetModules();
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => INDEX }));
  vi.stubGlobal('fetch', fetchMock);
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  push.mockReset();
  scrollIntoView.mockReset();
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

async function renderDialog(): Promise<HTMLInputElement> {
  const { SearchDialog } = await import('../SearchDialog');
  render(<SearchDialog />);
  return screen.getByRole('combobox') as HTMLInputElement;
}

async function open(input: HTMLInputElement, query: string) {
  await act(async () => {
    fireEvent.focus(input);
  });
  fireEvent.change(input, { target: { value: query } });
}

describe('site search dialog', () => {
  it('is a search field that downloads nothing until it is used', async () => {
    const input = await renderDialog();

    expect(input.type).toBe('search');
    expect(input.name).toBe('q');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.placeholder).toBe('Search reports, tools, episodes…');
    // 16px on phones so iOS does not zoom the page on focus
    expect(input.className.split(/\s+/)).toEqual(expect.arrayContaining(['text-base', 'md:text-sm']));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads the index on first open, groups results by type and routes to the right page', async () => {
    const input = await renderDialog();
    await open(input, 'TR138');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/search.json');

    const options = await screen.findAllByRole('option');
    expect(options[0].getAttribute('href')).toBe('/reports/technical-report-138');
    expect(screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toEqual([
      'Reports',
      'Episodes',
    ]);
    expect(within(screen.getByRole('group', { name: 'Reports' })).getByText('Phase 5 — Attack Surface')).toBeTruthy();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/reports/technical-report-138');
  });

  it('fades the results panel in and out on the overlay tokens, keeping the last results while it leaves', async () => {
    const input = await renderDialog();
    // stays mounted while closed so the exit can run; hidden it is invisible
    const panelClasses = () =>
      (screen.getByRole('listbox', { hidden: true }).parentElement?.className ?? '').split(/\s+/);

    expect(panelClasses()).toEqual(
      expect.arrayContaining(['invisible', 'opacity-0', 'scale-[0.98]', '-translate-y-1', 'duration-base', 'ease-standard']),
    );

    await open(input, 'TR138');
    await screen.findAllByRole('option');
    expect(panelClasses()).toEqual(expect.arrayContaining(['visible', 'opacity-100', 'scale-100', 'translate-y-0']));
    expect(panelClasses()).not.toContain('invisible');

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.value).toBe('');
    expect(panelClasses()).toEqual(expect.arrayContaining(['invisible', 'opacity-0']));
    // the fading panel keeps its results rather than flashing an empty state
    expect(screen.getAllByRole('option', { hidden: true }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/no results/i)).toBeNull();
  });

  // re-judge P1-2: close() cleared the open flag and only a focus event set
  // it again, so the still-focused field typed into a hidden panel
  it('opens again when the visitor types after Escape, and Enter still follows the highlighted result', async () => {
    const input = await renderDialog();
    await open(input, 'quantfit');
    await screen.findAllByRole('option');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.getAttribute('aria-expanded')).toBe('false');

    fireEvent.change(input, { target: { value: 'TR138' } });
    expect(input.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/reports/technical-report-138');
  });

  it('opens again when the focused field is clicked after Escape', async () => {
    const input = await renderDialog();
    await open(input, 'TR138');
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.change(input, { target: { value: 'quantfit' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'TR138' } });

    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  // Escape that only closes the results is spent there: the mobile menu
  // around the field stays open (Header listens for an unprevented Escape)
  it('keeps an Escape that closed the results from reaching the page', async () => {
    const input = await renderDialog();
    await open(input, 'TR138');
    await screen.findAllByRole('option');

    // each press its own task, as from a keyboard, so the close renders between them
    const press = async () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      await act(async () => {
        input.dispatchEvent(event);
      });
      return event;
    };
    expect((await press()).defaultPrevented).toBe(true);
    // with nothing left to close, Escape passes through
    expect((await press()).defaultPrevented).toBe(false);
  });

  // re-judge P2-2: after a Tab out, the click-catcher stayed over the page
  // and swallowed the next click anywhere
  it('closes, click-catcher and all, when focus leaves the search', async () => {
    const input = await renderDialog();
    const outside = document.createElement('button');
    document.body.append(outside);
    await open(input, 'TR138');
    await screen.findAllByRole('option');
    const catcher = () => document.querySelector('.fixed.inset-0');
    expect(catcher()).not.toBeNull();

    // focus moving to the clear button stays inside the search
    fireEvent.blur(input, { relatedTarget: screen.getByRole('button', { name: 'Clear search' }) });
    expect(input.getAttribute('aria-expanded')).toBe('true');

    fireEvent.blur(input, { relatedTarget: outside });
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(catcher()).toBeNull();
    outside.remove();
  });

  it('keeps focus in the field while the pointer works the results, and leaves the results out of the Tab order', async () => {
    const input = await renderDialog();
    await open(input, 'TR138');
    const options = await screen.findAllByRole('option');
    const listbox = screen.getByRole('listbox');

    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    listbox.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    for (const option of options) expect(option.getAttribute('tabindex')).toBe('-1');
  });

  // the list is capped at 24rem; a highlight driven past its fold by the
  // arrows would sit out of sight
  it('keeps the highlighted result scrolled into view in the capped list', async () => {
    const input = await renderDialog();
    await open(input, 'TR138');
    const options = await screen.findAllByRole('option');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(options[1]);
  });

  // re-judge P1-3: the highlighted row was a light accent plate that left
  // the muted detail line and icon at 1.68:1
  it('keeps the highlighted result readable: its detail at 4.5:1 and its icon at 3:1 or better', async () => {
    const input = await renderDialog();
    await open(input, 'quantfit');
    await screen.findAllByRole('option');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = screen.getAllByRole('option').find((option) => option.getAttribute('aria-selected') === 'true')!;
    const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

    const plate = classes(active).map((c) => /^bg-foreground\/(\d+)$/.exec(c)).find(Boolean);
    expect(plate, 'a foreground-tint plate').toBeTruthy();
    expect(classes(active)).not.toContain('bg-accent');
    const surface = over(token('foreground'), Number(plate![1]) / 100, token('background'));

    const tone = (el: Element) => {
      const match = classes(el).map((c) => /^text-(muted-foreground|foreground)(?:\/(\d+))?$/.exec(c)).find(Boolean);
      expect(match, el.outerHTML.slice(0, 80)).toBeTruthy();
      return over(token(match![1]), match![2] ? Number(match![2]) / 100 : 1, surface);
    };
    const detail = within(active).getByText('Quantization CLI.');
    const icon = active.querySelector('svg')!;
    expect(contrast(tone(detail), surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone(icon), surface)).toBeGreaterThanOrEqual(3);
    // and a cue beyond colour: the ember rule on its leading edge
    expect(classes(active)).toEqual(expect.arrayContaining(['before:w-0.5', 'before:bg-primary']));
  });

  it('says so when the index cannot load, instead of claiming no results', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => [] });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const input = await renderDialog();
    await open(input, 'TR138');

    expect(await screen.findByText(/search is unavailable/i)).toBeTruthy();
    expect(screen.queryByText(/no results/i)).toBeNull();
    expect(error).toHaveBeenCalledWith('[SearchDialog] search index failed to load:', expect.any(Error));
  });
});
