import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommandChip } from '../CommandChip';

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const classesIn = (markup: string) => [...markup.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));

describe('CommandChip', () => {
  it('shows a shell command after a prompt that copying and reading skip, with a copy button named for it', () => {
    const markup = renderToStaticMarkup(<CommandChip command="pip install quantfit" label="quantfit install command" />);
    expect(markup).toMatch(/^<div class="[^"]*command-chip/);
    expect(markup).toMatch(/<span aria-hidden="true" class="[^"]*select-none[^"]*">\$<\/span>/);
    expect(markup).toMatch(/<code[^>]*>pip install quantfit<\/code>/);
    expect(markup).toContain('aria-label="Copy quantfit install command"');
  });

  it('draws its edge as an inset hairline, not a border, and sits above a card’s stretched link', () => {
    const markup = renderToStaticMarkup(<CommandChip command="pip install quantfit" label="install" />);
    expect(classesIn(markup).filter((c) => BORDER_WIDTH.test(c))).toEqual([]);
    expect(classesIn(markup)).toContain('relative');
  });

  it('scrolls a long command inside itself rather than widening the page, with the prompt and the copy button held in view', () => {
    const markup = renderToStaticMarkup(<CommandChip command={'uvx chimeraforge plan --model-size 8b --hardware "RTX 4090 24GB"'} label="quickstart" />);
    const chip = /^<div class="([^"]*)"/.exec(markup)![1].split(/\s+/);
    expect(chip).toContain('max-w-full');
    expect(chip).not.toContain('overflow-x-auto');
    const scroller = /<span[^>]*role="region"[^>]*class="([^"]*)"/.exec(markup)![1].split(/\s+/);
    expect(scroller).toEqual(expect.arrayContaining(['min-w-0', 'overflow-x-auto', 'whitespace-nowrap']));
    expect(markup).toMatch(/role="region"[^>]*><code[^>]*>uvx chimeraforge plan/);
    // the copy button is the chip's own child, outside the scroller
    expect(markup).toMatch(/<\/code><\/span><button/);
  });

  // re-judge P1-8: WebKit will not focus a scroll box without a tabindex, so
  // an overflowing command could not be scrolled from the keyboard there
  it('lets the keyboard reach and scroll its command, named for what it holds', () => {
    const markup = renderToStaticMarkup(<CommandChip command="pip install quantfit" label="quantfit install command" />);
    const scroller = /<span([^>]*)role="region"([^>]*)>/.exec(markup)!;
    const attributes = scroller[1] + scroller[2];
    expect(attributes).toContain('tabindex="0"');
    expect(attributes).toContain('aria-label="quantfit install command"');
    // its ring comes from the site focus-ring rule (globals.css, R4 a11y)
    expect(attributes).toContain('data-scroll-region=""');
  });
});
