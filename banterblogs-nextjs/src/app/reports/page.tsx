import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { discoverReports, toHumanTitle, type ReportLocation } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';

export const metadata: Metadata = {
  title: 'Research Archive',
  description:
    '26 technical reports backed by 70,000+ benchmark measurements — model loading, quantization, TensorRT compilation, KV cache optimization, and multi-agent coordination.',
};

export const revalidate = 900;
export const runtime = 'nodejs';

interface ReportEntry {
  slug: string;
  title: string;
  description: string;
  source: string;
}

interface ReportGroup {
  label: string;
  description: string;
  reports: ReportEntry[];
}

function extractTRNumber(slug: string): number | null {
  const match = slug.match(/(?:^|-)(?:tr|technical-report-)(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function classifyReport(slug: string): string {
  const lower = slug.toLowerCase();
  if (lower.includes('conclusive') || lower.includes('whitepaper') || lower.includes('appendix') || lower.includes('appendices')) {
    return 'conclusive';
  }
  const tr = extractTRNumber(slug);
  if (tr !== null) {
    if (tr <= 116) return 'phase1';
    if (tr <= 122) return 'phase1.5';
    return 'phase2';
  }
  return 'other';
}

const GROUP_ORDER: Record<string, { label: string; description: string; order: number }> = {
  'conclusive': { label: 'Conclusive Reports & Whitepapers', description: 'Phase-level synthesis documents consolidating findings across multiple technical reports.', order: 0 },
  'phase2': { label: 'Phase 2 — Optimization (TR123–TR134)', description: 'KV cache, quantization, multi-backend compilation, context scaling, concurrency, deployment.', order: 1 },
  'phase1.5': { label: 'Phase 1.5 — Benchmarking (TR117–TR122)', description: 'Multi-agent parity, TensorRT compilation, inference physics, scaling laws.', order: 2 },
  'phase1': { label: 'Phase 1 — Foundation (TR108–TR116)', description: 'Model loading, ONNX conversion, tokenization, quantization, security, monitoring, serving.', order: 3 },
  'other': { label: 'Additional Reports', description: 'Model-specific analyses and supplementary research.', order: 4 },
};

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
    if (existing.kind === 'file' && entry.kind === 'directory') {
      unique.set(entry.slug, entry);
    }
  }

  const reports: ReportEntry[] = Array.from(unique.values()).map((entry) => {
    const meta = readReportMeta(entry.slug);
    return {
      slug: entry.slug,
      title: meta?.title ?? toHumanTitle(entry.label),
      description: meta?.description ?? '',
      source: entry.source,
    };
  });

  const groupMap = new Map<string, ReportEntry[]>();
  for (const report of reports) {
    const key = classifyReport(report.slug);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(report);
  }

  const groups: ReportGroup[] = Array.from(groupMap.entries())
    .map(([key, items]) => ({
      label: GROUP_ORDER[key]?.label ?? key,
      description: GROUP_ORDER[key]?.description ?? '',
      reports: items,
      _order: GROUP_ORDER[key]?.order ?? 99,
    }))
    .sort((a, b) => a._order - b._order)
    .map(({ _order, ...rest }) => rest);

  const sourceCount = new Set(reports.map((r) => r.source)).size;

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-16 p-8 md:p-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
          <div className="space-y-5">
            <span className="signal-pill">Chimeraforge Observatory</span>
            <h1 className="text-4xl md:text-5xl font-bold">High-Performance Research Archive</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              70,000+ real benchmark measurements across model loading, quantization, TensorRT compilation, KV cache optimization, and multi-agent coordination — all with CUDA event timing.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/reports/compendium"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Read the whitepaper
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="signal-panel p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Reports</div>
              <div className="mt-2 text-3xl font-bold text-foreground">{reports.length}</div>
            </div>
            <div className="signal-panel p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Measurements</div>
              <div className="mt-2 text-3xl font-bold text-foreground">70K+</div>
            </div>
            <div className="signal-panel p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sources</div>
              <div className="mt-2 text-3xl font-bold text-foreground">{sourceCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Compendium */}
      <div className="mb-20">
        <h2 className="text-sm font-semibold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Latest Research
        </h2>
        <Link
          href="/reports/compendium"
          className="block group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-8 md:p-12 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5"
        >
          <div className="relative z-10">
            <div className="text-sm uppercase tracking-[0.2em] text-primary font-semibold mb-4">Whitepaper</div>
            <h3 className="text-3xl md:text-5xl font-bold mb-6 group-hover:text-primary transition-colors">
              Chimeraforge: High-Performance LLM Agent Orchestration
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              A definitive comparison of Rust vs. Python for real-time gaming AI. This study reveals how a hybrid architecture and &quot;Dual Ollama&quot; pattern achieve a 58% reduction in latency and near-zero contention.
            </p>
            <div className="inline-flex items-center gap-2 text-primary font-medium text-lg">
              Read the Whitepaper <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        </Link>
      </div>

      {/* Grouped Technical Archives */}
      <div className="space-y-16">
        {groups.map((group) => (
          <section key={group.label}>
            <div className="mb-8 border-b border-border/40 pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</h2>
              {group.description && (
                <p className="mt-2 text-sm text-muted-foreground/70">{group.description}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.reports.map((r) => (
                <Link key={r.slug} href={`/reports/${r.slug}`} className="block group rounded-xl border border-border/50 bg-card/30 p-5 hover:bg-muted/20 hover:border-border transition-all">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-lg font-semibold group-hover:text-primary transition-colors">{r.title}</div>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-muted-foreground/60 border border-border/50 px-2 py-1 rounded-full">{r.source}</span>
                  </div>
                  {r.description && <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{r.description}</div>}
                  <div className="text-xs text-muted-foreground mt-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Report <span>&rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
