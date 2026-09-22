import { describe, expect, it } from 'vitest';
import { GLOBALS_CSS } from '@/test/contrast';

// The R4 accessibility rules live in one delimited block of globals.css.
const START = GLOBALS_CSS.indexOf('/* R4 a11y */');
const END = GLOBALS_CSS.indexOf('/* end R4 a11y */');
const BLOCK = START >= 0 && END > START ? GLOBALS_CSS.slice(START, END).replace(/\/\*[\s\S]*?\*\//g, '') : '';

const ruleFor = (selector: RegExp) => new RegExp(`${selector.source}[^{]*\\{([^}]*)\\}`).exec(BLOCK)?.[1] ?? '';

describe('R4 accessibility styles', () => {
  it('live in one delimited block', () => {
    expect(BLOCK).not.toBe('');
  });

  // re-judge P2-6 and P1-8: "Report details" and the mobile contents drew the
  // UA's 1px ring, and the new keyboard-scrollable boxes had none
  it('ring every summary and keyboard scroll box the way the site rings its links and buttons', () => {
    const site = /:root \[href\]:focus-visible \{([^}]*)\}/.exec(GLOBALS_CSS)?.[1] ?? '';
    const ring = ruleFor(/:root :is\(summary, \.table-scroll, \[data-scroll-region\]\):focus-visible/);
    expect(ring).not.toBe('');
    for (const property of ['outline', 'outline-offset', 'box-shadow']) {
      const value = (css: string) => new RegExp(`${property}:\\s*([^;]+);`).exec(css)?.[1].trim();
      expect(value(ring), property).toBe(value(site));
    }
  });
});
