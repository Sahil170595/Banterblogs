import { render } from '@testing-library/react';
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

  // R4: a row that holds several links (a paper: its preprint, demo and
  // evidence) is not one link; its title leads, and its status and evidence
  // sit in a meta column on the right from md, under the body on a phone.
  it('holds several links: the title leads where titleHref points, the body takes extra content, and the meta sits in its own column', () => {
    const { container } = render(
      <ListRow
        as="article"
        index="01"
        title="Quality Is Not a Safety Proxy"
        titleHref="https://arxiv.org/abs/2606.10154"
        description="Retained quality does not waive direct safety testing."
        aside={<span data-testid="meta">Submitted</span>}
      >
        <a href="https://huggingface.co/spaces/x">Demo</a>
      </ListRow>,
    );
    const row = container.firstElementChild!;
    expect(row.tagName).toBe('ARTICLE');
    expect(row.classList.contains('list-row')).toBe(true);
    // not one link: the title's link and the body's link sit side by side
    expect(row.matches('a')).toBe(false);
    const title = row.querySelector('h3 a.row-link')!;
    expect(title.getAttribute('href')).toBe('https://arxiv.org/abs/2606.10154');
    expect(title.getAttribute('target')).toBe('_blank');
    expect(title.querySelector('.row-arrow')).not.toBeNull();
    expect(row.querySelector('a[href="https://huggingface.co/spaces/x"]')).not.toBeNull();
    const aside = row.querySelector('[data-testid="meta"]')!.parentElement!;
    expect(aside.className.split(/\s+/)).toEqual(expect.arrayContaining(['md:col-start-3', 'md:row-start-1']));
    // three columns from md: index, body and meta; the meta drops under the body on a phone
    expect(row.className).toMatch(/md:grid-cols-\[auto_minmax\(0,1fr\)_minmax\(0,\S+\)\]/);
    expect(row.className).toContain('grid-cols-[auto_minmax(0,1fr)]');
    expect(classesIn(container.innerHTML).filter((c) => BORDER_WIDTH.test(c))).toEqual([]);
  });
});
