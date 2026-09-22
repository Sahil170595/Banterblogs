import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Swapping in JetBrains Mono must not move anything. next/font's automatic
// fallback is Arial-metric, so until the font arrived every uppercase mono
// label (nav, wordmark, list indices) set wider: on the 404, which Next
// serves without font preloads, the header nav shifted 163px (CLS 0.02).
// The fallback has to be monospace fonts with JetBrains Mono's 0.6em advance.

// advance widths in em, from each font's hmtx (units / unitsPerEm)
const MONO_ADVANCE_EM: Record<string, number> = {
  'JetBrains Mono': 600 / 1000,
  Menlo: 1233 / 2048,
  'Courier New': 1229 / 2048,
  // the generic family resolves to a 0.6em face on Linux (Liberation/DejaVu
  // Sans Mono) and Android (Droid Sans Mono)
  monospace: 0.6,
};
const TOLERANCE_EM = 0.005;

const LAYOUT = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf8');
const call = /JetBrains_Mono\(\{([^}]*)\}\)/.exec(LAYOUT)?.[1] ?? '';

describe('mono font fallback', () => {
  it('turns off the Arial-metric automatic fallback', () => {
    expect(call).toMatch(/adjustFontFallback:\s*false/);
  });

  it('falls back only to monospace faces as wide as JetBrains Mono', () => {
    const list = /fallback:\s*\[([^\]]*)\]/.exec(call)?.[1] ?? '';
    const families = [...list.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    expect(families.length).toBeGreaterThan(0);
    expect(families[families.length - 1]).toBe('monospace');
    for (const family of families) {
      expect(MONO_ADVANCE_EM[family], family).toBeDefined();
      expect(Math.abs(MONO_ADVANCE_EM[family] - MONO_ADVANCE_EM['JetBrains Mono']), family).toBeLessThanOrEqual(TOLERANCE_EM);
    }
  });
});
