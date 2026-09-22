import type { CSSProperties } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Section } from '../Section';

describe('Section', () => {
  it('labels itself with a 24px h2 and an optional one-line description, in the fixed rhythm', () => {
    const markup = renderToStaticMarkup(
      <Section id="published" title="Published & public" description="The first peer-reviewed paper.">
        <p>cards</p>
      </Section>,
    );
    expect(markup).toMatch(/^<section [^>]*aria-labelledby="published-heading"/);
    expect(markup).toMatch(/^<section [^>]*id="published"[^>]*class="[^"]*page-section/);
    expect(markup).toMatch(/<h2 id="published-heading" class="[^"]*text-heading-24[^"]*">Published &amp; public<\/h2>/);
    expect(markup).toMatch(/<p class="[^"]*text-copy-16[^"]*text-muted-foreground[^"]*">The first peer-reviewed paper.<\/p>/);
    // the 14px uppercase label it replaces
    expect(markup).not.toMatch(/uppercase|tracking-wider|text-sm font-semibold/);
  });

  it('can set its heading beside the content on wide screens, sticky while the content scrolls', () => {
    const markup = renderToStaticMarkup(
      <Section id="review" title="Under peer review" aside>
        <p>cards</p>
      </Section>,
    );
    expect(markup).toMatch(/class="[^"]*lg:grid[^"]*"/);
    expect(markup).toMatch(/class="[^"]*lg:sticky/);
  });

  it('passes entrance props to its heading block, so the first section can join the page entrance', () => {
    const markup = renderToStaticMarkup(
      <Section id="first" title="First" headingProps={{ className: 'entrance-group', style: { '--group': 3 } as CSSProperties }}>
        <p>cards</p>
      </Section>,
    );
    expect(markup).toMatch(/<div class="[^"]*entrance-group[^"]*" style="--group:3"><h2/);
  });
});
