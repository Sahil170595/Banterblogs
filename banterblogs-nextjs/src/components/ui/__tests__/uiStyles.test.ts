import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The stylesheet side of the primitives (globals.css): the card surface and
// its hover depth reuse R1's .card-depth / .card-lift recipe, the list-row
// hairline is a layer rather than a border, and sections keep one rhythm.

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim().replace(/\s+/g, ' '), body }));
const ruleFor = (selector: string) => rules.filter((rule) => rule.selector.split(',').map((s) => s.trim()).includes(selector));
const body = (selector: string) => ruleFor(selector).map((rule) => rule.body).join(';');

describe('wordmark', () => {
  // JetBrains Mono advances every glyph 600 of 1000 units per em
  const MONO_ADVANCE_EM = 0.6;
  const NAME = 'Chimeraforge';

  it('holds a fixed box as wide as the mono name, so a late font swap cannot shift the header', () => {
    const rule = body('.brand-wordmark');
    const tracking = Number(/letter-spacing:\s*([\d.]+)em/.exec(rule)?.[1]);
    const width = Number(/(?:^|;)\s*width:\s*([\d.]+)em/.exec(rule)?.[1]);
    expect(rule).toMatch(/display:\s*inline-block/);
    expect(rule).toMatch(/white-space:\s*nowrap/);
    expect(width).toBeCloseTo(NAME.length * (MONO_ADVANCE_EM + tracking), 5);
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'ui', 'Wordmark.tsx'), 'utf8');
    expect(source).toContain(`<span className="brand-wordmark">${NAME}</span>`);
  });
});

describe('card surface', () => {
  it('shares the archive card visual rules instead of forking them', () => {
    expect(ruleFor('.card-surface').some((rule) => rule.selector.includes('.card-visual'))).toBe(true);
    expect(body('.card-surface')).toMatch(/background-color:\s*hsl\(var\(--card\)\)/);
    const hover = rules.find((rule) => /\.card-depth:hover :is\(\.card-visual, \.card-surface\)/.test(rule.selector));
    expect(hover?.body).toMatch(/background-color:\s*hsl\(var\(--card-raised\)\)/);
  });

  it('rings the whole surface with the pre-rendered glow, whose opacity is all that animates', () => {
    const glow = body('.card-lift.card-surface::after');
    expect(glow).toMatch(/inset:\s*0;/);
    expect(glow).toMatch(/aspect-ratio:\s*auto/);
    expect(CSS).not.toMatch(/transition:[^;]*box-shadow/);
  });

  it('stretches a card link over its card, so the card can hold other links above it', () => {
    const stretch = body('.card-link::after');
    expect(stretch).toMatch(/position:\s*absolute/);
    expect(stretch).toMatch(/inset:\s*0/);
  });
});

describe('list row', () => {
  it('draws its hairline on a 1px layer, which turns ember under the pointer', () => {
    const line = body('.list-row::before');
    expect(line).toMatch(/height:\s*1px/);
    expect(line).toMatch(/background-color:\s*hsl\(var\(--border\)/);
    // a layer, not a border property
    expect(line).not.toMatch(/(?:^|[;\s])border(?:-[a-z]+)*\s*:/);
    expect(CSS).toMatch(/a\.list-row:hover::before\s*\{[^}]*background-color:\s*hsl\(var\(--primary\)/);
  });

  it('nudges its arrow by the nudge token only where the device really hovers', () => {
    const hover = /@media \(hover: hover\) and \(pointer: fine\) \{([\s\S]*?)\n\}/g;
    const blocks = [...CSS.matchAll(hover)].map((m) => m[1]).join('\n');
    expect(blocks).toMatch(/a\.list-row:hover \.row-arrow\s*\{[^}]*transform:\s*translateX\(var\(--motion-nudge\)\)/);
  });
});

// The old panel classes stay until the pages that use them move onto the
// primitives (R3-B), but glass is for the header alone: an in-flow panel
// blurs nothing worth blurring and costs a compositing layer each.
describe('retired panel classes, until their last use goes', () => {
  it.each(['.signal-panel', '.signal-panel-strong'])('%s draws no backdrop blur', (selector) => {
    const panel = body(selector);
    expect(panel).not.toBe('');
    expect(panel).not.toMatch(/backdrop/);
  });

  it('sets the old pill in the mono label role', () => {
    const pill = body('.signal-pill');
    expect(pill).toMatch(/text-label-12-mono/);
    expect(pill).not.toMatch(/tracking-\[/);
  });
});

describe('section rhythm', () => {
  it('sets sections 64px apart on phones and 96px apart from 768px', () => {
    expect(body('.page-section + .page-section')).toMatch(/margin-top:\s*4rem/);
    expect(CSS).toMatch(/@media \(min-width: 768px\) \{\s*\.page-section \+ \.page-section \{\s*margin-top:\s*6rem;/);
  });
});
