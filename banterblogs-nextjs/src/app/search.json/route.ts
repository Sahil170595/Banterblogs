import { NextResponse } from 'next/server';
import { getAllEpisodes } from '@/lib/episodes';
import { discoverReportsUnique, toHumanTitle } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';
import { PHASE_DEFINITIONS, classifyReportSlug, reportSortRank } from '@/lib/reports/phases';
import { toPlainText, type SearchEntry } from '@/lib/search';
import { TOOLS } from '@/lib/tools';

// Site search index: every report page, both CLIs, then the episode archive.
// Built once at `next build` (everything it reads ships with the deployment);
// SearchDialog fetches it on first open. Episodes carry only slug and title.
export const runtime = 'nodejs';
export const dynamic = 'force-static';

// Report pages whose markdown lives outside PublishReady/reports/ (as in reports.json).
const SYNTHETIC_REPORT_SLUGS = ['compendium'];
// Synthesis documents name their phase in the slug: ...-conclusive-phase5-whitepaper
const PHASE_IN_SLUG = /\bphase\d+\b/;
// Phase labels end with the TR range: "Phase 5 — Attack Surface (TR138–TR143)".
const PHASE_RANGE_SUFFIX = /\s*\([^)]*\)$/;

function reportPhase(slug: string): string | undefined {
  const category = classifyReportSlug(slug);
  const key = PHASE_DEFINITIONS.some((p) => p.key === category) ? category : PHASE_IN_SLUG.exec(slug)?.[0];
  return PHASE_DEFINITIONS.find((p) => p.key === key)?.label.replace(PHASE_RANGE_SUFFIX, '');
}

export async function GET() {
  const reportSlugs = [...discoverReportsUnique().map((entry) => entry.slug), ...SYNTHETIC_REPORT_SLUGS].sort(
    (a, b) => reportSortRank(a) - reportSortRank(b) || a.localeCompare(b),
  );
  const reports: SearchEntry[] = reportSlugs.map((slug) => {
    const meta = readReportMeta(slug);
    return {
      type: 'report',
      slug,
      href: `/reports/${slug}`,
      title: toPlainText(meta?.title ?? toHumanTitle(slug)),
      description: meta?.description ? toPlainText(meta.description) : undefined,
      phase: reportPhase(slug),
    };
  });

  const tools: SearchEntry[] = TOOLS.map((tool) => ({
    type: 'tool',
    slug: tool.slug,
    href: `/tools/${tool.slug}`,
    title: tool.name,
    description: toPlainText(`${tool.tagline}. ${tool.summary}`),
  }));

  const episodes: SearchEntry[] = (await getAllEpisodes()).map((episode) => ({
    type: 'episode',
    slug: episode.slug,
    href: `/episodes/${episode.slug}`,
    title: toPlainText(episode.title),
  }));

  return NextResponse.json([...reports, ...tools, ...episodes]);
}
