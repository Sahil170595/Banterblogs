import { NextResponse } from 'next/server';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { readReportMeta, assertCatalogComplete } from '@/lib/reports/meta';
import {
  classifyReportSlug,
  extractTRNumber,
  reportSortRank,
  assertPhaseSlugsResolved,
  type ReportCategory,
} from '@/lib/reports/phases';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

/**
 * Machine-readable manifest of every report on chimeraforge.vercel.app.
 *
 * Replaces the stale hand-maintained `PublishReady/index.json` that was
 * deleted in commit 7f95ff1. Build-time auto-generated from `discoverReports()`
 * + `REPORT_CATALOG`, then served as a static asset. NOT live: new files
 * added without a redeploy will NOT appear until the next `next build`
 * because `discoverReports()`'s module-level cache + `force-static` together
 * pin this to a build-time snapshot.
 *
 * Build-time invariants enforced here (any violation throws during `next build`):
 *   - Every PHASE_DEFINITIONS slug-pinned report (Phase 0) resolves on disk.
 *   - Every discovered slug has a REPORT_CATALOG entry (no junk titles).
 *   - REPORTS.COUNT === live count of TR-numbered + Phase-0 reports.
 *
 * Performance: `force-static` + ISR revalidate. The route runs ONCE at build,
 * the response is cached as static JSON, and subsequent crawler hits are pure
 * CDN reads with zero filesystem touch. locator.ts's module-level
 * `cachedDiscover` is shared with the rest of the build, so this adds no
 * extra readdirSync calls.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 900; // matches /reports ISR window

const BASE = 'https://chimeraforge.vercel.app';

// Synthetic entries — public report routes whose source markdown lives OUTSIDE
// PublishReady/reports/ (so `discoverReports()` doesn't see them) but which
// must appear in the manifest for crawlers/LLM consumers.
const SYNTHETIC_REPORTS: { slug: string; sourcePath: string }[] = [
  { slug: 'compendium', sourcePath: 'PublishReady/research_compendium.md' },
];

interface ManifestEntry {
  slug: string;
  title: string;
  description: string | null;
  category: ReportCategory;
  tr_number: number | null;
  url: string;
}

export async function GET() {
  const discovered = discoverReportsUnique();
  const discoveredSlugs = new Set(discovered.map((d) => d.slug));

  // Build-time invariants — these throw during `next build` if violated.
  assertPhaseSlugsResolved(discoveredSlugs);
  const allCatalogSlugs = new Set<string>(discoveredSlugs);
  for (const s of SYNTHETIC_REPORTS) allCatalogSlugs.add(s.slug);
  assertCatalogComplete(allCatalogSlugs);

  const fromDisk: ManifestEntry[] = discovered.map((entry) => {
    const meta = readReportMeta(entry.slug);
    return {
      slug: entry.slug,
      title: meta?.title ?? entry.label,
      description: meta?.description ?? null,
      category: classifyReportSlug(entry.slug),
      tr_number: extractTRNumber(entry.slug),
      url: `${BASE}/reports/${entry.slug}`,
    };
  });

  const synthetic: ManifestEntry[] = SYNTHETIC_REPORTS.map((s) => {
    const meta = readReportMeta(s.slug);
    return {
      slug: s.slug,
      title: meta?.title ?? s.slug,
      description: meta?.description ?? null,
      category: classifyReportSlug(s.slug),
      tr_number: extractTRNumber(s.slug),
      url: `${BASE}/reports/${s.slug}`,
    };
  });

  const reports = [...fromDisk, ...synthetic].sort(
    (a, b) => reportSortRank(a.slug) - reportSortRank(b.slug) || a.slug.localeCompare(b.slug),
  );

  // Counts split: TR-numbered phases (phase1..phase6) vs Phase 0 pre-TR baselines
  // vs conclusive synthesis. Keeps machine consumers from conflating Phase 0
  // benchmarks with the TR108+ program (the two are catalogued separately for
  // a reason — phase0 has hasWhitepaper:false and is filtered out of homepage cards).
  const phase0Count = reports.filter((r) => r.category === 'phase0').length;
  const trCount = reports.filter(
    (r) => r.category !== 'phase0' && typeof r.category === 'string' && r.category.startsWith('phase'),
  ).length;
  const conclusiveCount = reports.filter((r) =>
    ['conclusive', 'whitepaper', 'appendix'].includes(r.category),
  ).length;
  const compendiumCount = reports.filter((r) => r.category === 'compendium').length;
  const technicalReportsTotal = trCount + phase0Count; // sums to REPORTS.COUNT

  // Reconciliation: the static REPORTS.COUNT in constants.ts MUST equal the
  // live filtered count. Throw at build time on drift so we never ship a
  // manifest where headline.technical_report_count disagrees with the
  // counts block of the same JSON document.
  if (REPORTS.COUNT !== technicalReportsTotal) {
    throw new Error(
      `[reports.json] REPORTS.COUNT (${REPORTS.COUNT}) != live count of TR-numbered (${trCount}) + Phase 0 (${phase0Count}) = ${technicalReportsTotal}. ` +
        `Bump constants.ts REPORTS.COUNT to ${technicalReportsTotal} or fix the discovered report set.`,
    );
  }

  const manifest = {
    version: '2.1.0',
    source: 'build-time auto-generated from discoverReports() + REPORT_CATALOG',
    headline: {
      measurements: MEASUREMENTS.DISPLAY,
      measurements_short: MEASUREMENTS.SHORT,
      technical_report_count: REPORTS.COUNT,
    },
    counts: {
      total: reports.length,
      technical_reports: technicalReportsTotal,
      technical_reports_tr_numbered: trCount,
      phase0_pre_tr_baselines: phase0Count,
      conclusive_and_synthesis: conclusiveCount,
      compendium: compendiumCount,
      other: reports.length - technicalReportsTotal - conclusiveCount - compendiumCount,
    },
    base_url: BASE,
    reports,
  };

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
    },
  });
}
