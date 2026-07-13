import { describe, expect, it } from 'vitest';
import { STAR_SYSTEMS } from '../systems';

describe('galactic landing visual contract', () => {
  it('keeps persistent atlas labels to the three architectural anchors', () => {
    const anchors = STAR_SYSTEMS.filter((system) => system.labelTier === 'anchor').map(
      (system) => system.name,
    );

    expect(anchors).toEqual(['Banterpacks', 'Banterhearts', 'Chimera Multi-Agent']);
  });

  it('keeps every system reachable while the quiet systems stay interaction-led', () => {
    expect(STAR_SYSTEMS).toHaveLength(9);
    expect(STAR_SYSTEMS.filter((system) => system.labelTier === 'quiet')).toHaveLength(6);

    for (const system of STAR_SYSTEMS) {
      expect(system.href).toBeTruthy();
      expect(system.ctaLabel).toBeTruthy();
    }
  });
});
