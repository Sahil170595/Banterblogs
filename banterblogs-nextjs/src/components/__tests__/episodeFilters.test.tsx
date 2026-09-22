import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { EpisodeSummary } from '@/lib/episodes';
import { EpisodeFilters } from '../EpisodeFilters';

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
