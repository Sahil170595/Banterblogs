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

  // ── Phase 1.5 — Benchmarking (TR117–TR122) ──
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

  // ── Phase 2 — Optimization (TR123–TR133) ──
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

  // ── Phase 3 — Safety (TR134–TR137) ──
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

  'technical-report-138': {
    title: 'TR138: Batch Inference Safety Under Non-Determinism',
    description: 'Audit-layer flip adjudication and 7,257-sample replication with corrected refusal detector.',
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

  // ── Conclusive Reports & Whitepapers ──
  'technical-report-conclusive-108-116': {
    title: 'Conclusive Report: Phase 1 (TR108–TR116)',
    description: 'Dissertation-style synthesis — language, architecture, runtime, and model selection for multi-agent LLM systems.',
  },
  'technical-report-conclusive-108-116-extended-appendices': {
    title: 'Phase 1 Extended Appendices',
    description: 'Supplemental material extracted from the Phase 1 conclusive report.',
  },
  'technical-report-conclusive-108-116-whitepaper': {
    title: 'Phase 1 Decision Whitepaper',
    description: 'Executive guidance for language, architecture, runtime, and model selection.',
  },
  'technical-report-conclusive-117-122': {
    title: 'Conclusive Report: Phase 1.5 (TR117–TR122)',
    description: 'Dissertation-style synthesis — performance, cost, scaling, compiler behavior, and physical limits.',
  },
  'technical-report-conclusive-117-122-extended-appendices': {
    title: 'Phase 1.5 Extended Appendices',
    description: 'Supplemental material extracted from the Phase 1.5 conclusive report.',
  },
  'technical-report-conclusive-117-122-whitepaper': {
    title: 'Phase 1.5 Decision Whitepaper',
    description: 'Executive guidance for deployment leaders — benchmarking phase synthesis.',
  },
  'technical-report-conclusive-123-133': {
    title: 'Conclusive Report: Phase 2 (TR123–TR133)',
    description: 'Dissertation-style synthesis — economics, quantization, context scaling, serving stacks, and predictive modeling.',
  },
  'technical-report-conclusive-123-133-extended-appendices': {
    title: 'Phase 2 Extended Appendices',
    description: 'Supplemental material extracted from the Phase 2 conclusive report.',
  },
  'technical-report-conclusive-123-133-whitepaper': {
    title: 'Phase 2 Decision Whitepaper',
    description: 'Executive guidance for deployment leaders — optimization phase synthesis.',
  },

  'technical-report-conclusive-134-137': {
    title: 'Conclusive Report: Phase 3 (TR134–TR137)',
    description: 'Dissertation-style synthesis — quantization-induced alignment erosion, concurrency invariance, backend template divergence, and safety taxonomy.',
  },
  'technical-report-conclusive-134-137-extended-appendices': {
    title: 'Phase 3 Extended Appendices',
    description: 'Supplemental material for the safety-critical deployment synthesis.',
  },
  'technical-report-conclusive-134-137-whitepaper': {
    title: 'Phase 3 Decision Whitepaper',
    description: 'Executive guidance for safety-critical LLM deployment.',
  },

  'technical-report-conclusive-138-143': {
    title: 'Conclusive Report: Phase 3.5 (TR138–TR143)',
    description: 'Safety attack-surface synthesis — 306,996 samples across batch perturbation, multi-turn jailbreaks, long-context exploitation, cross-architecture fragility, and composition effects.',
  },
  'technical-report-conclusive-138-143-extended-appendices': {
    title: 'Phase 3.5 Extended Appendices',
    description: 'Supplemental material for the safety attack-surface synthesis.',
  },
  'technical-report-conclusive-138-143-whitepaper': {
    title: 'Phase 3.5 Decision Whitepaper',
    description: 'Executive guidance for safety attack-surface management in LLM inference.',
  },

  'technical-report-144': {
    title: 'TR144: Speculative Decoding x Safety',
    description: 'Protocol and publication contract — does speculative decoding change safety outcomes via draft model token shaping?',
  },

  // ── Other ──
  'gemma3': {
    title: 'Gemma 3 Benchmark Report',
    description: 'Performance benchmarks for Google Gemma 3 models — baseline measurements, parameter tuning, and quantization.',
  },
};

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
  const locations = findReportLocations(id);
  if (!locations.length) return null;

  // 1. Check static catalog first — always authoritative.
  const catalogEntry = REPORT_CATALOG[id];
  if (catalogEntry) {
    return {
      title: catalogEntry.title,
      description: catalogEntry.description,
      source: locations[0].source,
    };
  }

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

