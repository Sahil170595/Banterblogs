import Link from 'next/link';
import { notFound } from 'next/navigation';
import { discoverReports, toHumanTitle, type ReportLocation } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';

export const revalidate = 900; // 15 minutes ISR cache

export const runtime = 'nodejs';

export default async function ReportsIndex() {
  const reportsEnabled = process.env.REPORTS_ENABLED !== 'false';
  if (!reportsEnabled) {
    notFound();
  }

  const entries = discoverReports();

  const unique = new Map<string, ReportLocation>();
  for (const entry of entries) {
    const existing = unique.get(entry.slug);
    if (!existing) {
      unique.set(entry.slug, entry);
      continue;
    }
    if (existing.kind === 'directory' && entry.kind === 'file') {
      unique.set(entry.slug, entry);
    }
  }

  const reports = Array.from(unique.values()).map((entry) => {
    const meta = readReportMeta(entry.slug);
    return {
      slug: entry.slug,
      title: meta?.title ?? toHumanTitle(entry.label),
      description: meta?.description ?? '',
      source: entry.source,
    };
  });

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r) => (
          <Link key={r.slug} href={`/reports/${r.slug}`} className="block group rounded-xl border border-border/50 p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">{r.title}</div>
              <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80">{r.source}</span>
            </div>
            {r.description && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</div>}
            <div className="text-sm text-muted-foreground mt-2">Explore</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
