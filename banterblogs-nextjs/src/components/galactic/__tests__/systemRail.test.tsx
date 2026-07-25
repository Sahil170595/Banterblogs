import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemRail } from '../SystemRail';
import { STAR_SYSTEMS } from '../systems';

describe('galactic system rail', () => {
  it('renders every system destination and marks the tracked system', () => {
    const active = STAR_SYSTEMS[3];
    const html = renderToStaticMarkup(
      <SystemRail
        activeSystem={active}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    for (const system of STAR_SYSTEMS) {
      expect(html).toContain(system.name);
      expect(html).toContain(`href="${system.href}"`);
    }
    expect(html).toContain('aria-current="true"');
    expect(html).toContain(active.blurb);
  });

  it('keeps the observatory readout out of the live-region path', () => {
    const html = renderToStaticMarkup(
      <SystemRail
        activeSystem={STAR_SYSTEMS[0]}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(html).not.toContain('aria-live');
    expect(html).toContain('aria-label="Systems orbiting the Chimera core"');
  });
});
