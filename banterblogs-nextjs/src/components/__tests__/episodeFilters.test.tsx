import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EpisodeSummary } from '@/lib/episodes';
import { EpisodeFilters } from '../EpisodeFilters';

const { url, replace } = vi.hoisted(() => ({ url: { search: '' }, replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(url.search),
  usePathname: () => '/episodes',
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  url.search = '';
  replace.mockReset();
});

const episode = (id: number, title: string, tags: string[]): EpisodeSummary => ({
  id,
  displayId: id,
  slug: `episode-00${id}`,
  title,
  subtitle: '',
  date: `2025-09-0${id}T00:00:00.000Z`,
  commit: '',
  preview: '',
  filesChanged: 1,
  linesAdded: 1,
  complexity: 10,
  tags,
  readingTime: 2,
  platform: 'banterpacks',
});

const EPISODES = [episode(1, 'Streaming overlay', ['banterpacks']), episode(2, 'Safety routing', ['chimera'])];

const renderFilters = () => render(<EpisodeFilters episodes={EPISODES} />);
const search = () => screen.getByRole('searchbox') as HTMLInputElement;

afterEach(cleanup);

describe('episode filters', () => {
  it('announces which tag chip is selected', () => {
    renderFilters();
    const all = screen.getByRole('button', { name: 'All' });
    const chimera = screen.getByRole('button', { name: 'chimera' });
    expect(all.getAttribute('aria-pressed')).toBe('true');
    expect(chimera.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(chimera);

    expect(chimera.getAttribute('aria-pressed')).toBe('true');
    expect(all.getAttribute('aria-pressed')).toBe('false');
  });

  it('is a named search field with autofill off', () => {
    renderFilters();

    expect(search().type).toBe('search');
    expect(search().name).toBe('q');
    expect(search().getAttribute('autocomplete')).toBe('off');
  });

  it('draws the sort menu and its options on an opaque background', () => {
    renderFilters();
    const select = screen.getByRole('combobox', { name: 'Sort episodes by' });
    const opaque = ['bg-background', 'text-foreground'];

    expect(select.className.split(/\s+/)).toEqual(expect.arrayContaining(opaque));
    for (const option of within(select).getAllByRole('option')) {
      expect(option.className.split(/\s+/)).toEqual(expect.arrayContaining(opaque));
    }
  });

  it('offers to clear the filters when nothing matches', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: 'chimera' }));
    fireEvent.change(search(), { target: { value: 'streaming' } });
    expect(screen.queryAllByRole('article')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(search().value).toBe('');
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(EPISODES.length);
  });

  // Phase R3: the index is a list of hairline rows, not a wall of glass cards.
  it('lists the episodes as rows that reveal as they scroll in', () => {
    renderFilters();
    const rows = screen.getAllByRole('article');
    expect(rows).toHaveLength(EPISODES.length);
    for (const row of rows) {
      expect(row.querySelector('a.list-row')).not.toBeNull();
      expect(row.closest('li')?.hasAttribute('data-reveal')).toBe(true);
    }
    expect(document.body.innerHTML).not.toMatch(/glass-ultra|backdrop-blur|signal-panel/);
  });

  it('crossfades the list when a tag is picked with the pointer, never for a keyboard pick or typing', () => {
    renderFilters();
    const list = () => screen.getAllByRole('article')[0].closest('[data-tab-panel]') as HTMLElement;
    expect(list().hasAttribute('data-switched')).toBe(false);

    // a pointer click reports its click count; a key press on a button reports 0
    fireEvent.click(screen.getByRole('button', { name: 'chimera' }), { detail: 1 });
    expect(list().hasAttribute('data-switched')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'All' }), { detail: 0 });
    expect(list().hasAttribute('data-switched')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'banterpacks' }), { detail: 1 });
    fireEvent.change(search(), { target: { value: 'stream' } });
    expect(list().hasAttribute('data-switched')).toBe(false);
  });

  // re-judge P1-5: the search, tag, sort and order lived in component state
  // only, so a reload or a shared link lost them
  describe('in the URL', () => {
    const order = () => screen.getByRole('button', { name: /^Sorted/ });
    const sort = () => screen.getByRole('combobox', { name: 'Sort episodes by' }) as HTMLSelectElement;
    const pressed = () => screen.getAllByRole('button', { pressed: true }).map((chip) => chip.textContent);

    it('restores the search, tag, sort and order a link or a reload names', () => {
      url.search = '?q=safety&tag=chimera&sort=title&order=desc';
      renderFilters();

      expect(search().value).toBe('safety');
      expect(pressed()).toEqual(['chimera']);
      expect(sort().value).toBe('title');
      expect(order().getAttribute('aria-label')).toMatch(/^Sorted descending/);
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });

    it('falls back to the defaults for values it does not know', () => {
      url.search = '?sort=colour&order=sideways';
      renderFilters();

      expect(sort().value).toBe('date');
      expect(order().getAttribute('aria-label')).toMatch(/^Sorted ascending/);
      expect(pressed()).toEqual(['All']);
    });

    it('writes each change in place, without scrolling, and leaves the defaults out', () => {
      renderFilters();

      fireEvent.change(search(), { target: { value: 'stream' } });
      expect(replace).toHaveBeenLastCalledWith('/episodes?q=stream', { scroll: false });
      fireEvent.click(screen.getByRole('button', { name: 'banterpacks' }));
      expect(replace).toHaveBeenLastCalledWith('/episodes?q=stream&tag=banterpacks', { scroll: false });
      fireEvent.change(sort(), { target: { value: 'title' } });
      fireEvent.click(order());
      expect(replace).toHaveBeenLastCalledWith('/episodes?q=stream&tag=banterpacks&sort=title&order=desc', { scroll: false });

      fireEvent.click(screen.getByRole('button', { name: 'All' }));
      fireEvent.change(sort(), { target: { value: 'date' } });
      fireEvent.click(order());
      fireEvent.change(search(), { target: { value: '' } });
      expect(replace).toHaveBeenLastCalledWith('/episodes', { scroll: false });
    });

    it('keeps what the visitor typed while the URL catches up with it', () => {
      const view = renderFilters();
      fireEvent.change(search(), { target: { value: 'st' } });
      fireEvent.change(search(), { target: { value: 'str' } });

      // the first write lands after the second keystroke
      url.search = '?q=st';
      view.rerender(<EpisodeFilters episodes={EPISODES} />);
      expect(search().value).toBe('str');
      url.search = '?q=str';
      view.rerender(<EpisodeFilters episodes={EPISODES} />);
      expect(search().value).toBe('str');
    });

    it('follows a URL it did not write, as from Back or a link', () => {
      const view = renderFilters();
      fireEvent.change(search(), { target: { value: 'stream' } });
      url.search = '?tag=chimera';
      view.rerender(<EpisodeFilters episodes={EPISODES} />);

      expect(search().value).toBe('');
      expect(pressed()).toEqual(['chimera']);
    });

    it('clears the search and tag from the URL along with the filters', () => {
      url.search = '?q=streaming&tag=chimera&sort=title';
      renderFilters();
      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(replace).toHaveBeenLastCalledWith('/episodes?sort=title', { scroll: false });
    });
  });

  // re-judge P2-17: selected and unselected chips differed by colour alone
  it('rings the selected chip, a cue that does not rest on colour', () => {
    renderFilters();
    const ring = (name: string) => screen.getByRole('button', { name }).className.includes('shadow-[inset_0_0_0_1px_hsl(var(--primary))]');
    expect(ring('All')).toBe(true);
    expect(ring('chimera')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'chimera' }));
    expect(ring('chimera')).toBe(true);
    expect(ring('All')).toBe(false);
  });

  it('shows a page of rows at a time and loads the next on request', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...episode(1, `Episode ${i}`, ['banterpacks']), id: i + 1, slug: `episode-${i + 1}` }));
    render(<EpisodeFilters episodes={many} />);
    expect(screen.getAllByRole('article')).toHaveLength(36);
    expect(screen.getByText('Showing 40 of 40 episodes')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Load more (4 remaining)' }));

    expect(screen.getAllByRole('article')).toHaveLength(40);
    expect(screen.queryByRole('button', { name: /Load more/ })).toBeNull();
  });
});
