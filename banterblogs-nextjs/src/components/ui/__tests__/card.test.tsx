import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Link from 'next/link';
import { Card, CardLink } from '../Card';

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const classesIn = (markup: string) => [...markup.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));

describe('Card', () => {
  it('plain: a quiet surface with no border and no hover depth', () => {
    const markup = renderToStaticMarkup(<Card>Body</Card>);
    expect(markup).toMatch(/^<div class="[^"]*card-surface/);
    expect(classesIn(markup).filter((c) => BORDER_WIDTH.test(c))).toEqual([]);
    expect(markup).not.toMatch(/card-depth|card-lift/);
  });

  it('interactive with an href: the whole card is the link, and the surface inside it lifts', () => {
    const markup = renderToStaticMarkup(
      <Card variant="interactive" href="/reports">
        Body
      </Card>,
    );
    // the link takes the pointer and its .card-lift child moves (R1's recipe)
    expect(markup).toMatch(/^<a [^>]*class="[^"]*card-depth[^"]*"[^>]*><div class="[^"]*card-lift card-surface/);
    expect(markup).toContain('href="/reports"');
    expect(classesIn(markup).filter((c) => BORDER_WIDTH.test(c))).toEqual([]);
  });

  it('interactive without an href: a container whose CardLink stretches over it, so it can hold other links', () => {
    const markup = renderToStaticMarkup(
      <Card variant="interactive" as="article">
        <h3>
          <CardLink href="https://arxiv.org/abs/2605.27763">Paper</CardLink>
        </h3>
        <Link href="/reports/technical-report-138">TR138</Link>
      </Card>,
    );
    expect(markup).toMatch(/^<article class="[^"]*card-depth[^"]*"><div class="[^"]*card-lift card-surface/);
    expect(markup).toMatch(/<a [^>]*class="card-link"[^>]*href="https:\/\/arxiv.org\/abs\/2605.27763"|<a [^>]*href="https:\/\/arxiv.org\/abs\/2605.27763"[^>]*class="card-link"/);
    expect(markup).toContain('target="_blank"');
    // no link nests inside another
    expect(markup).not.toMatch(/<a [^>]*>(?:(?!<\/a>).)*<a /);
  });
});
