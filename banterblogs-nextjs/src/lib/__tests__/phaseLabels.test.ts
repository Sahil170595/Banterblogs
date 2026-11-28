// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { discoverReportsUnique } from '../reports/locator';
import { PHASE_DEFINITIONS, classifyReportSlug, extractTRNumber, formatTRRuns, phasePublishedLabel } from '../reports/phases';

// The archive's phase tabs carried each phase's reserved TR range. Phase 7
// reserves TR155–TR163 and has published one report, Phase 9 reserves
// TR166–TR168 and has published one: a nine-number range beside a count of 1
// read as a broken archive. A tab now names the TR numbers actually on disk.

// "TR144–TR149+TR152" -> [144, 145, 146, 147, 148, 149, 152]
function numbersNamed(label: string): number[] {
  const range = /\(([^)]*)\)$/.exec(label)?.[1];
  if (!range) return [];
  return range.split('+').flatMap((run) => {
    const [first, last = first] = [...run.matchAll(/TR(\d+)/g)].map((m) => Number(m[1]));
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  });
}

describe('formatTRRuns', () => {
  it('joins consecutive numbers into a range and breaks at a gap', () => {
    expect(formatTRRuns([144, 145, 146, 147, 148, 149, 152])).toBe('TR144–TR149+TR152');
    expect(formatTRRuns([108, 109, 110])).toBe('TR108–TR110');
    expect(formatTRRuns([155, 157, 163])).toBe('TR155+TR157+TR163');
  });

  it('names a lone report by its own number', () => {
    expect(formatTRRuns([163])).toBe('TR163');
  });

  it('counts a number once however many versions carry it, in order', () => {
    expect(formatTRRuns([165, 164, 164, 164, 164])).toBe('TR164–TR165');
    expect(formatTRRuns([])).toBe('');
  });
});

describe('phasePublishedLabel', () => {
  it('names the one report a thin phase has published, not the range it reserves', () => {
    expect(phasePublishedLabel('phase7', ['technical-report-163'])).toBe('Phase 7 — Mitigation Turn (TR163)');
    expect(phasePublishedLabel('phase9', ['technical-report-167'])).toBe('Phase 9 — Predictive-Validity Follow-ups (TR167)');
  });

  it('keeps a complete phase reading as it did', () => {
    const phase1 = Array.from({ length: 9 }, (_, i) => `technical-report-${108 + i}`);
    expect(phasePublishedLabel('phase1', phase1)).toBe(PHASE_DEFINITIONS.find((p) => p.key === 'phase1')?.label);
    const phase6 = [144, 145, 146, 147, 148, 149, 152].map((tr) => `technical-report-${tr}`);
    expect(phasePublishedLabel('phase6', phase6)).toBe(PHASE_DEFINITIONS.find((p) => p.key === 'phase6')?.label);
  });

  it('counts only the reports that belong to the phase', () => {
    const mixed = ['technical-report-163', 'technical-report-164', 'technical-report-conclusive-phase7-whitepaper', 'gemma3'];
    expect(phasePublishedLabel('phase7', mixed)).toBe('Phase 7 — Mitigation Turn (TR163)');
  });

  it('leaves a phase without TR numbers its plain label, and knows no label for a key that is no phase', () => {
    expect(phasePublishedLabel('phase0', ['gemma3', 'ollama-benchmark-report'])).toBe('Phase 0 — Pre-TR Baselines');
    expect(phasePublishedLabel('phase7', [])).toBe('Phase 7 — Mitigation Turn');
    expect(phasePublishedLabel('other', ['some-random-doc'])).toBeNull();
  });
});

// against the real PublishReady/reports/ tree
describe('phase tab labels on the published archive', () => {
  const slugs = discoverReportsUnique().map((entry) => entry.slug);
  const published = (key: string) =>
    slugs.filter((slug) => classifyReportSlug(slug) === key).map(extractTRNumber).filter((tr): tr is number => tr !== null);

  it.each(PHASE_DEFINITIONS.map((p) => [p.key]))('%s names exactly the TR numbers it has published', (key) => {
    const label = phasePublishedLabel(key, slugs);
    expect(label).not.toBeNull();
    expect(numbersNamed(label!)).toEqual([...new Set(published(key))].sort((a, b) => a - b));
  });

  it('never names more TR numbers than the phase has reports', () => {
    for (const { key } of PHASE_DEFINITIONS) {
      const reports = slugs.filter((slug) => classifyReportSlug(slug) === key).length;
      expect(numbersNamed(phasePublishedLabel(key, slugs)!).length, key).toBeLessThanOrEqual(reports);
    }
  });

  // the reader these tests lean on: a reserved range must expand to every number in it
  it('reads a label back into the numbers it names', () => {
    expect(numbersNamed('Phase 7 — Mitigation Turn (TR155–TR163)')).toHaveLength(9);
    expect(numbersNamed('Phase 6 — Serving-State Safety Certification (TR144–TR149+TR152)')).toEqual([144, 145, 146, 147, 148, 149, 152]);
    expect(numbersNamed('Phase 0 — Pre-TR Baselines')).toEqual([]);
  });
});
