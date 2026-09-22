import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ListRow } from '../ListRow';

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const classesIn = (markup: string) => [...markup.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));

describe('ListRow', () => {
  it('is the /show row: index, title, description, mono meta and a trailing arrow on a hairline', () => {
    const markup = renderToStaticMarkup(
      <ListRow href="/show/bft-consensus" index="04" title="Four replicas, one decision" description="Pre-prepare, prepare, commit." meta="TDD-005 bft.rs" />,
    );
    expect(markup).toMatch(/^<a [^>]*class="[^"]*list-row/);
    expect(markup).toContain('href="/show/bft-consensus"');
    expect(markup).toMatch(/<h3 class="[^"]*text-heading-20[^"]*">Four replicas, one decision<\/h3>/);
    expect(markup).toContain('Pre-prepare, prepare, commit.');
    expect(markup).toMatch(/class="[^"]*text-label-12-mono[^"]*">TDD-005 bft.rs/);
    expect(markup).toMatch(/class="[^"]*row-arrow/);
    // the hairline is the row's ::before (globals.css), not a border, so a list of rows is not a wall of boxes
    expect(classesIn(markup).filter((c) => BORDER_WIDTH.test(c))).toEqual([]);
  });

  it('renders as a plain row without an href, and takes the heading level it is given', () => {
    const markup = renderToStaticMarkup(<ListRow title="Withheld" titleAs="h4" />);
    expect(markup).toMatch(/^<div class="[^"]*list-row/);
    expect(markup).toContain('<h4');
    expect(markup).not.toContain('row-arrow');
  });
});
