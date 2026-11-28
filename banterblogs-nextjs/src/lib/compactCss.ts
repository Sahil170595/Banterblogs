const COMMENT = /\/\*[\s\S]*?\*\//g;
const QUOTED = /"[^"]*"|'[^']*'/g;
// what compacting would rewrite inside a string
const COMPACTED = /[\s{};,]/;
const WHITESPACE = /\s+/g;
const AROUND_PUNCTUATION = /\s*([{};,])\s*/g;

/**
 * A stylesheet without its comments and without the whitespace CSS ignores,
 * for one served inline. Single spaces stay where they separate (descendant
 * combinators, calc operators). It does not parse strings, so it throws on
 * a quoted string it would alter instead of serving it changed.
 */
export function compactCss(css: string): string {
  const uncommented = css.replace(COMMENT, '');
  for (const [quoted] of uncommented.matchAll(QUOTED)) {
    if (COMPACTED.test(quoted)) throw new Error(`compactCss would alter the string ${quoted}`);
  }
  return uncommented.replace(WHITESPACE, ' ').replace(AROUND_PUNCTUATION, '$1').trim();
}
