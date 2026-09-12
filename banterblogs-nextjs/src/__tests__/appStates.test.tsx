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

  it('keeps framer-motion out of both error boundaries', () => {
    for (const file of ['error.tsx', 'global-error.tsx']) {
      expect(readFileSync(path.resolve(__dirname, '../app', file), 'utf8')).not.toContain('framer-motion');
    }
  });
});
