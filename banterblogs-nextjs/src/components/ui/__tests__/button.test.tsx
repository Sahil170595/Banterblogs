import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button, ButtonLink, BUTTON_SIZES, BUTTON_VARIANTS } from '../Button';

const classesOf = (markup: string) => /class="([^"]*)"/.exec(markup)?.[1].split(/\s+/) ?? [];

describe('Button and ButtonLink', () => {
  it('are pressable pills in three variants and two sizes', () => {
    expect(BUTTON_VARIANTS).toEqual(['primary', 'secondary', 'ghost']);
    expect(BUTTON_SIZES).toEqual(['sm', 'md']);
    for (const variant of BUTTON_VARIANTS) {
      for (const size of BUTTON_SIZES) {
        const classes = classesOf(renderToStaticMarkup(<Button variant={variant} size={size}>Go</Button>));
        expect(classes, `${variant} ${size}`).toEqual(expect.arrayContaining(['pressable', 'rounded-full', 'inline-flex']));
      }
    }
  });

  it('spends ember only on primary; secondary is a hairline; ghost has no edge', () => {
    const primary = classesOf(renderToStaticMarkup(<Button variant="primary">Go</Button>));
    const secondary = classesOf(renderToStaticMarkup(<Button variant="secondary">Go</Button>));
    const ghost = classesOf(renderToStaticMarkup(<Button variant="ghost">Go</Button>));
    expect(primary).toEqual(expect.arrayContaining(['bg-primary', 'text-primary-foreground']));
    expect(secondary).toContain('border');
    expect(secondary.some((c) => /^bg-primary/.test(c))).toBe(false);
    expect(ghost.some((c) => /^border$/.test(c))).toBe(false);
  });

  // re-judge P1-7 (WCAG 1.4.10): a nowrap, unshrinkable pill with a long
  // label widened /banterpacks to 376px and /chimera to 348px at 320
  it('wraps a long label inside its container instead of widening it, at its usual height on one line', () => {
    for (const size of BUTTON_SIZES) {
      for (const markup of [
        renderToStaticMarkup(<Button size={size}>Go</Button>),
        renderToStaticMarkup(<ButtonLink href="/platform" size={size}>Learn about Banterpacks on the Platform page</ButtonLink>),
      ]) {
        const classes = classesOf(markup);
        expect(classes, size).not.toContain('whitespace-nowrap');
        expect(classes, size).not.toContain('shrink-0');
        expect(classes, size).toEqual(expect.arrayContaining(['max-w-full', 'text-center']));
        // a floor, not a fixed height, so a second line has room
        expect(classes.filter((c) => /^h-\d/.test(c)), size).toEqual([]);
        expect(classes, size).toContain(size === 'sm' ? 'min-h-7' : 'min-h-9');
      }
    }
  });

  // a one-line pill must fit its floor exactly as the fixed height did, or
  // every row of buttons shifts the page below it
  it('fits a one-line label, its padding and the hairline inside the height floor', () => {
    // tailwind.config.ts: label-13 on a 20px line, copy-14 on 1.6
    const LINE_PX = { sm: 20, md: 14 * 1.6 };
    const FLOOR_PX = { sm: 28, md: 36 };
    const HAIRLINE_PX = 2;
    const SPACING_PX: Record<string, number> = { '0': 0, '0.5': 2, '1': 4, '1.5': 6, '2': 8 };
    for (const size of BUTTON_SIZES) {
      const classes = classesOf(renderToStaticMarkup(<Button size={size} variant="secondary">Go</Button>));
      const padding = SPACING_PX[classes.map((c) => /^py-([\d.]+)$/.exec(c)?.[1]).find(Boolean) ?? '0'];
      expect(LINE_PX[size] + 2 * padding + HAIRLINE_PX, size).toBeLessThanOrEqual(FLOOR_PX[size]);
    }
  });

  it('keeps its icons whole while the label wraps', () => {
    const markup = renderToStaticMarkup(<Button icon={<svg />}>A long label that wraps</Button>);
    expect(markup).toMatch(/<span aria-hidden="true" class="inline-flex shrink-0">/);
  });

  it('is a type="button" unless told otherwise, and lets a caller class win a conflict', () => {
    expect(renderToStaticMarkup(<Button>Go</Button>)).toMatch(/^<button type="button"/);
    expect(renderToStaticMarkup(<Button type="submit">Go</Button>)).toMatch(/^<button type="submit"/);
    expect(classesOf(renderToStaticMarkup(<Button className="px-8">Go</Button>))).not.toContain('px-4');
  });

  it('renders icon slots on either side, hidden from assistive tech', () => {
    const markup = renderToStaticMarkup(
      <Button icon={<svg data-testid="lead" />} iconEnd={<svg data-testid="trail" />}>
        Go
      </Button>,
    );
    expect(markup).toMatch(/<span aria-hidden="true"[^>]*><svg data-testid="lead"><\/svg><\/span>Go<span aria-hidden="true"[^>]*><svg data-testid="trail">/);
  });

  it('links internally through next/link, and opens external links in a new tab safely', () => {
    const internal = renderToStaticMarkup(<ButtonLink href="/reports">Reports</ButtonLink>);
    expect(internal).toMatch(/^<a [^>]*href="\/reports"/);
    expect(internal).not.toContain('target=');
    const external = renderToStaticMarkup(<ButtonLink href="https://arxiv.org/abs/2605.27763">arXiv</ButtonLink>);
    expect(external).toContain('target="_blank"');
    expect(external).toContain('rel="noopener noreferrer"');
    // it sits above a card's stretched link
    expect(classesOf(internal)).toContain('relative');
  });
});
