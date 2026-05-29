/**
 * Phase definitions — single source of truth for the research-program phase taxonomy.
 *
 * Derives:
 *   - ReportCategory (the union type used by reports/page.tsx)
 *   - PHASE_META (the per-tab label/description/order map)
 *   - FEATURED_REPORTS (the Phase-N whitepaper feature cards on /reports)
 *   - classifyReport() (the TR-number → phase classifier)
 *
 * Adding a new phase: add ONE entry to PHASE_DEFINITIONS below. Everything else
 * derives. Matches the integer-clean Banterhearts naming (commit c3d051bb).
 */
export type PhaseKey = 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5' | 'phase6';

export interface PhaseDefinition {
  key: PhaseKey;
  number: string; // "0", "1", ..., "6" — display number used in whitepaper slugs + labels
  label: string; // tab label, e.g. "Phase 1 — Foundation (TR108–TR116)"
  description: string; // longer subtitle for the technical-reports tab
  featuredSummary: string; // shorter summary for the /reports Phase-N whitepaper feature card
  // TR-numbered phases (phase1+): inclusive TR range. Pre-TR phases (phase0): use `slugs` instead.
  minTR?: number;
  maxTR?: number; // use Infinity for the catch-all (latest phase)
  // Pre-TR phases pin reports by exact slug because they predate the TR numbering scheme.
  slugs?: string[];
  // Whether this phase has a conclusive synthesis whitepaper. Phase 0 baselines do not.
  hasWhitepaper: boolean;
}

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    key: 'phase0',
    number: '0',
    label: 'Phase 0 — Pre-TR Baselines',
    description:
      'Pre-TR baseline benchmarks (Sep–Oct 2025): Ollama quantization runtime characterization, Gemma 3 parameter tuning, and consumer-GPU kernel deep-dive that motivated the TR108+ program.',
    featuredSummary:
      'Pre-TR baselines — Ollama runtime, Gemma 3 parameter tuning, and consumer-GPU kernel analysis.',
    slugs: ['gemma3', 'ollama-benchmark-report', 'performance-deep-dive'],
    hasWhitepaper: false,
  },
  {
    key: 'phase1',
    number: '1',
    label: 'Phase 1 — Foundation (TR108–TR116)',
    description:
      'Model loading, ONNX conversion, tokenization, quantization, security, monitoring, serving.',
    featuredSummary:
      'Foundation synthesis — model loading, ONNX conversion, quantization baselines, and security analysis across 9 technical reports.',
    minTR: 108,
    maxTR: 116,
    hasWhitepaper: true,
  },
  {
    key: 'phase2',
    number: '2',
    label: 'Phase 2 — Benchmarking (TR117–TR122)',
    description: 'Multi-agent parity, TensorRT compilation, inference physics, scaling laws.',
    featuredSummary:
      'Benchmarking synthesis — cross-backend inference parity, TensorRT compilation, and scaling laws across 6 reports.',
    minTR: 117,
    maxTR: 122,
    hasWhitepaper: true,
  },
  {
    key: 'phase3',
    number: '3',
    label: 'Phase 3 — Optimization (TR123–TR133)',
    description:
      'KV cache, quantization, multi-backend compilation, context scaling, concurrency, deployment.',
    featuredSummary:
      'Optimization synthesis — KV cache tuning, INT8/FP8 quantization, context scaling, and deployment pipeline across 11 reports.',
    minTR: 123,
    maxTR: 133,
    hasWhitepaper: true,
  },
  {
    key: 'phase4',
    number: '4',
    label: 'Phase 4 — Safety Pivot (TR134–TR137)',
    description:
      'Alignment under quantization, AWQ/GPTQ safety, backend-driven template divergence, and cross-axis safety taxonomy.',
    featuredSummary:
      'Safety-pivot synthesis — alignment erosion under quantization, concurrency invariance, and backend template divergence across 4 reports.',
    minTR: 134,
    maxTR: 137,
    hasWhitepaper: true,
  },
  {
    key: 'phase5',
    number: '5',
    label: 'Phase 5 — Attack Surface (TR138–TR143)',
    description:
      'Batch perturbation, multi-turn jailbreaks, long-context exploitation, cross-architecture fragility, quality-safety divergence, and cross-request composition. TR138 Study D batch-invariant-kernel ablation as standalone addendum.',
    featuredSummary:
      'Attack-surface synthesis — batch perturbation, multi-turn jailbreaks, cross-architecture fragility, and composition effects across 306K+ samples. TR138 Study D batch-invariant-kernel ablation as standalone addendum.',
    minTR: 138,
    maxTR: 143,
    hasWhitepaper: true,
  },
  {
    key: 'phase6',
    number: '6',
    label: 'Phase 6 — Serving-State Safety Certification (TR144–TR149+TR152)',
    description:
      'Measurement-validity substrate (judge triangulation, KV-cache safety null, speculative decoding null, mechanistic probing, portability validation) plus the FP8 KV-cache standardized batteries and serving-state factorial.',
    featuredSummary:
      'Serving-state safety certification — measurement-validity substrate (judge triangulation, KV-cache safety null, speculative decoding null, mechanistic probing, portability validation) + FP8 KV-cache standardized batteries + serving-state factorial.',
    minTR: 144,
    maxTR: Infinity,
    hasWhitepaper: true,
  },
];

/** Extract the TR number from a report slug. Returns null when no TR number is present. */
export function extractTRNumber(slug: string): number | null {
  const match = slug.match(/(?:^|-)(?:tr|technical-report-)(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/** Map a TR number to its phase key, or null if it doesn't fall in any defined range. */
export function phaseForTR(tr: number): PhaseKey | null {
  const phase = PHASE_DEFINITIONS.find(
    (p) => p.minTR !== undefined && p.maxTR !== undefined && tr >= p.minTR && tr <= p.maxTR,
  );
  return phase?.key ?? null;
}

/**
 * Map a normalized report slug to its phase key for slug-pinned phases (e.g. Phase 0 pre-TR baselines).
 * Returns null for slugs not pinned by any phase definition — callers should fall back to phaseForTR.
 */
export function phaseForSlug(slug: string): PhaseKey | null {
  const phase = PHASE_DEFINITIONS.find((p) => p.slugs?.includes(slug));
  return phase?.key ?? null;
}

/** Map a phase key to its display number ("1", "6", etc.) — useful for label rendering. */
export function phaseNumber(key: PhaseKey): string {
  return PHASE_DEFINITIONS.find((p) => p.key === key)?.number ?? '?';
}
