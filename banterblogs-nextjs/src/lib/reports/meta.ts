import fs from 'fs';
import path from 'path';
import { summarizeMarkdown } from '@/lib/episodes';
import { findReportLocations, toHumanTitle } from './locator';

export interface ReportMeta {
  title?: string;
  description?: string;
  tags?: string[];
  source?: string;
}

/**
 * Static catalog — authoritative titles and one-line descriptions for every
 * report.  Checked first so the index page never shows junk like "**Date:**".
 * Keys are normalised slugs (same transform as locator.ts).
 *
 * MAINTENANCE CONTRACT: every report file in PublishReady/reports/ MUST have a
 * matching catalog entry here. Adding a new TR/conclusive/addendum without a
 * catalog entry falls through to `summarizeMarkdown` and renders whatever the
 * scraper happens to pick (frequently "**Date:**" from the metadata table).
 * Future work (deferred): drive titles/descriptions from per-report meta.json
 * sidecars or a YAML manifest co-authored in Banterhearts, so catalog updates
 * happen at report-promote time rather than as a separate site-side step.
 * Until then, every report-sync pass MUST verify catalog coverage.
 */
const REPORT_CATALOG: Record<string, { title: string; description: string }> = {
  // ── Phase 1 — Foundation (TR108–TR116) ──
  'technical-report-108': {
    title: 'TR108: LLM Performance Analysis',
    description: 'Single-agent benchmarking across 158 runs and 6 models — optimal configs for real-time workloads.',
  },
  'technical-report-109': {
    title: 'TR109: Agent Workflow Optimization',
    description: 'Process-isolated agent workflow benchmarking; GPU=60, CTX=512, TEMP=0.8 for stable output quality.',
  },
  'technical-report-110': {
    title: 'TR110: Concurrent Multi-Agent Performance',
    description: 'Parallel agent execution study (150 runs) establishing Python multi-agent efficiency baselines.',
  },
  'technical-report-111': {
    title: 'TR111: Rust Agent Workflow Performance',
    description: 'Comprehensive parameter optimization and Python performance parity validation for Rust agents.',
  },
  'technical-report-112': {
    title: 'TR112: Rust vs Python Agent Comparison',
    description: 'Cross-language analysis for production LLM deployments — latency, throughput, and resource efficiency.',
  },
  'technical-report-113': {
    title: 'TR113: Rust Concurrent Multi-Agent Analysis',
    description: 'Rust concurrent multi-agent performance profiling and contention analysis.',
  },
  'technical-report-114': {
    title: 'TR114: Dual Ollama Architecture',
    description: 'Rust concurrent multi-agent performance with dual Ollama instances — near-zero contention.',
  },
  'technical-report-115': {
    title: 'TR115: Async Runtime Deep Dive',
    description: 'Rust async runtime performance analysis for multi-agent LLM workloads.',
  },
  'technical-report-116': {
    title: 'TR116: Cross-Model Benchmarks',
    description: 'Qwen 2.5 vs Gemma 3 vs Llama 3.1 8B — comprehensive multi-agent performance study.',
  },

  // ── Phase 2 — Benchmarking (TR117–TR122) ──
  'technical-report-117': {
    title: 'TR117: Cross-Backend Inference Benchmark',
    description: 'Frontier benchmark comparing eager, JIT, torch.compile, ONNX, and TensorRT across architectures.',
  },
  'technical-report-117-multi-agent': {
    title: 'TR117 Multi-Agent: Efficiency Anomalies',
    description: 'Root cause analysis of the Python ceiling, Qwen mystery, and ranking flip in multi-agent inference.',
  },
  'technical-report-118': {
    title: 'TR118: Model Scale Comparative Analysis',
    description: 'ONNX Runtime + TensorRT performance across 1,210x parameter scaling.',
  },
  'technical-report-119': {
    title: 'TR119: Cost & Energy Analysis',
    description: 'Local-first inference TCO with telemetry — prefill and generate cost breakdowns.',
  },
  'technical-report-120': {
    title: 'TR120: The Compile Paradox',
    description: 'Why a compile backend can win the mean while losing the median — root-cause audit.',
  },
  'technical-report-121': {
    title: 'TR121: Scaling Laws & Capacity Planning',
    description: 'How latency, throughput, and cold-start risk change from ~0.1M to ~20.9B parameters.',
  },
  'technical-report-122': {
    title: 'TR122: The Physics of Inference',
    description: 'Establishing the fundamental constraints of LLM execution on consumer hardware.',
  },

  // ── Phase 3 — Optimization (TR123–TR133) ──
  'technical-report-123': {
    title: 'TR123: KV-Cache Production Economics',
    description: 'Phase-split $/token with cached decode across MHA and GQA architectures.',
  },
  'technical-report-124': {
    title: 'TR124: Quality & Accuracy Baseline',
    description: 'Backend equivalence, quantization impact, and sampling variance across 5 models.',
  },
  'technical-report-125': {
    title: 'TR125: Quantization Decision Matrix',
    description: 'Production quant selection across 6 models, 4 families, 9 formats (GGUF + AWQ + GPTQ) with quality and safety evaluation.',
  },
  'technical-report-126': {
    title: 'TR126: Linux/Triton Compile Validation',
    description: 'Cross-platform A/B confirming torch.compile benefits under real Inductor+Triton on consumer GPU.',
  },
  'technical-report-127': {
    title: 'TR127: Long-Context Performance',
    description: 'Consumer GPU context scaling from 512 to 32K tokens with two-regime VRAM analysis.',
  },
  'technical-report-128': {
    title: 'TR128: Production Workload Characterization',
    description: 'Concurrency, saturation, streaming, and multi-turn performance of Ollama on consumer GPU.',
  },
  'technical-report-129': {
    title: 'TR129: N-Agent Scaling Laws',
    description: 'Closed-loop multi-agent throughput scaling on consumer GPU with Ollama.',
  },
  'technical-report-130': {
    title: 'TR130: Serving Stack Benchmarking',
    description: 'Ollama vs vLLM vs TGI — multi-agent throughput scaling comparison.',
  },
  'technical-report-131': {
    title: 'TR131: GPU Kernel Profiling',
    description: 'Root-cause analysis of multi-agent throughput degradation via NVIDIA Nsight Systems.',
  },
  'technical-report-132': {
    title: 'TR132: Serving-Stack GPU Kernel Profiling',
    description: 'In-container Nsight Systems analysis of vLLM and TGI under multi-agent load.',
  },
  'technical-report-133': {
    title: 'TR133: Predictive Capacity Planner',
    description: 'Operationalising 70,000+ measurements into a decision tool for deployment planning.',
  },

  // ── Phase 4 — Safety Pivot (TR134–TR137) ──
  'technical-report-134': {
    title: 'TR134: Alignment Robustness Under Quantization',
    description: 'GGUF + AWQ + GPTQ safety evaluation across 6 models (1.2B–7.6B) — refusal template destabilization and deployment taxonomy.',
  },
  'technical-report-135': {
    title: 'TR135: Safety Under Multi-Agent Concurrency',
    description: 'Does running N concurrent agents on a shared backend degrade model safety?',
  },
  'technical-report-136': {
    title: 'TR136: Cross-Backend Safety Consistency',
    description: 'Ollama vs vLLM vs TGI safety comparison across 3 models, 4 backends, and 6 benchmarks.',
  },
  'technical-report-137': {
    title: 'TR137: The Safety Tax of Inference Optimization',
    description: 'Unified synthesis of quantization, concurrency, and backend effects on LLM safety — 74,254 samples.',
  },

  // ── Phase 5 — Attack Surface (TR138–TR143) ──
  'technical-report-138': {
    title: 'TR138: Batch Inference Safety Under Non-Determinism',
    description: 'Audit-layer flip adjudication + 7,257-sample reduced replication on enriched 187-prompt subset, with corrected refusal detector (v2.2). Study D batch-invariant-kernel ablation lives as a standalone addendum.',
  },
  'technical-report-138-study-d-addendum': {
    title: 'TR138 Study D Addendum: Batch-Invariant Kernel Ablation',
    description: 'Full-depth mechanism report for batch-conditioned refusal robustness. 110-record H100/vLLM ablation across 55 candidate score-flip pairs: standard vLLM reproduces 22/55 label flips and 25/55 text changes; the VLLM_BATCH_INVARIANT=1 environment flag reduces both to 0/55. Kernel-path mechanism evidence outside the original 306,996-sample synthesis.',
  },
  'technical-report-139': {
    title: 'TR139: Multi-Turn Jailbreak Susceptibility Under Quantization',
    description: 'Conversational attack sweep — 10,600 conversations across 4 models, 6 quant levels, 8 attack strategies.',
  },
  'technical-report-140': {
    title: 'TR140: Many-Shot & Long-Context Jailbreak Under Quantization',
    description: '15,000 scored samples across 4 models, 6 quant levels, 5 shot counts, and 3 context-length profiles.',
  },
  'technical-report-141': {
    title: 'TR141: Cross-Architecture Refusal Fragility Under Batch Perturbation',
    description: '127,224 records across 18 models, 10+ families, 4 alignment types — batch-induced safety flip asymmetry on Blackwell GPU.',
  },
  'technical-report-142': {
    title: 'TR142: Quality-Safety Correlation Under Quantization',
    description: 'Multi-format synthesis across GGUF, AWQ, and GPTQ — 6 models, 51 model-quant cells, quality-safety divergence analysis.',
  },
  'technical-report-143': {
    title: 'TR143: Cross-Request Safety Leakage Under Continuous Batching',
    description: '14,250 records — batch composition effects on safety in multi-tenant vLLM inference.',
  },
  'technical-report-145': {
    title: 'TR145: KV-Cache Quantization x Safety',
    description: 'FP8 KV-cache as a silent safety degradation vector — five-phase null result across 24,054 records on 3 models. Workload-specific paired eval recipe.',
  },
  'technical-report-146': {
    title: 'TR146: Mechanistic Safety Probing Under Quantization',
    description: 'Why standard mechanistic probes fail to predict quantization-induced safety degradation. 5,100 forward passes across 4 phases.',
  },
  'technical-report-147': {
    title: 'TR147: Final Portability Validation for Benchmarking Integrity',
    description: 'Full v1–v4 integration plus external case study using TR126 as reference standard. 52,410 measurements across 4 GPU regimes and 3 Triton minor versions.',
  },
  'technical-report-148': {
    title: 'TR148: Multi-Judge Reliability for Refusal-Axis Safety Classification',
    description: '68,620 judge rows across 5 judges on the TR145 safety subset. κ = 0.6917 (triangulate verdict) — single-judge labels insufficient. Plus a dual-axis methodology finding: safety-specialist judges measure a different axis than general LLM judges.',
  },

  // ── Phase 6 — Serving-State Safety Certification (TR144–TR149+TR152) ──
  'technical-report-144': {
    title: 'TR144: Speculative Decoding x Safety',
    description: 'Protocol and publication contract — does speculative decoding change safety outcomes via draft model token shaping?',
  },
  'technical-report-149': {
    title: 'TR149: Standardized Safety Battery — FP16 vs FP8 KV-Cache',
    description: '7,578 records across 3 models × 4 standardized batteries (HarmBench, JailbreakBench, StrongREJECT, XSTest) × 2 KV-cache dtypes. Replicates TR145’s FP8 null on literature-comparable corpora; corrected paired-odds-ratio estimator. Local-only judging, $0 external API.',
  },
  'technical-report-152': {
    title: 'TR152: The Serving-State Safety Factorial (v2 Local Expansion)',
    description: 'FP8 KV-cache folded across batch size, prefix-caching, and temperature — 45,000 responses, 20,754 matched FP16-vs-FP8 pairs across 5 models × 4 batteries × 6 serving-state contexts (XSTest uncapped to 450/cell). Harmful-prompt refusal perfectly invariant under every serving state (0/8,976 discordant pairs); only footprint is a sub-percentage-point over-refusal lean on the Qwen family on XSTest (Mantel–Haenszel pooled OR 1.88 [1.32, 2.69]). 117/120 cells TOST-equivalent at ±3pp.',
  },

  // ── Phase 7 — Mitigation Turn (TR155–TR163) ──
  'technical-report-163': {
    title: 'TR163: RTSI-Gated Quantization Routing',
    description: 'Offline LOOCV feasibility study over the TR142 RTSI table — routing the highest-instability (model × quantization) configurations to a safe baseline recovers ~76% of the quantization refusal-loss gap at ~20% of configs rerouted (out-of-sample ROC-AUC 0.84). A proof-of-mechanism defense, circularity disclosed; paper-grade expansion specified.',
  },

  // ── Phase 8 — Serving-Stack Mechanism Isolation (TR164–TR165) ──
  'technical-report-164': {
    title: 'TR164: Serving-Stack Physics — GIL-Attributable Concurrency Collapse',
    description: '346-cell matched study across 3 model tiers × 4 workloads × 5 concurrency levels on a consumer RTX 4080: a uniform parallel-efficiency breakdown at N=2, P95 latency multipliers up to 1446×, and six deterministic N=16 hangs attributed to Python GIL serialization, with kernel-level nsys evidence and cross-backend (vLLM / SGLang / TGI) validation.',
  },

  'technical-report-165': {
    title: 'TR165: Python GIL Ablation for Direct PyTorch Inference Boundaries',
    description: "Matched-pair nogil falsification of TR164 V1's GIL-attribution hypothesis — same hardware/models/workloads under a Python 3.14t free-threaded build, one knob flipped. Verdict H2_partial: removing the GIL recovers ~+17.9pp of N=2 parallel efficiency (19/24 combinations) and resolves 2 of 6 deterministic hangs, so the GIL is a mechanism behind the breakdown, not the sole cause.",
  },
  'technical-report-164-v3': {
    title: 'TR164 V3: Cross-Backend Serving-Stack Boundary Matrix (vLLM vs SGLang)',
    description: "Matched A100 80GB PCIe head-to-head — 5 models × 5 workloads × 6 concurrency levels × 2 phases per backend (1,800 cells / 189,000 rows, ok_rate 1.0). Continuous batching holds 0.47–0.62 parallel efficiency at N=32, an order-of-magnitude shift up from V1 pytorch_direct's 0.056 collapse. vLLM/SGLang deltas are small (1.5–7.6pp) but Holm-significant on 4 of 5 workloads — a workload-conditional routing signal, not an engine ranking.",
  },

  'technical-report-164-v4': {
    title: 'TR164 V4: The Amortization-Breakdown Surface — A Predictive Bandwidth Model for Continuous Batching',
    description: "A 672-cell offline static-batch grid (3 models × A100-80GB + H100 × vLLM 0.10.2, 2,016 timed decode generations, ok_rate 1.0) showing the continuous-batching free lunch is bounded by KV-cache read bandwidth. A one-parameter model η(B) = (1+r)/(1+Br) fits the 96 efficiency curves at median R² 0.93, and its zero-fitted-parameter architectural form predicts the breakdown knee at Spearman ρ = 0.84 — off only by a GPU-specific compute-overlap factor (0.52 A100, 0.33 H100). Complements V3's closed-loop boundary — grounds it, does not revise it.",
  },

  // ── Phase 9 — Predictive-Validity Follow-ups (TR166–TR168) ──
  'technical-report-167': {
    title: 'TR167: JTPv2 — Predictive Validity of Cheap Pre-Rejudge Signals',
    description: "Predictive-validity follow-up to the Judge Triangulation Protocol (TR148): can a cheap pre-rejudge signal predict a cell's judge-sensitivity on a leave-one-family-out hold-out before paying for the second-judge pass? On the GGUF-local rlhf-only hold-out the class label saturates (all-positive → AUC undefined) — a structural property of JTP on production-quantization substrate, not a power failure; directional signs and a pool-robustness secondary finding hold.",
  },

  // ── Conclusive Reports & Whitepapers (Phase 1–6, integer-clean naming) ──
  // Phase 1 — Foundation
  'technical-report-conclusive-phase1': {
    title: 'Conclusive Report: Phase 1 — Foundation (TR108–TR116)',
    description: 'Dissertation-style synthesis — language, architecture, runtime, and model selection for multi-agent LLM systems.',
  },
  'technical-report-conclusive-phase1-extended-appendices': {
    title: 'Phase 1 Extended Appendices',
    description: 'Supplemental material extracted from the Phase 1 conclusive report.',
  },
  'technical-report-conclusive-phase1-whitepaper': {
    title: 'Phase 1 Decision Whitepaper',
    description: 'Executive guidance for language, architecture, runtime, and model selection.',
  },
  // Phase 2 — Benchmarking
  'technical-report-conclusive-phase2': {
    title: 'Conclusive Report: Phase 2 — Benchmarking (TR117–TR122)',
    description: 'Dissertation-style synthesis — performance, cost, scaling, compiler behavior, and physical limits of consumer-GPU inference.',
  },
  'technical-report-conclusive-phase2-extended-appendices': {
    title: 'Phase 2 Extended Appendices',
    description: 'Supplemental material extracted from the Phase 2 conclusive report.',
  },
  'technical-report-conclusive-phase2-whitepaper': {
    title: 'Phase 2 Decision Whitepaper',
    description: 'Executive guidance for deployment leaders — benchmarking phase synthesis.',
  },
  // Phase 3 — Optimization
  'technical-report-conclusive-phase3': {
    title: 'Conclusive Report: Phase 3 — Optimization (TR123–TR133)',
    description: 'Dissertation-style synthesis — economics, quantization, context scaling, serving stacks, and predictive modeling.',
  },
  'technical-report-conclusive-phase3-extended-appendices': {
    title: 'Phase 3 Extended Appendices',
    description: 'Supplemental material extracted from the Phase 3 conclusive report.',
  },
  'technical-report-conclusive-phase3-whitepaper': {
    title: 'Phase 3 Decision Whitepaper',
    description: 'Executive guidance for deployment leaders — optimization phase synthesis.',
  },
  // Phase 4 — Safety Pivot (was site Phase 3 / Banterhearts pre-rename Phase 3.5)
  'technical-report-conclusive-phase4': {
    title: 'Conclusive Report: Phase 4 — Safety Pivot (TR134–TR137)',
    description: 'Dissertation-style synthesis — quantization-induced alignment erosion, concurrency invariance, backend-driven template divergence, and cross-axis safety taxonomy.',
  },
  'technical-report-conclusive-phase4-extended-appendices': {
    title: 'Phase 4 Extended Appendices',
    description: 'Supplemental material for the safety-critical deployment synthesis.',
  },
  'technical-report-conclusive-phase4-whitepaper': {
    title: 'Phase 4 Decision Whitepaper',
    description: 'Executive guidance for safety-critical LLM deployment.',
  },
  // Phase 5 — Attack Surface (was Banterhearts pre-rename Phase 4)
  'technical-report-conclusive-phase5': {
    title: 'Conclusive Report: Phase 5 — Attack Surface (TR138–TR143)',
    description: 'Safety attack-surface synthesis — batch perturbation, multi-turn jailbreaks, long-context exploitation, cross-architecture fragility, quality-safety divergence, and cross-request composition across 306,996 evaluated samples and 18+ models. TR138 Study D batch-invariant-kernel ablation is published as a standalone addendum.',
  },
  'technical-report-conclusive-phase5-extended-appendices': {
    title: 'Phase 5 Extended Appendices',
    description: 'Supplemental material for the safety attack-surface synthesis.',
  },
  'technical-report-conclusive-phase5-whitepaper': {
    title: 'Phase 5 Decision Whitepaper',
    description: 'Executive guidance for safety attack-surface management in LLM inference.',
  },
  // Phase 6 — Serving-State Safety Certification (was Banterhearts pre-rename Phase 4.5)
  'technical-report-conclusive-phase6': {
    title: 'Conclusive Report: Phase 6 — Serving-State Safety Certification (TR144–TR149+TR152)',
    description: 'Measurement-validity substrate (judge triangulation, KV-cache safety null, speculative decoding null, mechanistic probing, portability validation) plus the FP8 KV-cache standardized batteries and serving-state factorial. The inference-flag safety null line for optimized LLM serving.',
  },
  'technical-report-conclusive-phase6-extended-appendices': {
    title: 'Phase 6 Extended Appendices',
    description: 'Per-report data tables, named-method definitions, and cross-TR ledgers for serving-state safety certification.',
  },
  'technical-report-conclusive-phase6-whitepaper': {
    title: 'Phase 6 Decision Whitepaper',
    description: 'Executive guidance for serving-state safety certification of optimized LLM inference.',
  },

  // ── Phase 0 — Pre-TR Baselines (Sep–Oct 2025, predate the TR108+ numbering scheme) ──
  'gemma3': {
    title: 'Gemma 3 Benchmark Report',
    description: 'Performance benchmarks for Google Gemma 3 models — baseline measurements, parameter tuning, and quantization.',
  },
  'ollama-benchmark-report': {
    title: 'Ollama LLM Benchmark: Quantization & Runtime Analysis',
    description: 'Llama 3.1 8B across q4_0 / q5_K_M / q8_0 quantizations — runtime characterization on consumer GPU that motivated the TR108+ Rust-vs-Python program.',
  },
  'performance-deep-dive': {
    title: 'Performance Deep Dive: Quantization & Kernel Optimization',
    description: 'CUDA kernel deep-dive across quantization schemes on an RTX 4080 — the baseline characterization that anchored the TR123-133 optimization phase.',
  },

  // ── Compendium (rendered by /reports/compendium, sourced from PublishReady/research_compendium.md) ──
  'compendium': {
    title: 'Chimeraforge Whitepaper: High-Performance LLM Agent Orchestration',
    description: 'Rust vs. Python for production AI orchestration — hybrid architecture and Dual Ollama pattern achieving 58% latency reduction.',
  },
};

