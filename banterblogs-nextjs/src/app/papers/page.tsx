import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText, Layers } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Papers',
  description:
    '5 NeurIPS 2026 papers packet-ready · 6 in preparation · Independent research on inference optimization, constitutional AI, and safety evaluation.',
  openGraph: {
    title: 'Papers | Chimeraforge',
    description:
      '5 NeurIPS 2026 papers packet-ready · 6 in preparation · Independent research on inference optimization, constitutional AI, and safety evaluation.',
    url: 'https://chimeraforge.vercel.app/papers',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Papers | Chimeraforge',
    description:
      '5 NeurIPS 2026 papers packet-ready · 6 in preparation · Independent research on inference optimization, constitutional AI, and safety evaluation.',
  },
};

interface Paper {
  title: string;
  thesis: string;
  venue: string;
  status: 'NeurIPS 2026' | 'In preparation' | 'Synthesis' | 'Pre-execution';
  trs: { label: string; slug: string }[];
}

const NEURIPS_2026: Paper[] = [
  {
    title: 'Compile-Stack Attribution',
    thesis:
      'Independent upstream bugs in PyTorch and Triton jointly produce the torch.compile decode crash. Triton minor-version ablation on the same GPU flips the conclusion. Benchmark identity is a 5-tuple (GPU, Triton, PyTorch, cache, compile mode). Companion to upstream PR #175562.',
    venue: 'NeurIPS 2026',
    status: 'NeurIPS 2026',
    trs: [
      { label: 'TR126', slug: 'technical-report-126' },
      { label: 'TR147', slug: 'technical-report-147' },
    ],
  },
  {
    title: 'Quality-Safety Correlation Under Quantization',
    thesis:
      "Simpson's paradox in the safety-quality relationship. Refusal Template Stability Index calibrated with LOOCV across 51 model-format cells (GGUF + AWQ + GPTQ), inter-judge κ = 0.873.",
    venue: 'NeurIPS 2026',
    status: 'NeurIPS 2026',
    trs: [
      { label: 'TR125', slug: 'technical-report-125' },
      { label: 'TR134', slug: 'technical-report-134' },
      { label: 'TR142', slug: 'technical-report-142' },
    ],
  },
  {
    title: 'Many-Shot Jailbreak Under Quantization',
    thesis:
      'Q2_K is the recurring vulnerability threshold for many-shot and long-context attacks. Message-array vs faux-dialogue prompt formatting (92% vs 0% ASR) across 4 model families. Format mediates effect more strongly than quantization alone.',
    venue: 'NeurIPS 2026',
    status: 'NeurIPS 2026',
    trs: [{ label: 'TR140', slug: 'technical-report-140' }],
  },
  {
    title: 'Speculative Decoding Safety — Null Result',
    thesis:
      '16,783 samples across production-scale 70B target + 8B draft pairs (adversarial draft, quantized draft, non-greedy decoding). Zero measurable safety degradation, contradicting the SSD premise. Strong null result.',
    venue: 'NeurIPS 2026',
    status: 'NeurIPS 2026',
    trs: [{ label: 'TR144', slug: 'technical-report-144' }],
  },
  {
    title: 'Multi-Turn Jailbreak × Quantization',
    thesis:
      '8 attack strategies × 4 models × 6 quantization levels: 10,600 conversations, 37,825 judge labels. Threshold-specific shift in risk rather than universal multi-turn amplification.',
    venue: 'NeurIPS 2026',
    status: 'NeurIPS 2026',
    trs: [{ label: 'TR139', slug: 'technical-report-139' }],
  },
];

const IN_PREP: Paper[] = [
  {
    title: 'Inference Optimization Is Not Safety-Neutral',
    thesis:
      'Synthesis paper. Quantization drives 57% of total safety cost, backend choice 41%, concurrency 2%. Chat template divergence can induce larger safety shifts than numerical precision.',
    venue: 'TBD',
    status: 'Synthesis',
    trs: [
      { label: 'TR134', slug: 'technical-report-134' },
      { label: 'TR135', slug: 'technical-report-135' },
      { label: 'TR136', slug: 'technical-report-136' },
      { label: 'TR137', slug: 'technical-report-137' },
    ],
  },
  {
    title: 'Batch Inference Safety Under Non-Determinism',
    thesis:
      'Phase 1 safety flips at ~0.58% vs capability ~0.14% under controlled batching. Refusal-to-compliance dominant direction. Reduced true-batching validation reaches ~99.4% agreement with synchronized dispatch.',
    venue: 'Workshop submission',
    status: 'In preparation',
    trs: [{ label: 'TR138', slug: 'technical-report-138' }],
  },
  {
    title: 'Empirical Capacity Planning for Local LLM Inference',
    thesis:
      'Capacity planning as a fitted systems problem. Backend choice, context length, and memory pressure all materially change the feasible operating regime. Planner quality should be judged by validation against explicit targets, not analytic elegance.',
    venue: 'Systems venue',
    status: 'Synthesis',
    trs: [
      { label: 'TR123', slug: 'technical-report-123' },
      { label: 'TR127', slug: 'technical-report-127' },
      { label: 'TR133', slug: 'technical-report-133' },
    ],
  },
  {
    title: 'Multi-Agent Runtime Architecture',
    thesis:
      'Recasts "which language wins" as "which system design preserves throughput." Python and Rust near-parity on throughput; architecture and concurrency strategy drive larger differences. Dual Ollama achieves 99.4% multi-agent efficiency.',
    venue: 'Systems venue',
    status: 'Synthesis',
    trs: [
      { label: 'TR112', slug: 'technical-report-112' },
      { label: 'TR114', slug: 'technical-report-114' },
      { label: 'TR115', slug: 'technical-report-115' },
    ],
  },
  {
    title: 'Serving Stacks, Continuous Batching & the Physics of Throughput',
    thesis:
      'LLM serving-stack differences are mechanistic, not benchmark trivia. Continuous batching drives throughput scaling with agent count via 77-80% kernel reduction. Backends differ in effective serial fraction. 2.25× throughput gain at N=8 explained mechanistically.',
    venue: 'Systems venue',
    status: 'Synthesis',
    trs: [
      { label: 'TR129', slug: 'technical-report-129' },
      { label: 'TR130', slug: 'technical-report-130' },
      { label: 'TR132', slug: 'technical-report-132' },
    ],
  },
  {
    title: 'KV-Cache Quantization and Safety',
    thesis:
      'KV-cache quantization is a serving-layer perturbation that touches retained attention state. Needs its own safety evaluation rather than inferred from weight quantization. 5-phase study on FP16 vs FP8.',
    venue: 'TBD',
    status: 'Pre-execution',
    trs: [],
  },
];

