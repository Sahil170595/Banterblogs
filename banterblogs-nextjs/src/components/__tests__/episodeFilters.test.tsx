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
});
