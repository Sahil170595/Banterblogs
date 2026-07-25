import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrackingTicker, TICKER_INTERVAL_MS, TICKER_START_DELAY_MS } from '../TrackingTicker';
import { STAR_SYSTEMS } from '../systems';

// The tracking ticker is the passive visitor's tour of the atlas — these
// tests pin the pacing contract and the per-system readout content.

describe('tracking ticker pacing contract', () => {
  it('lets the scene cold-open before narration starts', () => {
    expect(TICKER_START_DELAY_MS).toBeGreaterThanOrEqual(3000);
  });

  it('dwells long enough to read the longest entry at the site reading rate', () => {
    // 13 chars/second — the same calibration the /show scenes use
    const READING_CPS = 13;
    const longestChars = Math.max(
      ...STAR_SYSTEMS.map((system) => system.name.length + system.blurb.length),
    );
    expect(TICKER_INTERVAL_MS).toBeGreaterThanOrEqual((longestChars / READING_CPS) * 1000);
  });

  it('tours all nine systems within about a minute', () => {
    expect(STAR_SYSTEMS.length * TICKER_INTERVAL_MS).toBeLessThanOrEqual(70_000);
  });
});

describe('tracking ticker readout', () => {
  it('renders name, blurb, and tour position for every system', () => {
    STAR_SYSTEMS.forEach((system, index) => {
      const html = renderToStaticMarkup(
        <TrackingTicker system={system} position={index + 1} total={STAR_SYSTEMS.length} />,
      );
      expect(html).toContain(system.name);
      expect(html).toContain(system.blurb);
      expect(html).toContain(`${index + 1} / ${STAR_SYSTEMS.length}`);
    });
  });

  it('stays out of the accessibility tree — the systems nav is the SR path', () => {
    const html = renderToStaticMarkup(
      <TrackingTicker system={STAR_SYSTEMS[0]} position={1} total={STAR_SYSTEMS.length} />,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('pointer-events-none');
  });
});
