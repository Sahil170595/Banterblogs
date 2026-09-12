import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchEntry } from '@/lib/search';

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

beforeEach(() => {
  // the index loader is module state: start every test from a cold page
  vi.resetModules();
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => INDEX }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  push.mockReset();
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
