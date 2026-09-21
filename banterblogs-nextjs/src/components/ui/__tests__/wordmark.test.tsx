import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Wordmark } from '../Wordmark';

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = (selector: string) => {
  const at = CSS.indexOf(`${selector} {`);
  return at < 0 ? '' : CSS.slice(at, CSS.indexOf('}', at));
};

describe('Wordmark', () => {
  it('is the landing orbital mark, decorative, beside the name in mono', () => {
    const markup = renderToStaticMarkup(<Wordmark />);
    expect(markup).toBe(
      '<span data-wordmark="orbital" class="inline-flex items-center gap-2 sm:gap-3"><span aria-hidden="true" class="brand-orbit"></span><span class="brand-wordmark">Chimeraforge</span></span>',
    );
  });

  it('draws the ring, the ember-lit core and its satellite in CSS, and sets the name at the 12px mono label size', () => {
    expect(rule('.brand-orbit')).toMatch(/border:\s*1px solid/);
    expect(rule('.brand-orbit::before')).toMatch(/box-shadow:[^;]*hsl\(var\(--primary\)/);
    expect(rule('.brand-orbit::after')).toMatch(/background-color:\s*hsl\(var\(--primary\)\)/);
    const name = rule('.brand-wordmark');
    expect(name).toMatch(/font-family:\s*var\(--font-mono\)/);
    expect(name).toMatch(/font-size:\s*0\.75rem/);
    expect(name).toMatch(/text-transform:\s*uppercase/);
  });
});
