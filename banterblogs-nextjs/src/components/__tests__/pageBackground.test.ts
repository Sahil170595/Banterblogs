import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The interior page background (.chimera-shell on <main>, globals.css). Phase
// R3 (A3): the 48px wallpaper grid is gone, and the three ember and accent
// glows became one quiet horizon behind the header; the starfield specks,
// the landing's continuity, stay.

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = (selector: string) => {
  const at = CSS.indexOf(`${selector} {`);
  return at < 0 ? null : CSS.slice(at, CSS.indexOf('}', at));
};

describe('interior page background', () => {
  it('draws no wallpaper grid', () => {
    expect(rule('.chimera-shell::before')).toBeNull();
    expect(CSS).not.toMatch(/background-size:\s*48px 48px/);
  });

  it('keeps the three starfield speck layers and one ember horizon, and nothing else', () => {
    const layer = rule('.chimera-shell::after') ?? '';
    const gradients = layer.match(/radial-gradient\(/g) ?? [];
    expect(gradients).toHaveLength(4);
    expect(layer.match(/radial-gradient\(circle 1(?:\.5)?px at/g)).toHaveLength(3);
    const glows = layer.match(/radial-gradient\(ellipse[^;]*?hsl\(var\(--(\w+)\)/g) ?? [];
    expect(glows).toHaveLength(1);
    expect(glows[0]).toContain('--primary');
    expect(layer).not.toMatch(/--accent/);
  });

  it('sizes the horizon in fixed units, so a long page does not stretch it down the page', () => {
    const horizon = /radial-gradient\(ellipse ([^,]+) at ([^,]+),/.exec(rule('.chimera-shell::after') ?? '');
    expect(horizon).not.toBeNull();
    expect(horizon![1]).not.toMatch(/%/);
    expect(horizon![2]).toMatch(/^50% -/);
  });
});
