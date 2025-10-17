import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { discoverReports, toHumanTitle, type ReportLocation } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';

const HIGHLIGHT_SLUGS = [
  'gemma3',
  'llama3',
  'quantization',
  'compilation',
  'kernel-optimization',
  'performance-deepdive',
  'performance_deepdive',
];

export default async function BenchmarksPage() {
  const locations = discoverReports();
  const locationMap = new Map<string, ReportLocation>();
  for (const location of locations) {
    const existing = locationMap.get(location.slug);
    if (!existing) {
      locationMap.set(location.slug, location);
      continue;
    }

    const preferDirectory = existing.kind === 'file' && location.kind === 'directory';
    const preferExports =
      existing.kind === 'directory' &&
      location.kind === 'directory' &&
      !existing.source.includes('exports') &&
      location.source.includes('exports');

    if (preferDirectory || preferExports) {
      locationMap.set(location.slug, location);
    }
  }

  const highlightReports = HIGHLIGHT_SLUGS.map((slug) => {
    const entry = locationMap.get(slug);
    if (!entry) return null;
    const meta = readReportMeta(slug);
    return {
      slug,
      title: meta?.title ?? toHumanTitle(entry.label),
      description: meta?.description,
      source: entry.source,
    };
  }).filter(Boolean) as Array<{ slug: string; title: string; description?: string; source: string }>;

  return (
    <div className="container py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Performance Benchmarks</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Real-time performance metrics and optimization data for both platforms.
        </p>
        <div className="rounded-2xl border border-border/60 bg-card/60 px-6 py-5 sm:flex sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-foreground">Live optimization reports</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dive into streaming CSVs, JSON benchmarks, and auto-derived charts pulled straight from Banterhearts. Each report page renders SVG-first visuals from the latest artifacts.
            </p>
          </div>
          <Link
            href="/reports"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary/80 sm:mt-0"
          >
            Open Live Reports
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {highlightReports.length > 0 && (
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Featured benchmark deep dives</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Each report below links to a full markdown analysis and, when available, interactive charts derived from PublishReady artifacts.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {highlightReports.map((report) => (
              <Link
                key={report.slug}
                href={`/reports/${report.slug}`}
                className="group rounded-2xl border border-border/60 bg-card/50 p-6 transition hover:border-primary/60 hover:bg-card/70"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition">
                    {report.title}
                  </h3>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
                </div>
                {report.description && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{report.description}</p>
                )}
                <div className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80 font-semibold">
                  Source · {report.source}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Banterpacks Benchmarks */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Banterpacks Performance</h2>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-primary mb-4">Rendering Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Frame Rate</span>
                <span className="font-mono text-sm">60 FPS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Latency</span>
                <span className="font-mono text-sm">&lt; 16ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Memory Usage</span>
                <span className="font-mono text-sm">~45MB</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-primary mb-4">AI Processing</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Inference Time</span>
                <span className="font-mono text-sm">~200ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Model Size</span>
                <span className="font-mono text-sm">12MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Accuracy</span>
                <span className="font-mono text-sm">94.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chimera Benchmarks */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Chimera Engine Performance</h2>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-primary mb-4">LLM Response Times</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Claude</span>
                <span className="font-mono text-sm">1.2s avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">GPT-4</span>
                <span className="font-mono text-sm">0.8s avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gemini</span>
                <span className="font-mono text-sm">1.5s avg</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-primary mb-4">Automation Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Episode Generation</span>
                <span className="font-mono text-sm">~3min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Code Analysis</span>
                <span className="font-mono text-sm">~45s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="font-mono text-sm">97.3%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Performance Chart Placeholder */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Performance Trends</h2>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">Performance charts coming soon</p>
          <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">📊 Interactive performance dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
