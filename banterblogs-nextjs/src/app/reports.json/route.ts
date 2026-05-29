import { NextResponse } from 'next/server';
import { discoverReports } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';
import { extractTRNumber, phaseForTR, phaseForSlug } from '@/lib/reports/phases';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

/**
 * Machine-readable manifest of every report on chimeraforge.vercel.app.
 *
 * Replaces the stale hand-maintained `PublishReady/index.json` that was
 * deleted in commit 7f95ff1. Auto-generated from `discoverReports()` +
 * `REPORT_CATALOG`, so it can never drift from the actual on-disk reports.
 *
 * Performance: `force-static` + ISR revalidate. The route runs ONCE at build
 * (during `next build`), the response is cached as static HTML/JSON, and
 * subsequent crawler hits are pure CDN reads with zero filesystem touch.
 * locator.ts's module-level `cachedDiscover` is shared with the rest of the
 * build, so this adds no extra readdirSync calls.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 900; // matches /reports ISR window

const BASE = 'https://chimeraforge.vercel.app';

function classify(slug: string): string {
  const lower = slug.toLowerCase();
  if (lower.includes('whitepaper')) return 'whitepaper';
  if (lower.includes('appendix') || lower.includes('appendices')) return 'appendix';
  if (lower.includes('conclusive')) return 'conclusive';
  // Slug-pinned phases (Phase 0 baselines) first — these predate TR numbering.
  const pinned = phaseForSlug(slug);
  if (pinned) return pinned;
  const tr = extractTRNumber(slug);
  if (tr !== null) return phaseForTR(tr) ?? 'other';
  return 'other';
}

export async function GET() {
  const entries = discoverReports();
  const seen = new Set<string>();
  const reports = entries
    .filter((e) => (seen.has(e.slug) ? false : seen.add(e.slug)))
    .map((entry) => {
      const meta = readReportMeta(entry.slug);
      const tr = extractTRNumber(entry.slug);
      return {
        slug: entry.slug,
        title: meta?.title ?? entry.label,
        description: meta?.description ?? null,
        category: classify(entry.slug),
        tr_number: tr,
        url: `${BASE}/reports/${entry.slug}`,
      };
    })
    .sort((a, b) => {
      // Technical reports first, in TR-number order; then conclusive/whitepaper/appendix; then other.
      const rank = (r: typeof a) =>
        r.category.startsWith('phase') && r.tr_number !== null
          ? r.tr_number
          : r.category === 'conclusive' || r.category === 'whitepaper' || r.category === 'appendix'
          ? 10_000
          : 20_000;
      return rank(a) - rank(b) || a.slug.localeCompare(b.slug);
    });

  const technicalReportCount = reports.filter((r) => r.category.startsWith('phase')).length;
  const conclusiveCount = reports.filter((r) =>
    ['conclusive', 'whitepaper', 'appendix'].includes(r.category),
  ).length;

  const manifest = {
    version: '2.0.0',
    source: 'build-time auto-generated from discoverReports() + REPORT_CATALOG',
    headline: {
      measurements: MEASUREMENTS.DISPLAY,
      measurements_short: MEASUREMENTS.SHORT,
      technical_report_count: REPORTS.COUNT,
    },
    counts: {
      total: reports.length,
      technical_reports: technicalReportCount,
      conclusive_and_synthesis: conclusiveCount,
      other: reports.length - technicalReportCount - conclusiveCount,
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
