import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.resolve(__dirname, file), 'utf8');

describe('fixed bottom UI on notched phones', () => {
  it('clears the safe-area insets', () => {
    for (const file of ['../MobileOptimization.tsx', '../EpisodeFloatingUI.tsx']) {
      const source = read(file);
      expect(source, file).toContain('bottom-[max(1.5rem,env(safe-area-inset-bottom))]');
      expect(source, file).not.toMatch(/\bbottom-6\b/);
    }
    expect(read('../EpisodeFloatingUI.tsx')).toContain('right-[max(1.5rem,env(safe-area-inset-right))]');
  });
});
