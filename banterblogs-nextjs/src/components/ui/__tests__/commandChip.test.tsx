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

  it('scrolls a long command inside itself rather than widening the page', () => {
    const markup = renderToStaticMarkup(<CommandChip command={'uvx chimeraforge plan --model-size 8b --hardware "RTX 4090 24GB"'} label="quickstart" />);
    expect(classesIn(markup)).toEqual(expect.arrayContaining(['max-w-full', 'overflow-x-auto']));
    expect(markup).toMatch(/<code class="[^"]*whitespace-nowrap/);
  });
});
