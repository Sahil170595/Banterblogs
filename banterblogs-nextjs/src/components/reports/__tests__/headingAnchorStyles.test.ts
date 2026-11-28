// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEADING_ANCHOR_CLASS } from '@/lib/reports/headingAnchors';
import { COPY_STATE_ATTRIBUTE } from '../HeadingAnchorCopy';

// The heading anchor's look lives with the report page's rules in reading.css,
// never in the global sheet. Its "#" and its confirmation are drawn by CSS, so
// neither is text in the heading. It is hidden only where a pointer can hover
// it into view; a touch screen, which cannot, always shows it.

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'src', 'app', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const READING = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'reading.css'), 'utf8');
const BLOCK = READING.slice(READING.indexOf('/* report page'), READING.indexOf('/* end report page */')).replace(/\/\*[\s\S]*?\*\//g, '');
const ANCHOR = `.report-prose .${HEADING_ANCHOR_CLASS}`;
const HOVER_QUERY = '@media (hover: hover) and (pointer: fine)';
const MIN_TARGET_PX = 24;
const ROOT_PX = 16;

// the body of an at-rule, braces balanced
function atRule(css: string, prelude: string): string {
  const bodies: string[] = [];
  for (let at = css.indexOf(prelude); at >= 0; at = css.indexOf(prelude, at + 1)) {
    const open = css.indexOf('{', at);
    let depth = 1;
    let i = open + 1;
    for (; depth > 0 && i < css.length; i++) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
    bodies.push(css.slice(open + 1, i - 1));
  }
  return bodies.join('\n');
}
const rules = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, declarations]) => ({ selectors: selector.split(',').map((s) => s.trim()), declarations }));
const declarationsOf = (css: string, selector: string) =>
  rules(css)
    .filter((rule) => rule.selectors.includes(selector))
    .map((rule) => rule.declarations)
    .join(';');
const value = (declarations: string, property: string) => new RegExp(`(?:^|[;\\s])${property}:\\s*([^;]+)`).exec(declarations)?.[1].trim().replace(/\s+/g, ' ');
// the block without its at-rules: what applies everywhere
const BASE = BLOCK.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');

describe('heading anchor styles', () => {
  it('lives in the report block of reading.css, and nowhere in the global sheet', () => {
    expect(BLOCK).toContain(`${ANCHOR} {`);
    expect(read('globals.css')).not.toContain(HEADING_ANCHOR_CLASS);
    expect(READING.split(HEADING_ANCHOR_CLASS).length - 1).toBe(BLOCK.split(HEADING_ANCHOR_CLASS).length - 1);
  });

  it('draws the "#" itself, so the heading holds no text but its own', () => {
    expect(value(declarationsOf(BASE, `${ANCHOR}::before`), 'content')).toBe('"#"');
  });

  it('is not a prose link: no underline, the muted colour, ember only under the pointer', () => {
    const anchor = declarationsOf(BASE, ANCHOR);
    expect(value(anchor, 'text-decoration-line')).toBe('none');
    expect(value(anchor, 'color')).toBe('hsl(var(--muted-foreground))');
    expect(value(declarationsOf(BASE, `${ANCHOR}:hover`), 'color')).toBe('hsl(var(--primary))');
  });

  it('is a target of at least 24px, whatever the heading size', () => {
    const anchor = declarationsOf(BASE, ANCHOR);
    expect(value(anchor, 'display')).toBe('inline-block');
    expect(parseFloat(value(anchor, 'min-width') ?? '0') * ROOT_PX).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  });

  it('shows by default, and hides only where a pointer can hover it back', () => {
    expect(value(declarationsOf(BASE, ANCHOR), 'opacity')).toBeUndefined();
    const hover = atRule(BLOCK, HOVER_QUERY);
    expect(value(declarationsOf(hover, ANCHOR), 'opacity')).toBe('0');
    // every rule that hides it sits inside the hover query
    expect(rules(BASE).filter((rule) => rule.selectors.some((s) => s.includes(HEADING_ANCHOR_CLASS)) && /opacity:\s*0\b/.test(rule.declarations))).toEqual([]);
  });

  it('comes back on the heading\'s hover, on keyboard focus and while a copy is confirmed', () => {
    const hover = atRule(BLOCK, HOVER_QUERY);
    const shown = rules(hover).find((rule) => value(rule.declarations, 'opacity') === '1');
    // rejoined: the helper splits a selector list at every comma, :is() included
    expect(shown?.selectors.join(', ')).toBe(
      `.report-prose :is(h2, h3):hover > .${HEADING_ANCHOR_CLASS}, ${ANCHOR}:is(:focus-visible, [${COPY_STATE_ATTRIBUTE}])`,
    );
  });

  it('fades on the fast token, opacity and colour only', () => {
    expect(value(declarationsOf(BASE, ANCHOR), 'transition')).toBe(
      'opacity var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)',
    );
  });

  it('confirms a copy beside the "#", in the 12px mono label, and says when it failed', () => {
    const copied = declarationsOf(BASE, `${ANCHOR}[${COPY_STATE_ATTRIBUTE}]::after`);
    expect(value(copied, 'content')).toBe('"Copied"');
    expect(value(copied, 'font-size')).toBe('0.75rem');
    expect(value(copied, 'text-transform')).toBe('uppercase');
    expect(value(copied, 'color')).toBe('hsl(var(--status-green))');
    const failed = declarationsOf(BASE, `${ANCHOR}[${COPY_STATE_ATTRIBUTE}="failed"]::after`);
    expect(value(failed, 'content')).toBe('"Copy failed"');
    expect(value(failed, 'color')).toBe('hsl(var(--muted-foreground))');
  });

  it('is left off the printed page', () => {
    expect(value(declarationsOf(atRule(BLOCK, '@media print'), ANCHOR), 'display')).toBe('none');
  });
});