/**
 * Build-time assertion: every discovered report slug MUST have a REPORT_CATALOG
 * entry. Without this, missing entries silently fall through to `summarizeMarkdown`
 * which renders junk titles like "**Date:**". Call once from a build-time route
 * (e.g. /reports.json) which already enumerates the full slug set.
 *
 * Keep this separate from `readReportMeta` (which retains the soft fallback for
 * resilience) — we want the contract enforced at build, not on every render.
 */
export function assertCatalogComplete(slugs: ReadonlySet<string>): void {
  const missing: string[] = [];
  for (const slug of slugs) {
    if (!(slug in REPORT_CATALOG)) missing.push(slug);
  }
  if (missing.length > 0) {
    const lines = missing.map((s) => `  - '${s}': { title: '...', description: '...' },`).join('\n');
    throw new Error(
      `[meta.ts] REPORT_CATALOG is missing entries for ${missing.length} discovered report slug(s):\n${lines}\n` +
        `Add them to REPORT_CATALOG so /reports doesn't render scraped junk titles.`,
    );
  }
}

function summarizeFile(filePath: string, fallbackTitle: string) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const summary = summarizeMarkdown(raw, fallbackTitle);
    return {
      title: summary.title ?? fallbackTitle,
      description: summary.description,
    };
  } catch {
    return { title: fallbackTitle, description: undefined };
  }
}

