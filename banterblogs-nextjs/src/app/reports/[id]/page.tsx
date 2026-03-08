import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ReportMarkdown } from '@/components/reports/ReportMarkdown';
import { ReportTocMobile, ReportTocSidebar } from '@/components/reports/ReportToc';
import { loadReportData } from '@/lib/reports/loadPublishReady';
import { readReportMeta } from '@/lib/reports/meta';
import { discoverReports, toHumanTitle } from '@/lib/reports/locator';
import { extractHeadings } from '@/lib/episodes';
import { reportJsonLd } from './schema.org.json';

export const runtime = 'nodejs';
export const revalidate = 900;

export function generateStaticParams() {
  const seen = new Set<string>();
  return discoverReports()
    .filter((entry) => {
      if (seen.has(entry.slug)) return false;
      seen.add(entry.slug);
      return true;
    })
    .map((entry) => ({ id: entry.slug }));
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
  const sourceLabel = meta.source ?? report.source;

  const headings = report.sections.flatMap((s) => extractHeadings(s.markdown));

  // Prev/next navigation
  const allSlugs = [...new Set(discoverReports().map((r) => r.slug))];
  const currentIndex = allSlugs.indexOf(id);
  const prevReport = currentIndex > 0 ? allSlugs[currentIndex - 1] : null;
  const nextReport = currentIndex >= 0 && currentIndex < allSlugs.length - 1 ? allSlugs[currentIndex + 1] : null;

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-10 p-8 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <span className="signal-pill">Chimeraforge Report</span>
            <h1 className="text-3xl md:text-4xl font-bold">{meta.title}</h1>
            {meta.description && <p className="text-muted-foreground max-w-2xl">{meta.description}</p>}
          </div>
          <div className="min-w-[200px] space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Source</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{sourceLabel}</div>
            </div>
            <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
              Back to reports
            </Link>
          </div>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd({ id, title: meta.title!, description: meta.description })) }} />

      <ReportTocMobile headings={headings} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">
        <ReportMarkdown sections={report.sections} />
        <ReportTocSidebar headings={headings} />
      </div>

      {(prevReport || nextReport) && (
        <nav className="mt-16 grid gap-4 sm:grid-cols-2" aria-label="Report navigation">
          {prevReport ? (
            <Link
              href={`/reports/${prevReport}`}
              className="signal-panel p-5 group hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ArrowLeft className="h-3 w-3" />
                Previous Report
              </div>
              <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {toHumanTitle(prevReport)}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {nextReport && (
            <Link
              href={`/reports/${nextReport}`}
              className="signal-panel p-5 group hover:border-primary/30 transition-colors text-right"
            >
              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mb-1">
                Next Report
                <ArrowRight className="h-3 w-3" />
              </div>
              <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {toHumanTitle(nextReport)}
              </div>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
