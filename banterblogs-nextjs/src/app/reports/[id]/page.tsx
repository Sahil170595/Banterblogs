import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ReportDetails, ReportHero, ReportMeta } from '@/components/reports/ReportHead';
import { ReportMarkdown } from '@/components/reports/ReportMarkdown';
import { ReportProgress } from '@/components/reports/ReportProgress';
import { ReportTocMobile, ReportTocSidebar } from '@/components/reports/ReportToc';
import { ReportEnd } from '@/components/reports/reportEnd';
import { NAV_BACK, NAV_FORWARD } from '@/components/reports/ReportTransitions';
import { reportIdentity } from '@/components/reports/reportIdentity';
import { computeContentStats } from '@/lib/episodes';
import { loadReportData } from '@/lib/reports/loadPublishReady';
import { readReportMeta } from '@/lib/reports/meta';
import { discoverReportsUnique, findReportFolder, toHumanTitle } from '@/lib/reports/locator';
import { reportSortRank } from '@/lib/reports/phases';
import { reportJsonLd } from './schema.org.json';

export const runtime = 'nodejs';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const meta = readReportMeta(id);
  const title = meta?.title ?? toHumanTitle(id);
  const description = meta?.description ?? `Technical report: ${title}`;
  return {
    title,
    description,
    openGraph: {
      images: ['/opengraph-image.png'],
      title: `${title} | Chimeraforge`,
      description,
    },
    twitter: {
      title: `${title} | Chimeraforge`,
      description,
    },
  };
}

export function generateStaticParams() {
  return discoverReportsUnique().map((entry) => ({ id: entry.slug }));
}


export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const reportsEnabled = process.env.REPORTS_ENABLED !== 'false';
  if (!reportsEnabled) {
    notFound();
  }

  const { id: rawId } = await params;
  // Canonicalize slug aliases (e.g. /reports/Technical_Report_134): without this,
  // aliases render as duplicate-content 200s with degraded metadata and a broken
  // prev/next index. Redirect once to the canonical slug instead.
  const location = findReportFolder(rawId);
  if (!location) {
    notFound();
  }
  const id = location.slug;
  if (id !== rawId) {
    permanentRedirect(`/reports/${id}`);
  }

  const report = await loadReportData(id);
  if (!report) {
    notFound();
  }

  const meta = readReportMeta(id) || { title: id.replace(/[-_]/g, ' ') };
  const title = meta.title ?? toHumanTitle(id);
  // the TR label and phase move out of the title into the breadcrumb and meta row
  const { heading, label, phase } = reportIdentity(id, title);
  const headings = report.sections.flatMap((s) => s.headings);
  // the primary document's own title block, folded out of the body by the pipeline
  const frontMatter = report.sections[0]?.frontMatter ?? null;
  const readingMinutes = computeContentStats(report.sections.map((s) => s.html).join('\n')).readingTime;

  // Prev/next nav: sorted by reportSortRank (Phase 0 baselines first as they
  // chronologically predate TR108 → TR108..TR152 → conclusive synthesis docs).
  // Shared with /reports.json so the manifest and the in-page nav agree on order.
  const allSlugs = discoverReportsUnique()
    .sort((a, b) => reportSortRank(a.slug) - reportSortRank(b.slug) || a.slug.localeCompare(b.slug))
    .map((r) => r.slug);
  const currentIndex = allSlugs.indexOf(id);
  const prevSlug = currentIndex > 0 ? allSlugs[currentIndex - 1] : null;
  const nextSlug = currentIndex >= 0 && currentIndex < allSlugs.length - 1 ? allSlugs[currentIndex + 1] : null;
  const prevMeta = prevSlug ? readReportMeta(prevSlug) : null;
  const nextMeta = nextSlug ? readReportMeta(nextSlug) : null;

  return (
    <div className="container pb-24 pt-8 md:pt-10">
      <ReportProgress />

      {/* ── Head: where it sits, what it is, how long it takes ── */}
      <div className="report-head">
        <nav aria-label="Breadcrumb">
          <ol className="report-crumbs">
            <li>
              <Link href="/reports" transitionTypes={[NAV_BACK]}>
                Research archive
              </Link>
            </li>
            {phase && (
              <li>
                <Link href={`/reports?phase=${phase.key}`} transitionTypes={[NAV_BACK]}>
                  Phase {phase.number} · {phase.name}
                </Link>
              </li>
            )}
          </ol>
        </nav>

        <h1 className="report-title">{heading}</h1>
        {meta.description && <p className="report-dek">{meta.description}</p>}
        <ReportMeta label={label} phaseNumber={phase?.number ?? null} readingMinutes={readingMinutes} date={frontMatter?.date ?? null} />
        {frontMatter && <ReportDetails frontMatter={frontMatter} />}
      </div>

      <ReportHero slug={id} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd({ id, title, description: meta.description })) }} />

      <ReportTocMobile headings={headings} />

      {/* ── Content + Sidebar ── */}
      <div className="mt-8 grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <ReportMarkdown sections={report.sections} />
        <ReportTocSidebar headings={headings} />
      </div>
      <ReportEnd />

      {/* ── Navigation ── */}
      {(prevSlug || nextSlug) && (
        <nav className="report-pager mt-20 grid gap-4 border-t border-border/40 pt-8 sm:grid-cols-2" aria-label="Report navigation">
          {prevSlug ? (
            <Link
              href={`/reports/${prevSlug}`}
              transitionTypes={[NAV_BACK]}
              className="block rounded-xl p-5 transition-colors duration-fast ease-standard hover:bg-card/70"
            >
              <div className="report-pager-label">
                <ArrowLeft aria-hidden="true" className="h-3 w-3" />
                Previous
              </div>
              <div className="report-pager-title line-clamp-1">{prevMeta?.title ?? toHumanTitle(prevSlug)}</div>
            </Link>
          ) : (
            <div />
          )}
          {nextSlug && (
            <Link
              href={`/reports/${nextSlug}`}
              transitionTypes={[NAV_FORWARD]}
              className="block rounded-xl p-5 text-right transition-colors duration-fast ease-standard hover:bg-card/70"
            >
              <div className="report-pager-label justify-end">
                Next
                <ArrowRight aria-hidden="true" className="h-3 w-3" />
              </div>
              <div className="report-pager-title line-clamp-1">{nextMeta?.title ?? toHumanTitle(nextSlug)}</div>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
