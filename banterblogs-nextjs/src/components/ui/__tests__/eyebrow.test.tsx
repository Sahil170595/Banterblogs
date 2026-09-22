import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Eyebrow } from '../Eyebrow';

describe('Eyebrow', () => {
  it('is the single mono label style', () => {
    expect(renderToStaticMarkup(<Eyebrow>Papers</Eyebrow>)).toBe('<p class="text-label-12-mono text-muted-foreground">Papers</p>');
  });

  it('can be a heading and lead with a status dot in a badge tone', () => {
    const markup = renderToStaticMarkup(
      <Eyebrow as="h2" dot="green">
        Live
      </Eyebrow>,
    );
    expect(markup).toMatch(/^<h2 class="[^"]*text-label-12-mono[^"]*inline-flex/);
    expect(markup).toMatch(/<span aria-hidden="true" class="[^"]*rounded-full[^"]*bg-status-green/);
  });
});
