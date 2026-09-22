import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NotFound, { metadata } from '@/app/not-found';
import RouteError from '@/app/error';
import GlobalError from '@/app/global-error';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('404 page', () => {
  it('states the problem once and routes to the research, the papers and the tools', () => {
    const html = renderToStaticMarkup(<NotFound />);

    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    for (const href of ['/reports', '/papers', '/tools']) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toMatch(/search in the site header/);
    expect(metadata.title).toBe('Page not found');
  });

  it('keeps its copy, on the primitives: an unboxed PageHeader, then the three places as ListRows', () => {
    const html = renderToStaticMarkup(<NotFound />);
    const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    for (const sentence of [
      'Error 404 · Page not found',
      'Nothing lives at this address.',
      'The link may be out of date or the URL mistyped; everything published here is reachable from these three places.',
      'The workshop paper presented at ICML 2026, the papers under peer review and the ones in preparation.',
      'Looking for a particular report, tool or episode? Use the search in the site header (inside the menu on small screens).',
    ]) {
      expect(text, sentence).toContain(sentence);
    }
    expect(html).toMatch(/<h1 class="[^"]*text-heading-48/);
    for (const href of ['/reports', '/papers', '/tools']) expect(html).toMatch(new RegExp(`<a class="[^"]*list-row[^"]*" href="${href}"`));
    expect(html.match(/entrance-group/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html.match(/data-entrance-item/g)).toHaveLength(3);
    expect(html).not.toMatch(/text-\[|tracking-\[|leading-\[|border-t/);
  });
});

describe('error states', () => {
  it('logs the failure, shows its reference and retries the segment on request', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = Object.assign(new Error('render failed'), { digest: 'digest-123' });
    const retry = vi.fn();
    render(<RouteError error={error} retry={retry} />);

    expect(log).toHaveBeenCalledWith('[app/error] a route failed to render:', error);
    expect(screen.getByText(/digest-123/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('gives the root-layout fallback its own document, title and retry button', () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error('layout failed')} retry={() => undefined} />);

    expect(html).toMatch(/^<html[^>]*lang="en"/);
    expect(html).toContain('<title>Something went wrong | Chimeraforge</title>');
    expect(html).toMatch(/<button[^>]*>Try again<\/button>/);
  });

  it('sets the route error on the primitives: the page-title role, the mono eyebrow, a primary and a hairline button', () => {
    const html = renderToStaticMarkup(<RouteError error={new Error('render failed')} retry={() => undefined} />);
    expect(html).toMatch(/<h1 class="[^"]*text-heading-48[^"]*">This page did not load\.<\/h1>/);
    expect(html).toMatch(/class="[^"]*text-label-12-mono[^"]*">(?:<span[^>]*><\/span>)?Error · Page failed to load</);
    expect(html).toMatch(/<button[^>]*class="[^"]*pressable[^"]*bg-primary[^"]*"[^>]*>Try again<\/button>/);
    expect(html).toMatch(/<a [^>]*class="[^"]*pressable[^"]*"[^>]*href="\/reports"[^>]*>Research archive/);
    expect(html).not.toMatch(/text-\[|tracking-\[|leading-\[/);
  });

  it('sets the root-layout fallback in the same type roles and button, without the entrance it has no gate for', () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error('layout failed')} retry={() => undefined} />);
    expect(html).toMatch(/<h1 class="[^"]*text-heading-48[^"]*">Chimeraforge did not load\.<\/h1>/);
    expect(html).toMatch(/<button[^>]*class="[^"]*pressable[^"]*bg-primary/);
    expect(html).not.toContain('entrance-group');
    expect(html).not.toMatch(/text-\[|tracking-\[|leading-\[/);
  });

  it('keeps framer-motion out of both error boundaries', () => {
    for (const file of ['error.tsx', 'global-error.tsx']) {
      expect(readFileSync(path.resolve(__dirname, '../app', file), 'utf8')).not.toContain('framer-motion');
    }
  });
});
