import type { ReactNode, ViewTransitionProps } from 'react';
import { prerenderToNodeStream } from 'react-dom/static.node';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportFigure } from '@/lib/reports/figures';
import { toExplorable } from '../exploreView';
import { ReportHero } from '../ReportHead';
import { ReportExploreLazy } from '../ReportExploreLazy';

// How a report page reaches its figure's control: behind React.lazy, so the
// control's code is a chunk of its own (e2e/reportExplore.spec.ts checks
// that only these pages load it), and in no Suspense boundary of its own.
// React's server renderer writes a boundary holding more than 500 bytes
// after the rest of the page, revealed by a script: without script the
// figure would be missing, and with it the figure would drop in late.

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children }: ViewTransitionProps) => actual.createElement(actual.Fragment, null, children),
  };
});

afterEach(cleanup);

const SLUG = 'technical-report-140';

async function prerendered(node: ReactNode): Promise<string> {
  const { prelude } = await prerenderToNodeStream(node);
  let html = '';
  for await (const chunk of prelude) html += chunk;
  return html;
}

describe('the lazily loaded control', () => {
  it('is written into the page in place, before the caption, with nothing streamed in after it', async () => {
    const html = await prerendered(<ReportHero slug={SLUG} figure={reportFigure(SLUG)} />);
    const control = html.indexOf('<fieldset class="report-explore">');
    expect(control).toBeGreaterThan(html.indexOf('<figure class="report-figure">'));
    expect(control).toBeLessThan(html.indexOf('<figcaption>'));
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('<figcaption>'));
    // no Suspense boundary: no completed marker, no pending one, no outlined segment
    expect(html).not.toMatch(/<!--\$[?!]?-->|<template id="B:|<div hidden id="S:/);
  });

  it('renders the control in the browser once its code has loaded', async () => {
    render(<ReportExploreLazy figure={toExplorable(reportFigure(SLUG)!)!} />);
    expect(await screen.findByRole('group', { name: 'Shot count' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });
});