function StatusBadge({ status }: { status: Paper['status'] }) {
  const styles: Record<Paper['status'], string> = {
    'NeurIPS 2026': 'border-primary/40 bg-primary/10 text-primary',
    'In preparation': 'border-accent/40 bg-accent/10 text-accent',
    Synthesis: 'border-border/60 bg-muted/30 text-muted-foreground',
    'Pre-execution': 'border-border/60 bg-background text-muted-foreground/70',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function PaperCard({ paper }: { paper: Paper }) {
  return (
    <article className="signal-panel p-6 md:p-7 group">
      <header className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg md:text-xl font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {paper.title}
        </h3>
        <StatusBadge status={paper.status} />
      </header>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{paper.thesis}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground/70 uppercase tracking-[0.16em]">Target:</span>
        <span className="text-foreground/80 font-medium">{paper.venue}</span>
      </div>
      {paper.trs.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/30 pt-4 text-xs">
          <span className="text-muted-foreground/70 uppercase tracking-[0.16em]">Evidence:</span>
          {paper.trs.map((tr) => (
            <Link
              key={tr.slug}
              href={`/reports/${tr.slug}`}
              className="rounded-full border border-border/60 px-2.5 py-0.5 text-foreground/80 transition hover:border-primary/60 hover:text-primary"
            >
              {tr.label}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

export default function PapersPage() {
  return (
    <div className="container py-16">
      {/* ── Hero ── */}
      <div className="signal-panel-strong mb-12 p-8 md:p-12">
        <div className="space-y-5 max-w-3xl">
          <span className="signal-pill">Papers</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            5 NeurIPS 2026 candidates · 6 in preparation
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Independent research on inference optimization, constitutional AI architectures, and empirical safety
            evaluation. Each paper is backed by reproducible technical reports and artifact-level provenance from a
            728,000+ measurement program.
          </p>
          <p className="text-sm text-muted-foreground/80">
            Author: <span className="text-foreground font-medium">Sahil Kadadekar</span> · Independent research
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { value: '5', label: 'NeurIPS 2026 ready' },
          { value: '11', label: 'Papers total' },
          { value: '44', label: 'Technical Reports' },
          { value: '728K+', label: 'Measurements' },
        ].map((s) => (
          <div key={s.label} className="signal-panel p-5 text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── NeurIPS 2026 ── */}
      <section className="mb-16">
        <div className="mb-8 border-b border-border/40 pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            NeurIPS 2026 — Packet Ready
          </h2>
          <p className="mt-2 text-sm text-muted-foreground/70">
            5 papers with PDFs, artifact manifests, and venue checklists complete. Submission window: May 6.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {NEURIPS_2026.map((p) => (
            <PaperCard key={p.title} paper={p} />
          ))}
        </div>
      </section>

      {/* ── In Preparation ── */}
      <section className="mb-16">
        <div className="mb-8 border-b border-border/40 pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            In Preparation
          </h2>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Synthesis papers and methodology work derived from the published technical report archive.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {IN_PREP.map((p) => (
            <PaperCard key={p.title} paper={p} />
          ))}
        </div>
      </section>

      {/* ── Cross-Links ── */}
      <section>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/reports"
            className="block group signal-panel p-5 hover:border-primary/40 transition-all"
          >
            <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Research Archive</h3>
            <p className="text-sm text-muted-foreground mb-3">
              44 technical reports with 728,000+ measurements — the evidence layer behind these papers.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              Browse reports <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <Link
            href="/work"
            className="block group signal-panel p-5 hover:border-primary/40 transition-all"
          >
            <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Work</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Experience, education, and the engineering that surrounds the research.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              Read more <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <Link
            href="/platform"
            className="block group signal-panel p-5 hover:border-primary/40 transition-all"
          >
            <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Platform Architecture</h3>
            <p className="text-sm text-muted-foreground mb-3">
              The constitutional AI ecosystem these findings are built into.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              Explore <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
