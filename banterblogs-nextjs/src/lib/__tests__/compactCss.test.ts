import { describe, expect, it } from 'vitest';
import { compactCss } from '../compactCss';

// A stylesheet served inline (EcosystemMap's <style>) is sent in the HTML and
// again in the RSC payload: its comments and indentation are for review only.

describe('compactCss', () => {
  it('drops comments and the whitespace CSS ignores', () => {
    const css = `/* a note,
       over two lines */
    .a {
      color: red; /* why */
      margin: 0 auto;
    }

    .b,
    .c {
      fill: none;
    }`;
    expect(compactCss(css)).toBe('.a{color: red;margin: 0 auto;}.b,.c{fill: none;}');
  });

  it('keeps the spaces that mean something: descendant combinators and calc operators', () => {
    expect(compactCss('html[data-x="on"] :is(.a, .b) .c {\n  transition-delay: calc(var(--d) + var(--i, 0) * var(--s));\n}')).toBe(
      'html[data-x="on"] :is(.a,.b) .c{transition-delay: calc(var(--d) + var(--i,0) * var(--s));}',
    );
  });

  it('keeps at-rule preludes and their nested rules', () => {
    expect(compactCss('@container m (min-width: 36.25rem) {\n  .a {\n    display: block;\n  }\n}')).toBe('@container m (min-width: 36.25rem){.a{display: block;}}');
  });

  it('refuses a quoted string it would change, rather than serve it altered', () => {
    expect(() => compactCss('.a::before { content: "two  words"; }')).toThrow(/"two {2}words"/);
    expect(() => compactCss(".a { font-family: 'A, B'; }")).toThrow(/'A, B'/);
    expect(compactCss('.a[data-line="data"] { fill: none; }')).toBe('.a[data-line="data"]{fill: none;}');
  });
});
