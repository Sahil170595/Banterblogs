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

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-2">{meta.title}</h1>
      {meta.description && <p className="text-muted-foreground mb-6">{meta.description}</p>}
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
            These charts are rendered live (SVG) using structured PublishReady artifacts. <Link href="/reports">Back to reports</Link>.
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