export function readReportMeta(id: string): ReportMeta | null {
  // 1. Check static catalog first — always authoritative, and works for synthetic
  // entries (e.g. 'compendium') whose source markdown lives outside PublishReady/reports/
  // and therefore has no findReportLocations() result.
  const catalogEntry = REPORT_CATALOG[id];
  if (catalogEntry) {
    const locations = findReportLocations(id);
    return {
      title: catalogEntry.title,
      description: catalogEntry.description,
      source: locations[0]?.source,
    };
  }

  const locations = findReportLocations(id);
  if (!locations.length) return null;

  // 2. Look for explicit metadata in directory locations.
  for (const location of locations) {
    if (location.kind !== 'directory') continue;
    const metaPath = path.join(location.path, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    try {
      const raw = fs.readFileSync(metaPath, 'utf8');
      const parsed = JSON.parse(raw) as ReportMeta;
      return { ...parsed, source: location.source };
    } catch {
      // ignore invalid JSON and continue searching
    }
  }

  // 3. Fall back to markdown parsing.
  const markdownCandidates = ['SUMMARY.md', 'README.md', 'index.md'];
  let fallback: ReportMeta | null = null;

  for (const location of locations) {
    if (location.kind === 'file') {
      const summary = summarizeFile(location.path, toHumanTitle(location.label));
      const candidate: ReportMeta = {
        title: summary.title,
        description: summary.description,
        source: location.source,
      };
      if (candidate.description) return candidate;
      if (!fallback) fallback = candidate;
      continue;
    }

    for (const candidateName of markdownCandidates) {
      const candidatePath = path.join(location.path, candidateName);
      if (!fs.existsSync(candidatePath)) continue;
      const summary = summarizeFile(candidatePath, toHumanTitle(location.label));
      const candidate: ReportMeta = {
        title: summary.title,
        description: summary.description,
        source: location.source,
      };
      if (candidate.description) return candidate;
      if (!fallback) fallback = candidate;
    }
  }

  if (fallback) return fallback;

  const first = locations[0];
  return {
    title: toHumanTitle(first.label),
    source: first.source,
  };
}

