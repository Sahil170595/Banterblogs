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
    const code = /<code class="([^"]*)"/.exec(markup)![1].split(/\s+/);
    expect(code).toEqual(expect.arrayContaining(['min-w-0', 'overflow-x-auto', 'whitespace-nowrap']));
    // the copy button is the chip's own child, outside the scroller
    expect(markup).toMatch(/<\/code><button/);
  });
});
