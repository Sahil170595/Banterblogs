import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReportDetailClient } from '@/components/reports/ReportDetailClient';
import { ReportMarkdown } from '@/components/reports/ReportMarkdown';
import { loadReportData } from '@/lib/reports/loadPublishReady';
import { readReportMeta } from '@/lib/reports/meta';
import { reportJsonLd } from './schema.org.json';

export const runtime = 'nodejs';
export const revalidate = 900;

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

  if (report.issues.length) {
    report.issues.forEach((issue) => {
      console.warn(`[reports] ${id}: ${issue}`);
    });
  }

  const meta = readReportMeta(id) || { title: id.replace(/[-_]/g, ' ') };
  const sourceLabel = meta.source ?? report.source;

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

      {report.charts ? (
        <>
          <ReportDetailClient
            id={id}
            timeseries={report.charts.timeseries}
            distribution={report.charts.distribution}
            correlation={report.charts.correlation}
            source={report.source}
            issues={report.issues}
          />
          <div className="mt-6 text-sm text-muted-foreground">
            These charts are rendered live (SVG) using structured PublishReady artifacts.
          </div>
        </>
      ) : (
        <div className="mb-8 rounded-xl border border-dashed border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground space-y-3">
          <div>
            No structured performance artifacts found for this report. Explore the detailed markdown analysis below or{' '}
            <Link href="/reports" className="text-primary underline-offset-2 hover:underline">
              return to the reports index
            </Link>
            .
          </div>
          {report.issues.length ? (
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground/90">
              {report.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <ReportMarkdown sections={report.sections} />
    </div>
  );
}
