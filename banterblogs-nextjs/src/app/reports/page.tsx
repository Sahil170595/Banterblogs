import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { discoverReports, toHumanTitle, type ReportLocation } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';
import { ReportTabs, type ReportTabGroup } from '@/components/reports/ReportTabs';

export const metadata: Metadata = {
  title: 'Research Archive',
  description:
    'Independent ML research: 728,000+ measurements across model loading, quantization, TensorRT compilation, KV cache optimization, multi-agent coordination, and cross-backend safety analysis.',
};

export const revalidate = 900;
export const runtime = 'nodejs';

interface ReportEntry {
  slug: string;
  title: string;
  description: string;
  source: string;
}

function extractTRNumber(slug: string): number | null {
  const match = slug.match(/(?:^|-)(?:tr|technical-report-)(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

type ReportCategory = 'whitepaper' | 'conclusive' | 'appendix' | 'phase3' | 'phase2' | 'phase1.5' | 'phase1' | 'other';

function classifyReport(slug: string): ReportCategory {
  const lower = slug.toLowerCase();
  if (lower.includes('whitepaper')) return 'whitepaper';
  if (lower.includes('appendix') || lower.includes('appendices')) return 'appendix';
  if (lower.includes('conclusive')) return 'conclusive';
  const tr = extractTRNumber(slug);
  if (tr !== null) {
    if (tr <= 116) return 'phase1';
    if (tr <= 122) return 'phase1.5';
    if (tr <= 133) return 'phase2';
    return 'phase3';
  }
  return 'other';
}

// Featured reports pinned to the top — executive-level entry points
const FEATURED_REPORTS: { slug: string; label: string; summary: string }[] = [
  {
    slug: 'technical-report-conclusive-108-116-whitepaper',
    label: 'Phase 1 Whitepaper',
    summary: 'Foundation synthesis — model loading, ONNX conversion, quantization baselines, and security analysis across 9 technical reports.',
  },
  {
    slug: 'technical-report-conclusive-117-122-whitepaper',
    label: 'Phase 1.5 Whitepaper',
    summary: 'Benchmarking synthesis — cross-backend inference parity, TensorRT compilation, and scaling laws across 6 reports.',
  },
  {
    slug: 'technical-report-conclusive-123-133-whitepaper',
    label: 'Phase 2 Whitepaper',
    summary: 'Optimization synthesis — KV cache tuning, INT8/FP8 quantization, context scaling, and deployment pipeline across 11 reports.',
  },
  {
    slug: 'technical-report-conclusive-134-137-whitepaper',
    label: 'Phase 3 Whitepaper',
    summary: 'Safety synthesis — alignment erosion under quantization, concurrency invariance, and backend template divergence across 4 reports.',
  },
  {
    slug: 'technical-report-conclusive-138-143-whitepaper',
    label: 'Phase 3.5 Whitepaper',
    summary: 'Attack-surface synthesis — batch perturbation, multi-turn jailbreaks, cross-architecture fragility, and composition effects across 306K+ samples.',
  },
];

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

  // Build three top-level tabs
  const whitepapers: ReportEntry[] = [];
  const conclusive: ReportEntry[] = [];
  const technicalByPhase = new Map<string, ReportEntry[]>();

  const PHASE_META: Record<string, { label: string; description: string; order: number }> = {
    'phase3': { label: 'Phase 3 — Safety (TR134–TR144)', description: 'Alignment under quantization, batch perturbation, multi-turn jailbreaks, cross-architecture fragility, speculative decoding, AWQ/GPTQ safety.', order: 0 },
    'phase2': { label: 'Phase 2 — Optimization (TR123–TR133)', description: 'KV cache, quantization, multi-backend compilation, context scaling, concurrency, deployment.', order: 1 },
    'phase1.5': { label: 'Phase 1.5 — Benchmarking (TR117–TR122)', description: 'Multi-agent parity, TensorRT compilation, inference physics, scaling laws.', order: 2 },
    'phase1': { label: 'Phase 1 — Foundation (TR108–TR116)', description: 'Model loading, ONNX conversion, tokenization, quantization, security, monitoring, serving.', order: 3 },
    'other': { label: 'Additional Reports', description: 'Model-specific analyses and supplementary research.', order: 4 },
  };

  for (const report of reports) {
    const cat = classifyReport(report.slug);
    if (cat === 'whitepaper') {
      whitepapers.push(report);
    } else if (cat === 'conclusive' || cat === 'appendix') {
      conclusive.push(report);
    } else {
      if (!technicalByPhase.has(cat)) technicalByPhase.set(cat, []);
      technicalByPhase.get(cat)!.push(report);
    }
  }

  // Build tab groups for the technical reports section
  const technicalGroups: ReportTabGroup[] = Array.from(technicalByPhase.entries())
    .map(([key, items]) => ({
      key,
      label: PHASE_META[key]?.label ?? key,
      description: PHASE_META[key]?.description ?? '',
      reports: items.map((r) => ({ slug: r.slug, title: r.title, description: r.description })),
      _order: PHASE_META[key]?.order ?? 99,
    }))
    .sort((a, b) => a._order - b._order)
    .map(({ _order, ...rest }) => rest);

  const featuredSlugs = FEATURED_REPORTS.map((f) => f.slug);

  return (
    <div className="container py-16">
      {/* ── Hero ── */}
      <div className="signal-panel-strong mb-10 p-8 md:p-12">
        <div className="space-y-5 w-full">
          <span className="signal-pill">Independent Research</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Edge LLM Inference Under Real-World Constraints
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            How fast can local inference get — and how safe is it at the edge? This research program
            answers both questions with CUDA event timing and controlled safety evaluations across
            model loading, quantization, TensorRT compilation, KV cache optimization, multi-agent coordination,
            and cross-backend safety consistency.
          </p>
          <p className="text-sm text-muted-foreground/80">
            Independent research by <span className="text-foreground font-medium">Sahil Kadadekar</span>
          </p>
        </div>
      </div>

      {/* ── Stats Ribbon ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { value: '728,000+', label: 'Research Measurements' },
          { value: '44', label: 'Technical Reports' },
          { value: '12', label: 'Synthesis Whitepapers' },
          { value: '9', label: 'Repositories' },
        ].map((stat) => (
          <div key={stat.label} className="signal-panel p-5 text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Start Here: Featured Research ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Start Here
        </h2>

        {/* Compendium — hero card */}
        <Link
          href="/reports/compendium"
          className="block group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-muted/20 p-8 md:p-10 mb-6 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5"
        >
          <div className="relative z-10">
            <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Whitepaper</div>
            <h3 className="text-2xl md:text-4xl font-bold mb-4 group-hover:text-primary transition-colors">
              Chimeraforge: High-Performance LLM Agent Orchestration
            </h3>
            <p className="text-base md:text-lg text-muted-foreground w-full mb-6 leading-relaxed">
              Rust vs. Python for production AI orchestration. A hybrid architecture and &quot;Dual Ollama&quot; pattern
              achieve 58% latency reduction and near-zero contention.
            </p>
            <span className="inline-flex items-center gap-2 text-primary font-medium">
              Read the Whitepaper <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </span>
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        </Link>

        {/* Featured report cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {FEATURED_REPORTS.map((feat) => (
            <Link
              key={feat.slug}
              href={`/reports/${feat.slug}`}
              className="block group rounded-xl border border-border/50 bg-card/30 p-5 hover:border-primary/40 hover:bg-muted/20 transition-all"
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">
                {feat.label}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {feat.summary}
              </p>
              <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Read report <span>&rarr;</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Key Findings ── */}
      <section className="mb-20">
        <div className="mb-8 border-b border-border/40 pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Key Findings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Concrete results pulled from the published reports. Numbers, not narrative.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              number: '100% ASR',
              finding: 'Q2_K is universally unacceptable for safety. Banned across 18+ models, 10+ families.',
              source: [{ label: 'TR134', slug: 'technical-report-134' }, { label: 'TR139', slug: 'technical-report-139' }],
            },
            {
              number: 'p = 0.942',
              finding: 'Alignment type does not predict batch-induced safety fragility (RLHF, SFT, DPO, distilled — none differ).',
              source: [{ label: 'TR141', slug: 'technical-report-141' }],
            },
            {
              number: '25pp',
              finding: 'Backend migration can cost 25 percentage points of safety. Chat template divergence, not the framework.',
              source: [{ label: 'TR136', slug: 'technical-report-136' }],
            },
            {
              number: '13.9×',
              finding: 'Quality metrics are not safety proxies. Safety degrades 13.9× faster than quality at Q3_K_S.',
              source: [{ label: 'TR142', slug: 'technical-report-142' }],
            },
            {
              number: '99.4%',
              finding: 'Dual Ollama eliminates 99% of multi-agent contention. Architectural fix, not code fix.',
              source: [{ label: 'TR114', slug: 'technical-report-114' }],
            },
            {
              number: '+74%',
              finding: 'GPU memory bandwidth is the multi-agent bottleneck — not the serving stack. Overturned the TR130 conclusion.',
              source: [{ label: 'TR131', slug: 'technical-report-131' }],
            },
            {
              number: '2.25×',
              finding: 'Continuous batching delivers 2.25× throughput at N=8 via 77-80% kernel reduction.',
              source: [{ label: 'TR132', slug: 'technical-report-132' }],
            },
            {
              number: 'Q4_K_M',
              finding: 'The universal quantization sweet spot. -4.1pp accuracy max across 5 models, 30-67% cost savings.',
              source: [{ label: 'TR125', slug: 'technical-report-125' }],
            },
          ].map((f) => (
            <article key={f.number} className="signal-panel p-5">
              <div className="font-mono text-2xl md:text-3xl font-bold text-primary mb-3 tabular-nums">
                {f.number}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-4">{f.finding}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {f.source.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/reports/${s.slug}`}
                    className="rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Whitepapers ── */}
      {whitepapers.length > 0 && (
        <section className="mb-20">
          <div className="mb-8 border-b border-border/40 pb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Whitepapers
            </h2>
            <p className="mt-2 text-sm text-muted-foreground/70">
              Executive-level decision documents. Start here if you need the bottom line.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {whitepapers.map((r) => (
                <Link
                  key={r.slug}
                  href={`/reports/${r.slug}`}
                  className="block group rounded-xl border border-border/50 bg-card/30 p-5 hover:bg-muted/20 hover:border-border transition-all"
                >
                  <div className="text-base font-semibold group-hover:text-primary transition-colors leading-snug mb-3">
                    {r.title}
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">{r.description}</p>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read <span>&rarr;</span>
                  </span>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* ── Conclusive Reports ── */}
      {conclusive.length > 0 && (
        <section className="mb-20">
          <div className="mb-8 border-b border-border/40 pb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Conclusive Reports &amp; Appendices
            </h2>
            <p className="mt-2 text-sm text-muted-foreground/70">
              Dissertation-style synthesis documents consolidating findings across multiple technical reports.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {conclusive.map((r) => (
              <Link
                key={r.slug}
                href={`/reports/${r.slug}`}
                className="block group rounded-xl border border-border/50 bg-card/30 p-5 hover:bg-muted/20 hover:border-border transition-all"
              >
                <div className="text-base font-semibold group-hover:text-primary transition-colors leading-snug mb-3">
                  {r.title}
                </div>
                {r.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">{r.description}</p>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Read <span>&rarr;</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Technical Reports (Tabbed by Phase) ── */}
      <section>
        <div className="mb-8 border-b border-border/40 pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Technical Reports
          </h2>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Individual research reports with raw data, methodology, and findings.
          </p>
        </div>
        <ReportTabs groups={technicalGroups} featuredSlugs={featuredSlugs} />
      </section>
    </div>
  );
}
