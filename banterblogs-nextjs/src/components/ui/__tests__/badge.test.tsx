import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Badge, BADGE_TONES, PAPER_STATUS_TONE } from '../Badge';

const classesOf = (markup: string) => /class="([^"]*)"/.exec(markup)?.[1].split(/\s+/) ?? [];
const PALETTE = /(?:^|:)(?:text|bg|border)-(?:red|orange|amber|yellow|green|emerald|blue|sky|slate|gray|zinc|neutral)-\d{2,3}/;

describe('Badge', () => {
  it('is a pill in the mono label role, in each of its five tones', () => {
    expect(BADGE_TONES).toEqual(['neutral', 'ember', 'green', 'amber', 'blue']);
    for (const tone of BADGE_TONES) {
      const classes = classesOf(renderToStaticMarkup(<Badge tone={tone}>Status</Badge>));
      expect(classes, tone).toEqual(expect.arrayContaining(['rounded-full', 'text-label-12-mono']));
      // tones come from the theme, never the raw palette, and draw no border
      expect(classes.filter((c) => PALETTE.test(c)), tone).toEqual([]);
      expect(classes.filter((c) => /^border(-|$)/.test(c)), tone).toEqual([]);
    }
  });

  it('maps paper status to tone: presented green, preprint blue, under review amber, in preparation neutral', () => {
    expect(PAPER_STATUS_TONE).toEqual({
      Presented: 'green',
      Preprint: 'blue',
      Submitted: 'amber',
      'In preparation': 'neutral',
      Synthesis: 'neutral',
      'Pre-execution': 'neutral',
    });
    expect(renderToStaticMarkup(<Badge tone={PAPER_STATUS_TONE.Presented}>Presented</Badge>)).toContain('text-status-green');
  });

  it('can lead with a status dot, hidden from assistive tech', () => {
    const markup = renderToStaticMarkup(
      <Badge tone="amber" dot>
        Under review
      </Badge>,
    );
    expect(markup).toMatch(/<span aria-hidden="true" class="[^"]*rounded-full[^"]*bg-current/);
    expect(markup).toContain('Under review');
  });
});
