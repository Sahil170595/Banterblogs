import { Hero } from '@/components/Hero';
import { SystemsShowcase } from '@/components/SystemsShowcase';
import { ResearchSpotlight, type ReportTeaser } from '@/components/ResearchSpotlight';
import { RoadmapRail } from '@/components/RoadmapRail';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';
import { extractTRNumber, classifyReportSlug } from '@/lib/reports/phases';
import ErrorBoundary from '@/components/ErrorBoundary';

export default async function HomePage() {
  // Homepage leads with research: the latest technical reports (TR-numbered, newest
  // first, deduped by TR number so the TR164 V3/V4/V5 family shows once). Episodes
  // moved off the landing page — the /episodes archive still exists.
  let latestReports: ReportTeaser[] = [];

  try {
    const trEntries = discoverReportsUnique()
      .map((d) => ({ slug: d.slug, tr: extractTRNumber(d.slug), cat: classifyReportSlug(d.slug) }))
      .filter((d) => d.tr !== null && d.cat.startsWith('phase') && d.cat !== 'phase0')
      .sort((a, b) => (b.tr ?? 0) - (a.tr ?? 0) || b.slug.localeCompare(a.slug));

    const seen = new Set<number>();
    for (const entry of trEntries) {
      const tr = entry.tr ?? 0;
      if (seen.has(tr)) continue;
      seen.add(tr);
      const meta = readReportMeta(entry.slug);
      latestReports.push({
        slug: entry.slug,
        title: meta?.title ?? entry.slug,
        description: meta?.description ?? '',
      });
      if (latestReports.length >= 6) break;
    }
  } catch (error) {
    console.error('Error loading reports for homepage:', error);
  }

  const latestReport = latestReports[0];

  return (
    <ErrorBoundary>
      <div className="flex flex-col">
        <Hero latestReport={latestReport} />
        <SystemsShowcase />
        <ResearchSpotlight reports={latestReports} />
        <RoadmapRail />
      </div>
    </ErrorBoundary>
  );
}
