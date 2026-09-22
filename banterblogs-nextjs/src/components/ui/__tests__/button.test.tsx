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
