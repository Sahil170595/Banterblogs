import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlowFigure } from '../FlowFigure';

// A diagram of a real sequence (R4: the tool page's plan gates, the /about
// decision path), drawn as nodes on one hairline rail: down the side where
// its box is narrow, across where it is wide (a container query, so the
// same figure fits a head column and a page column). Text stays text: the
// labels reflow and read at any width, and the caption says what it shows.

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const STEPS = [
  { label: 'Candidates', detail: 'every model and GPU', kind: 'io' as const },
  { label: 'VRAM', detail: 'does it fit' },
  { label: 'Budget', detail: 'what it costs' },
  { label: 'Plan', detail: 'the cheapest that passes', kind: 'result' as const },
];

describe('FlowFigure', () => {
  it('is a captioned figure of the steps in order, each with its label and detail', () => {
    const figure = render(<FlowFigure title="How plan decides" caption="Each candidate passes the gates in order." steps={STEPS} />).container.querySelector('figure')!;
    expect(figure).not.toBeNull();
    expect(text(figure.querySelector('figcaption'))).toContain('Each candidate passes the gates in order.');
    expect(text(figure.querySelector('figcaption'))).toContain('How plan decides');
    const steps = [...figure.querySelectorAll('ol > li')];
    expect(steps.map((li) => text(li.querySelector('.flow-label')))).toEqual(STEPS.map((s) => s.label));
    expect(steps.map((li) => text(li.querySelector('.flow-detail')))).toEqual(STEPS.map((s) => s.detail));
    expect(steps.map((li) => li.getAttribute('data-kind'))).toEqual(['io', 'step', 'step', 'result']);
    // the nodes are drawing, not content
    for (const node of figure.querySelectorAll('.flow-node')) expect(node.getAttribute('aria-hidden')).toBe('true');
  });

  it('can close on a loop back into the sequence, spanning from the step it leaves to the one it returns to', () => {
    const figure = render(<FlowFigure title="Loop" caption="c" steps={STEPS} loop={{ from: 2, to: 1, label: 'RLAIF retrains the router' }} />).container.querySelector('figure')!;
    const loop = figure.querySelector<HTMLElement>('.flow-loop')!;
    expect(text(loop)).toContain('RLAIF retrains the router');
    // grid lines of the row layout: from step 1's column up to step 2's
    expect(loop.style.getPropertyValue('--loop-span')).toBe('2 / 3');
    expect(figure.style.getPropertyValue('--flow-count')).toBe(String(STEPS.length));
  });

  it('turns from a column down the side to a row across by its own width, not the viewport', () => {
    expect(CSS).toMatch(/\.flow \{[^}]*container-type:\s*inline-size/);
    expect(CSS).toMatch(/@container flow \(min-width: [\d.]+rem\) \{[\s\S]*?\.flow-steps \{[^}]*grid-auto-flow:\s*column/);
  });
});
