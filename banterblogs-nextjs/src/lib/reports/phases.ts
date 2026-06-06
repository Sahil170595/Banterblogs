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
export type PhaseKey = 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5' | 'phase6' | 'phase7' | 'phase8';

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
    maxTR: 152,
    hasWhitepaper: true,
  },
  {
    key: 'phase7',
    number: '7',
    label: 'Phase 7 — Mitigation Turn (TR155–TR163)',
    description:
      'First applied defenses against the failure modes Phases 4–6 detected: RTSI-gated quantization routing, attention-sink eviction × refusal, and refusal-direction geometry. Proof-of-mechanism pilots — paper-grade expansion in progress.',
    featuredSummary:
      'Mitigation turn — RTSI-gated quantization routing and serving-state defenses against quantization-induced refusal loss. Proof-of-mechanism pilots; paper-grade expansion in progress.',
    minTR: 155,
    maxTR: 163,
    hasWhitepaper: false,
  },
  {
    key: 'phase8',
    number: '8',
    label: 'Phase 8 — Serving-Stack Mechanism Isolation (TR164–TR165)',
    description:
      'Serving-stack physics on consumer GPUs: breakdown boundaries, GIL-attributable concurrency collapse, and deterministic cell-shape hangs under in-process inference, with cross-backend (PyTorch / vLLM / SGLang / TGI) validation. In flight — conclusive synthesis pending.',
    featuredSummary:
      'Serving-stack mechanism isolation — breakdown boundaries and GIL-attributable concurrency collapse across PyTorch / vLLM / SGLang / TGI. In flight.',
    minTR: 164,
    maxTR: Infinity,
    hasWhitepaper: false,
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

/**
 * Slug-classifier shared across `/reports/page.tsx`, `/reports/[id]/page.tsx`,
 * and `/reports.json/route.ts`. Prior to consolidation each file had its own
 * near-identical copy and they drifted on edge cases (compendium keyword in
 * detail page but not in index, addendum-readiness, etc).
 *
 * Order matters: whitepaper/appendix/conclusive substring checks first because
 * those slugs also encode a phase key (`technical-report-conclusive-phase1-whitepaper`)
 * and would otherwise classify as the phase rather than its synthesis doc.
 */
export type ReportCategory = 'whitepaper' | 'conclusive' | 'appendix' | 'compendium' | PhaseKey | 'other';

export function classifyReportSlug(slug: string): ReportCategory {
  const lower = slug.toLowerCase();
  if (lower.includes('whitepaper')) return 'whitepaper';
  if (lower.includes('appendix') || lower.includes('appendices')) return 'appendix';
  if (lower.includes('conclusive')) return 'conclusive';
  if (lower.includes('compendium')) return 'compendium';
  const pinned = phaseForSlug(slug);
  if (pinned) return pinned;
  const tr = extractTRNumber(slug);
  if (tr !== null) return phaseForTR(tr) ?? 'other';
  return 'other';
}

/**
 * Sort rank for prev/next navigation and manifest ordering. Lower rank = earlier
 * in the reading order. Phase 0 baselines (Sep-Oct 2025) sort BEFORE TR108
 * because they chronologically predate the TR-numbered program — without this
 * the rank() in [id]/page.tsx and the comparator in reports.json/route.ts both
 * sink Phase 0 to ~20_000 (alongside 'other'), inverting the timeline.
 */
export function reportSortRank(slug: string): number {
  const cat = classifyReportSlug(slug);
  if (cat === 'phase0') return -1; // Pre-TR baselines: chronologically first.
  const tr = extractTRNumber(slug);
  if (tr !== null && cat !== 'whitepaper' && cat !== 'appendix' && cat !== 'conclusive') return tr;
  if (cat === 'conclusive' || cat === 'whitepaper' || cat === 'appendix') return 10_000;
  if (cat === 'compendium') return 15_000;
  return 20_000;
}

/**
 * Canonical slug for a phase's conclusive whitepaper. Single point of truth
 * for the `technical-report-conclusive-<key>-whitepaper` URL convention so
 * an upstream Banterhearts rename can't silently break the FEATURED_REPORTS
 * cards on /reports while everything else (which discovers from disk) keeps
 * working.
 */
export function phaseWhitepaperSlug(key: PhaseKey): string {
  return `technical-report-conclusive-${key}-whitepaper`;
}

/** Display label for a phase's TR range, e.g. "TR108–TR116" or "TR144+". */
export function phaseRangeLabel(key: PhaseKey): string {
  const p = PHASE_DEFINITIONS.find((x) => x.key === key);
  if (!p || p.minTR === undefined) return '';
  if (p.maxTR === Infinity || p.maxTR === undefined) return `TR${p.minTR}+`;
  return `TR${p.minTR}–TR${p.maxTR}`;
}

/**
 * Build-time assertion that every slug-pinned phase (Phase 0 today) actually
 * resolves to a discovered report on disk. Catches silent drift where a file
 * gets renamed or moved but `PHASE_DEFINITIONS[i].slugs` is not updated — the
 * phase tab would otherwise quietly lose entries with no build error.
 *
 * Call from a build-time consumer (e.g. the /reports.json route, which is
 * `force-static` so it runs once at build).
 */
export function assertPhaseSlugsResolved(discoveredSlugs: ReadonlySet<string>): void {
  const missing: { phase: PhaseKey; slug: string }[] = [];
  for (const p of PHASE_DEFINITIONS) {
    if (!p.slugs) continue;
    for (const s of p.slugs) {
      if (!discoveredSlugs.has(s)) missing.push({ phase: p.key, slug: s });
    }
  }
  if (missing.length > 0) {
    const lines = missing.map((m) => `  - phase=${m.phase} slug=${m.slug}`).join('\n');
    throw new Error(
      `[phases.ts] PHASE_DEFINITIONS.slugs references reports that don't exist on disk:\n${lines}\n` +
        `Either restore the file under PublishReady/reports/ or remove the slug from PHASE_DEFINITIONS.`,
    );
  }
}
