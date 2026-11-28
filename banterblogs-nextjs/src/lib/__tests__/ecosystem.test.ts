import { describe, expect, it } from 'vitest';
import { CORE_SELECTION, STAR_SYSTEMS } from '@/components/galactic/systems';
import { CORE_ID, ECOSYSTEM_CORE, ECOSYSTEM_NODES, ECOSYSTEM_SYSTEMS, nodeById } from '../ecosystem';

// The ecosystem's nodes: the Chimera core and the nine repositories. The
// landing's star systems and the /platform map both read their names and
// roles from here, so the two cannot drift.

describe('ecosystem nodes', () => {
  it('is the core plus the nine repositories, each id and name once', () => {
    expect(ECOSYSTEM_SYSTEMS).toHaveLength(9);
    expect(ECOSYSTEM_NODES).toHaveLength(10);
    expect(ECOSYSTEM_NODES[0].id).toBe(CORE_ID);
    expect(new Set(ECOSYSTEM_NODES.map((node) => node.id)).size).toBe(10);
    expect(new Set(ECOSYSTEM_NODES.map((node) => node.name)).size).toBe(10);
  });

  it('gives every node a one-line role and its languages', () => {
    for (const node of ECOSYSTEM_NODES) {
      expect(node.blurb.length, node.id).toBeGreaterThan(20);
      expect(node.blurb, node.id).not.toMatch(/\n/);
      expect(node.stack.length, node.id).toBeGreaterThan(0);
    }
  });

  it('finds a node by id and fails loudly on an unknown one', () => {
    expect(nodeById('echo').name).toBe('Echo');
    expect(nodeById(CORE_ID).name).toBe(ECOSYSTEM_CORE.name);
    expect(() => nodeById('nope' as never)).toThrow(/unknown node/);
  });
});

describe('the landing reads the same nodes', () => {
  it('carries these names, roles and destinations, in this order', () => {
    expect(STAR_SYSTEMS.map(({ name, blurb, href, ctaLabel }) => ({ name, blurb, href, ctaLabel }))).toEqual(
      ECOSYSTEM_SYSTEMS.map(({ name, blurb, href, ctaLabel }) => ({ name, blurb, href, ctaLabel })),
    );
    expect(CORE_SELECTION.name).toBe(ECOSYSTEM_CORE.name);
    expect(CORE_SELECTION.blurb).toBe(ECOSYSTEM_CORE.blurb);
  });

  it('adds nothing to a star system but its orbit', () => {
    const fields = ['a', 'blurb', 'ctaLabel', 'e', 'href', 'inc', 'labelTier', 'name', 'node', 'period', 'phase', 'size', 'tempK'];
    for (const system of STAR_SYSTEMS) expect(Object.keys(system).sort(), system.name).toEqual(fields);
  });

  // the landing's appearance is fixed by these: the extraction moved no star
  it('keeps every orbit where it was', () => {
    expect(STAR_SYSTEMS.map(({ name, a, e, inc, node, phase, tempK, size, labelTier }) => [name, a, e, inc, node, phase, tempK, size, labelTier])).toEqual([
      ['Banterpacks', 11.8, 0.1, 0.22, 0.4, 1.1, 6500, 0.5, 'anchor'],
      ['Banterhearts', 14, 0.28, 0.3, 2.1, 3.9, 11000, 0.44, 'anchor'],
      ['Chimera Multi-Agent', 16, 0.18, 0.3, 1.2, 5.0, 5200, 0.3, 'anchor'],
      ['JARVIS Console', 18, 0.14, 0.12, 0.9, 0.8, 7500, 0.27, 'quiet'],
      ['Chimeraforge', 20, 0.05, 0.06, 5.2, 0.2, 3800, 0.28, 'quiet'],
      ['Echo', 21.5, 0.08, 0.42, 4.4, 4.2, 3200, 0.16, 'quiet'],
      ['Chimeradroid', 23, 0.1, 0.16, 3.6, 2.4, 4200, 0.22, 'quiet'],
      ['This Site', 25, 0.06, 0.2, 2.9, 2.0, 5800, 0.24, 'quiet'],
      ['Project Wyvern', 19, 0.78, 0.36, 5.8, 5.9, 9500, 0.26, 'quiet'],
    ]);
  });
});
