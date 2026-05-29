import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ReportMarkdown } from '@/components/reports/ReportMarkdown';
import { ReportTocMobile, ReportTocSidebar } from '@/components/reports/ReportToc';
import { loadReportData } from '@/lib/reports/loadPublishReady';
import { readReportMeta } from '@/lib/reports/meta';
import { discoverReportsUnique, toHumanTitle } from '@/lib/reports/locator';
import { classifyReportSlug, reportSortRank } from '@/lib/reports/phases';
import { extractHeadings } from '@/lib/episodes';
import { reportJsonLd } from './schema.org.json';

// Visual badge styling for each category surfaced by classifyReportSlug.
// Lives next to the JSX consumer (this page) but keys off the canonical
// classifier so adding a category in phases.ts auto-fails type-check here.
const REPORT_TYPE_BADGE: Record<ReturnType<typeof classifyReportSlug>, { label: string; color: string }> = {
  whitepaper: { label: 'Whitepaper', color: 'text-primary border-primary/40 bg-primary/10' },
  appendix: { label: 'Appendices', color: 'text-muted-foreground border-border/60 bg-muted/30' },
  conclusive: { label: 'Conclusive Report', color: 'text-accent border-accent/40 bg-accent/10' },
  compendium: { label: 'Compendium', color: 'text-primary border-primary/40 bg-primary/10' },
  phase0: { label: 'Pre-TR Baseline', color: 'text-muted-foreground border-border/60 bg-muted/30' },
  phase1: { label: 'Technical Report', color: 'text-muted-foreground border-border/60 bg-muted/30' },
  phase2: { label: 'Technical Report', color: 'text-muted-foreground border-border/60 bg-muted/30' },
  phase3: { label: 'Technical Report', color: 'text-muted-foreground border-border/60 bg-muted/30' },
  phase4: { label: 'Technical Report', color: 'text-muted-foreground border-border/60 bg-muted/30' },
  phase5: { label: 'Technical Report', color: 'text-muted-foreground border-border/60 bg-muted/30' },
  phase6: { label: 'Technical Report', color: 'text-muted-foreground border-border/60 bg-muted/30' },
  other: { label: 'Report', color: 'text-muted-foreground border-border/60 bg-muted/30' },
};

export const runtime = 'nodejs';
export const revalidate = 900;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const meta = readReportMeta(id);
  const title = meta?.title ?? toHumanTitle(id);
  const description = meta?.description ?? `Technical report: ${title}`;
  return {
    title,
    description,
    openGraph: {
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

  const { id } = await params;
  const report = await loadReportData(id);
  if (!report) {
    notFound();
  }

  const meta = readReportMeta(id) || { title: id.replace(/[-_]/g, ' ') };
  const headings = report.sections.flatMap((s) => extractHeadings(s.markdown));
  const reportType = REPORT_TYPE_BADGE[classifyReportSlug(id)];

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
    <div className="container py-16">
      {/* ── Header ── */}
      <div className="mb-8">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Research Archive
        </Link>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${reportType.color}`}>
            {reportType.label}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{meta.title}</h1>
        {meta.description && (
          <p className="text-lg text-muted-foreground leading-relaxed">{meta.description}</p>
        )}

        <div className="mt-6 h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd({ id, title: meta.title!, description: meta.description })) }} />

      <ReportTocMobile headings={headings} />

      {/* ── Content + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-12">
        <ReportMarkdown sections={report.sections} />
        <ReportTocSidebar headings={headings} />
      </div>

      {/* ── Navigation ── */}
      {(prevSlug || nextSlug) && (
        <nav className="mt-16 pt-8 border-t border-border/30 grid gap-4 sm:grid-cols-2" aria-label="Report navigation">
          {prevSlug ? (
            <Link
              href={`/reports/${prevSlug}`}
              className="group p-5 rounded-xl border border-border/40 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <ArrowLeft className="h-3 w-3" />
                Previous
              </div>
              <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {prevMeta?.title ?? toHumanTitle(prevSlug)}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {nextSlug && (
            <Link
              href={`/reports/${nextSlug}`}
              className="group p-5 rounded-xl border border-border/40 hover:border-primary/30 transition-colors text-right"
            >
              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mb-2">
                Next
                <ArrowRight className="h-3 w-3" />
              </div>
              <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {nextMeta?.title ?? toHumanTitle(nextSlug)}
              </div>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
