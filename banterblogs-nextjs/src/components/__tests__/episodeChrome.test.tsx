import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TableOfContents } from '../TableOfContents';

const read = (file: string) => readFileSync(path.resolve(__dirname, file), 'utf8');

// the TOC fades in a beat after load
const TOC_REVEAL_WAIT_MS = 1500;

class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

describe('episode table of contents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sits in the page flow as a sticky rail, never fixed over the article', async () => {
    render(
      <TableOfContents
        headings={[
          { id: 'intro', text: 'Intro', level: 2 },
          { id: 'details', text: 'Details', level: 3 },
        ]}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOC_REVEAL_WAIT_MS);
    });

    const rail = screen.getByRole('navigation', { name: 'Table of contents' }).parentElement;
    expect(rail?.className.split(/\s+/)).toEqual(expect.arrayContaining(['sticky']));
    expect(rail?.className).not.toMatch(/\bfixed\b/);
  });

  it('renders with the article on the server instead of popping in after load', () => {
    const html = renderToStaticMarkup(<TableOfContents headings={[{ id: 'intro', text: 'Intro', level: 2 }]} />);

    expect(html).toContain('aria-label="Table of contents"');
    expect(html).toContain('Intro');
  });

  it('collapses by animating grid rows in CSS and makes the hidden list inert', () => {
    render(<TableOfContents headings={[{ id: 'intro', text: 'Intro', level: 2 }]} />);
    const toggle = screen.getByRole('button', { name: 'Collapse table of contents' });
    const list = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    if (!list) throw new Error('toggle does not control the list');

    expect(list.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['grid-rows-[1fr]', 'transition-[grid-template-rows,opacity]', 'duration-base', 'ease-standard']),
    );
    expect(list.hasAttribute('inert')).toBe(false);

    fireEvent.click(toggle);

    expect(list.className.split(/\s+/)).toContain('grid-rows-[0fr]');
    expect(list.hasAttribute('inert')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('gets its own grid column beside the article from xl up', () => {
    const page = read('../../app/episodes/[slug]/page.tsx');

    expect(page).toMatch(/xl:grid-cols-\[minmax\(0,1fr\)_16rem\]/);
    expect(page).toMatch(/<aside[^>]*>\s*<TableOfContents headings=\{headings\} \/>\s*<\/aside>/);
  });
});

describe('fixed bottom UI on notched phones', () => {
  it('clears the safe-area insets', () => {
    for (const file of ['../MobileOptimization.tsx', '../EpisodeFloatingUI.tsx']) {
      const source = read(file);
      expect(source, file).toContain('bottom-[max(1.5rem,env(safe-area-inset-bottom))]');
      expect(source, file).not.toMatch(/\bbottom-6\b/);
    }
    expect(read('../EpisodeFloatingUI.tsx')).toContain('right-[max(1.5rem,env(safe-area-inset-right))]');
  });
});
