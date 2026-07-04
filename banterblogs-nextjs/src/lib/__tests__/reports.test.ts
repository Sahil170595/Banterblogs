import { describe, it, expect } from 'vitest';
import {
    PHASE_DEFINITIONS,
    extractTRNumber,
    phaseForTR,
    classifyReportSlug,
    reportSortRank,
    phaseWhitepaperSlug,
    phaseRangeLabel,
    assertPhaseSlugsResolved,
} from '../reports/phases';
import { discoverReports, discoverReportsUnique } from '../reports/locator';
import { assertCatalogComplete } from '../reports/meta';
import { REPORTS } from '../constants';

describe('phases.ts', () => {
    describe('extractTRNumber', () => {
        it('extracts from canonical technical-report slugs', () => {
            expect(extractTRNumber('technical-report-134')).toBe(134);
            expect(extractTRNumber('technical-report-164-v3')).toBe(164);
            expect(extractTRNumber('technical-report-117-multi-agent')).toBe(117);
        });

        it('extracts from short tr slugs', () => {
            expect(extractTRNumber('tr108')).toBe(108);
            expect(extractTRNumber('some-tr142-thing')).toBe(142);
        });

        it('returns null for non-TR slugs', () => {
            expect(extractTRNumber('gemma3')).toBeNull();
            expect(extractTRNumber('performance-deep-dive')).toBeNull();
            expect(extractTRNumber('compendium')).toBeNull();
        });
    });

    describe('phaseForTR range integrity', () => {
        it('covers every shipped TR number without overlap', () => {
            // Shipped TR numbers as of 2026-07: 108-149, 152, 155-168 map to a phase.
            const expectations: Array<[number, string | null]> = [
                [107, null],
                [108, 'phase1'], [116, 'phase1'],
                [117, 'phase2'], [122, 'phase2'],
                [123, 'phase3'], [133, 'phase3'],
                [134, 'phase4'], [137, 'phase4'],
                [138, 'phase5'], [143, 'phase5'],
                [144, 'phase6'], [152, 'phase6'],
                [153, null], [154, null], // no TR153/154 shipped; gap is deliberate
                [155, 'phase7'], [163, 'phase7'],
                [164, 'phase8'], [165, 'phase8'],
                [166, 'phase9'], [168, 'phase9'], [999, 'phase9'], // phase9 is the catch-all
            ];
            for (const [tr, phase] of expectations) {
                expect(phaseForTR(tr), `TR${tr}`).toBe(phase);
            }
        });

        it('has no overlapping TR ranges across definitions', () => {
            const ranged = PHASE_DEFINITIONS.filter((p) => p.minTR !== undefined);
            for (let i = 0; i < ranged.length; i++) {
                for (let j = i + 1; j < ranged.length; j++) {
                    const a = ranged[i];
                    const b = ranged[j];
                    const overlap = a.minTR! <= b.maxTR! && b.minTR! <= a.maxTR!;
                    expect(overlap, `${a.key} overlaps ${b.key}`).toBe(false);
                }
            }
        });
    });

    describe('classifyReportSlug', () => {
        it('gives synthesis-doc keywords precedence over embedded phase keys', () => {
            expect(classifyReportSlug('technical-report-conclusive-phase1-whitepaper')).toBe('whitepaper');
            expect(classifyReportSlug('technical-report-conclusive-phase3')).toBe('conclusive');
            expect(classifyReportSlug('technical-report-conclusive-phase1-appendices')).toBe('appendix');
            expect(classifyReportSlug('compendium')).toBe('compendium');
        });

        it('pins Phase 0 baselines by slug', () => {
            expect(classifyReportSlug('gemma3')).toBe('phase0');
            expect(classifyReportSlug('ollama-benchmark-report')).toBe('phase0');
            expect(classifyReportSlug('performance-deep-dive')).toBe('phase0');
        });

        it('classifies TR slugs into phases and unknowns into other', () => {
            expect(classifyReportSlug('technical-report-108')).toBe('phase1');
            expect(classifyReportSlug('technical-report-164-v5')).toBe('phase8');
            expect(classifyReportSlug('technical-report-167')).toBe('phase9');
            expect(classifyReportSlug('some-random-doc')).toBe('other');
        });
    });

    describe('reportSortRank', () => {
        it('orders phase0 < TR-numbered < synthesis < compendium < other', () => {
            const phase0 = reportSortRank('gemma3');
            const tr = reportSortRank('technical-report-108');
            const synthesis = reportSortRank('technical-report-conclusive-phase1-whitepaper');
            const compendium = reportSortRank('compendium');
            const other = reportSortRank('some-random-doc');
            expect(phase0).toBeLessThan(tr);
            expect(tr).toBeLessThan(synthesis);
            expect(synthesis).toBeLessThan(compendium);
            expect(compendium).toBeLessThan(other);
        });

        it('orders TR reports by TR number', () => {
            expect(reportSortRank('technical-report-108')).toBeLessThan(reportSortRank('technical-report-167'));
        });
    });

    describe('labels and whitepaper slugs', () => {
        it('builds the conclusive whitepaper slug convention', () => {
            expect(phaseWhitepaperSlug('phase1')).toBe('technical-report-conclusive-phase1-whitepaper');
        });

        it('renders open-ended ranges with a plus', () => {
            expect(phaseRangeLabel('phase9')).toBe('TR166+');
            expect(phaseRangeLabel('phase1')).toBe('TR108–TR116');
            expect(phaseRangeLabel('phase0')).toBe(''); // slug-pinned phase has no TR range
        });
    });

    describe('assertPhaseSlugsResolved', () => {
        it('throws when a pinned slug is missing from disk', () => {
            expect(() => assertPhaseSlugsResolved(new Set(['gemma3']))).toThrow(/don't exist on disk/);
        });

        it('passes when all pinned slugs resolve', () => {
            const pinned = new Set(PHASE_DEFINITIONS.flatMap((p) => p.slugs ?? []));
            expect(() => assertPhaseSlugsResolved(pinned)).not.toThrow();
        });
    });
});

// Integration against the real PublishReady/reports/ tree — the same invariants
// reports.json enforces at build time, surfaced here so `npm test` catches
// drift in seconds instead of at the end of a full `next build`.
describe('reports pipeline integration', () => {
    const unique = discoverReportsUnique();
    const slugs = new Set(unique.map((e) => e.slug));

    it('discovers reports from PublishReady/reports/', () => {
        expect(unique.length).toBeGreaterThan(0);
    });

    it('produces unique, normalized slugs', () => {
        expect(slugs.size).toBe(unique.length);
        for (const s of slugs) {
            expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        }
    });

    it('resolves every slug-pinned phase report on disk', () => {
        expect(() => assertPhaseSlugsResolved(slugs)).not.toThrow();
    });

    it('has a catalog entry for every discovered report (no junk titles)', () => {
        const withSynthetic = new Set(slugs);
        withSynthetic.add('compendium'); // synthetic manifest entry, source outside reports/
        expect(() => assertCatalogComplete(withSynthetic)).not.toThrow();
    });

    it('matches the hard-coded headline REPORTS.COUNT', () => {
        // Mirrors the reports.json counting rule: TR-numbered phase reports + Phase 0 baselines.
        const technical = [...slugs].filter((s) => {
            const cat = classifyReportSlug(s);
            return typeof cat === 'string' && cat.startsWith('phase');
        });
        expect(technical.length).toBe(REPORTS.COUNT);
    });

    it('prefers directory entries when a slug exists as both file and directory', () => {
        const bySlug = new Map<string, number>();
        for (const e of discoverReports()) {
            bySlug.set(e.slug, (bySlug.get(e.slug) ?? 0) + 1);
        }
        for (const [slug, count] of bySlug) {
            if (count > 1) {
                const kept = unique.find((e) => e.slug === slug);
                expect(kept?.kind, `${slug} should keep the directory entry`).toBe('directory');
            }
        }
    });
});
