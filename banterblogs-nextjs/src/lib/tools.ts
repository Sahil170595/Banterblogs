/**
 * Shipped CLIs — single source of truth.
 *
 * Every surface that names a package version (/platform cards, /work, Footer,
 * llms.txt, /tools pages) reads from here. Before this
 * module the versions were hand-copied per surface and the site drifted seven
 * minor releases behind PyPI (it advertised chimeraforge 0.5.0 while PyPI was
 * on 0.12.3 at the time). Bump `version` here on release and every surface
 * moves together.
 *
 * Facts below are transcribed from the published PyPI metadata + README of the
 * version named in `version`. Re-check them when bumping — especially the
 * counts (commands, GPU profiles), which move between releases.
 */

export interface ToolCommand {
  name: string;
  summary: string;
}

/** A capability tied to the technical reports that back it. */
export interface ToolEvidence {
  claim: string;
  detail: string;
  /** report slugs under /reports/<slug> — verified to resolve */
  reports: string[];
}

export interface ToolHighlight {
  title: string;
  body: string;
}

/** How the tool decides, drawn beside the page head (components/ui/FlowFigure.tsx). */
export interface ToolPipeline {
  title: string;
  caption: string;
  /** io: what goes in; step: a stage or gate; result: what comes out */
  steps: { label: string; detail: string; kind?: 'io' | 'step' | 'result' }[];
}

export interface ToolDef {
  slug: string;
  name: string;
  /** short label under the title */
  tagline: string;
  /** one-to-two sentence positioning statement */
  summary: string;
  version: string;
  license: string;
  /** display form of the supported interpreter range */
  python: string;
  install: string;
  /** a real command worth putting in a hero block */
  quickstart: string;
  pypi: string;
  repo: string;
  changelog?: string;
  /**
   * Whether the package is one of the nine Chimera ecosystem repositories.
   * quantfit is deliberately NOT — it is an independent tool that productizes
   * the safety-under-quantization research line. The "9 repositories" count
   * must not move because a tool page exists.
   */
  ecosystem: boolean;
  /**
   * Display form of the PyPI download count, always phrased as a floor.
   * Moves on its own between releases — re-check at pepy.tech rather than
   * assuming the last value still holds.
   */
  downloads?: string;
  /** the honesty commitment each tool leads with — its actual differentiator */
  principle: { title: string; body: string };
  /** the tool's decision path, from its README */
  pipeline?: ToolPipeline;
  commands: ToolCommand[];
  highlights: ToolHighlight[];
  evidence: ToolEvidence[];
  /** stated limits — published in the README, repeated here rather than hidden */
  limits: string[];
}

export const CHIMERAFORGE_TOOL: ToolDef = {
  slug: 'chimeraforge',
  name: 'Chimeraforge',
  tagline: 'LLM deployment planner',
  summary:
    'Turns "which model, quantization, GPU, and backend — how many, will it fit, will it hit my SLO, what will it cost" into a fast, measured answer from your shell, your Python, or your AI assistant.',
  version: '0.34.0',
  license: 'MIT',
  python: '3.10 – 3.14',
  install: 'pip install chimeraforge',
  quickstart: 'uvx chimeraforge plan --model-size 8b --hardware "RTX 4090 24GB"',
  pypi: 'https://pypi.org/project/chimeraforge/',
  repo: 'https://github.com/Sahil170595/Chimeraforge',
  changelog: 'https://github.com/Sahil170595/Chimeraforge/blob/main/CHANGELOG.md',
  ecosystem: true,
  downloads: '28,000+',
  principle: {
    title: 'The trust principle',
    body: 'Every number is labeled measured, extrapolated, derived, estimated, or unknown — and the tool refuses to fake the ones it cannot stand behind. VRAM and KV-cache are derived: exact arithmetic over the model’s real architecture, not a measurement. Throughput is a measured lookup only on the rig the corpus was measured on; on any other GPU it is scaled by memory bandwidth and labeled extrapolated, otherwise an explicit roofline estimate, never dressed up as data. Quality below the bundled corpus reports unknown rather than an invented score, and a zero-result plan names the exact gate that rejected every candidate.',
  },
  // README: "a 5-gate pipeline: VRAM -> quality -> safety (opt-in) -> latency
  // -> budget", and its "What's modeled" table for how each gate is computed
  pipeline: {
    title: 'How plan decides',
    caption: 'Every candidate passes five gates in order; a plan that finds nothing names the gate that stopped it.',
    steps: [
      { label: 'Candidates', detail: 'model × quantization × backend × replicas × batch', kind: 'io' },
      { label: 'VRAM', detail: 'weights and KV-cache from the real architecture' },
      { label: 'Quality', detail: 'measured, estimated, or unknown' },
      { label: 'Safety', detail: 'opt-in: the TR134/TR142 refusal-rate lookup' },
      { label: 'Latency', detail: 'TTFT and TPOT against your SLO' },
      { label: 'Budget', detail: 'GPU $/hr × fleet size' },
      { label: 'Plan', detail: 'the cheapest config that meets your SLO', kind: 'result' },
    ],
  },
  commands: [
    { name: 'plan', summary: 'predictive capacity planner' },
    { name: 'suggest', summary: 'discover and rank models that fit' },
    { name: 'measure', summary: 'benchmark live, plan on real numbers' },
    { name: 'workload', summary: 'derive plan inputs from real traffic' },
    { name: 'validate', summary: 'audit predictions against measurements' },
    { name: 'catalog', summary: 'local model catalog' },
    { name: 'safety', summary: 'live refusal screen' },
    { name: 'bench', summary: 'live inference benchmarking' },
    { name: 'eval', summary: 'quality evaluation' },
    { name: 'compare', summary: 'diff benchmark runs' },
    { name: 'refit', summary: 'update planner coefficients' },
    { name: 'report', summary: 'generate reports' },
    { name: 'mcp', summary: 'serve the planner to AI assistants' },
  ],
  highlights: [
    {
      title: 'Model-agnostic planning',
      body: 'Plan any registry name, Ollama tag, or HuggingFace repo — not just a bundled list. Tensor-parallel splitting for models too big for one card, and a KV-cache trade-off menu across cost, latency, and quality.',
    },
    {
      title: 'An MCP server',
      body: 'chimeraforge mcp exposes the same planner to Claude, Cursor, and other MCP clients, so an assistant answers capacity questions from measured numbers instead of guessing.',
    },
    {
      title: '22 GPU profiles',
      body: 'Consumer Ampere, Ada, and Blackwell (RTX 30/40/50-series), datacenter (A100 40/80GB, H100, H200, B200, L4, T4), and AMD MI300X — each with VRAM, bandwidth, FP16 TFLOPS, TDP, and interconnect.',
    },
  ],
  evidence: [
    {
      claim: 'Capacity planning',
      detail:
        'The predictive planner and its coefficients come out of the optimization phase — KV-cache tuning, context scaling, and the capacity-planner report itself.',
      reports: ['technical-report-133'],
    },
    {
      claim: 'Throughput and scaling',
      detail:
        'Backend parity, scaling laws, and the inference-physics work behind the roofline estimates and the continuous-batching curve.',
      reports: ['technical-report-120', 'technical-report-122'],
    },
    {
      claim: 'The opt-in safety gate',
      detail:
        'The refusal-rate lookup that powers plan --safety-target is a measured table from the safety-pivot reports, not a model fitted after the fact.',
      reports: ['technical-report-134', 'technical-report-142'],
    },
    {
      claim: 'KV-cache precision',
      detail: 'The standardized FP16-versus-FP8 KV-cache battery behind the quantized-cache guidance.',
      reports: ['technical-report-149'],
    },
  ],
  limits: [
    'Speculative decoding is not modeled yet. For MoE, active-versus-total parameters are modeled, but expert parallelism and routing load imbalance are not.',
    'Quantization coverage for vLLM, TGI, and SGLang is FP16, FP8, and AWQ/GPTQ; FP8 and W4A16 quality are estimated, not measured, because the quality corpus covers GGUF k-quants only.',
    'The bundled quality corpus is 20 items, which resolves nothing smaller than about 21 percentage points, so every measured quant delta in it reports as indistinguishable from its FP16 baseline.',
    'Heterogeneous fleets assume a capability-aware request router that no serving engine ships yet.',
    'Tensor- and pipeline-parallel throughput are comms-modeled estimates, not measured, and cannot be combined in a single plan.',
    'The bundled corpus is fit primarily on one rig (RTX 4080 12GB); other GPUs scale from bandwidth and compute until you run measure.',
  ],
};

export const QUANTFIT_TOOL: ToolDef = {
  slug: 'quantfit',
  name: 'quantfit',
  tagline: 'Quantization + safety-drift CLI',
  summary:
    'Quantize an LLM — and check it still refuses what it should. Quantization makes a model cheaper to serve and can quietly strip safety behavior; a 4-bit model that answers what the full-precision model refused is a regression no perplexity number will show you.',
  version: '0.12.16',
  license: 'Apache-2.0',
  python: '3.10 – 3.14',
  install: 'pip install quantfit',
  quickstart: 'quantfit verify-safety --demo',
  pypi: 'https://pypi.org/project/quantfit/',
  repo: 'https://github.com/Sahil170595/quantfit',
  changelog: 'https://github.com/Sahil170595/quantfit/blob/main/CHANGELOG.md',
  ecosystem: false,
  downloads: '13,000+',
  principle: {
    title: 'Safety drift is a vector, not a number',
    body: 'verify-safety generates from both the unquantized baseline and the quantized model over a curated probe set, judges each response with a local classifier, and reports two axes: refusal-robustness drift (did the quant start complying with what should be refused — the dangerous direction) and over-refusal drift (did it start refusing what should be answered — the usability direction). A scalar refusal-delta can read zero while both axes move in opposite directions. Verdicts are bounded, never absolute: a no-detection result bounds the drift, it does not certify safety.',
  },
  // README, "The safety check": the probe set, the two generations, the local
  // judge, the two axes over at-risk pairs and the Wilson-bounded verdict
  pipeline: {
    title: 'How verify-safety decides',
    caption: 'Two drift axes, not one number; a no-detection result bounds the drift, it does not certify safety.',
    steps: [
      { label: 'Probe set', detail: '40 curated prompts: some to refuse, some to answer', kind: 'io' },
      { label: 'Generate', detail: 'the unquantized baseline and the quantized model' },
      { label: 'Judge', detail: 'refusal or compliance, by a local classifier' },
      { label: 'Two axes', detail: 'refusal-robustness drift and over-refusal drift' },
      { label: 'Verdict', detail: 'bounded by a Wilson 95% CI, never absolute', kind: 'result' },
    ],
  },
  commands: [
    { name: 'verify-safety', summary: 'did quantization break refusals? two-axis drift' },
    { name: 'check', summary: 'will it fit? read from HF metadata, no download' },
    { name: 'plan', summary: 'what config a heuristic would pick, and why' },
    { name: 'quantize', summary: 'run the quantization across the method matrix' },
    { name: 'probe', summary: 'per-bit-width quantization sensitivity' },
    { name: 'gate', summary: 'pre-release CI check that refuses to pass on thin evidence' },
    { name: 'screen', summary: 'run a target set to QSR spec' },
    { name: 'reproduce', summary: 'decide whether one report reproduces another' },
    { name: 'audit', summary: 'hold the docs to the code — exit 3 on drift' },
    { name: 'emit', summary: 'render any drift report as a model card' },
    { name: 'list', summary: 'the supported method × scheme matrix' },
    { name: 'calibrate', summary: 'build and ingest calibration sheets' },
  ],
  highlights: [
    {
      title: 'Method × scheme matrix',
      body: 'AWQ, GPTQ, SmoothQuant, FP8, and RTN through one llm-compressor backend (vLLM-loadable), plus GGUF via llama.cpp. Schemes span W4A16 through NVFP4 and MXFP4.',
    },
    {
      title: 'Honest capacity, up front',
      body: 'check reads HuggingFace metadata without downloading and sorts the job into fits-VRAM, fits-RAM-via-sequential-onloading, or refuse — naming the real limit. No OOM twenty minutes into a run.',
    },
    {
      title: 'Built to be checked',
      body: 'Reports follow a written spec (QSR), reproduce decides whether one run reproduces another, and audit holds the documentation to the code — exit code 3 when they drift apart.',
    },
  ],
  evidence: [
    {
      claim: 'Quantization erodes alignment',
      detail:
        'The finding the tool exists to operationalize: alignment behavior degrades under quantization in ways quality metrics do not surface.',
      reports: ['technical-report-134'],
    },
    {
      claim: 'Quality is not a safety proxy',
      detail:
        'The quality-safety divergence work — and the refusal-threat index behind the judging methodology — established that a good perplexity number tells you nothing about preserved refusals.',
      reports: ['technical-report-142'],
    },
  ],
  limits: [
    'It ships transparent config help, not auto-quantization: you pass --method. Learned routing exists as published research but is explicitly out of scope.',
    'At over-VRAM sizes use gptq — AWQ’s grid search is transfer-bound under sequential onloading.',
    'FP4 schemes need Blackwell to serve, though quantfit can produce them anywhere.',
    'The probe set is 40 curated prompts; a no-detection result bounds drift rather than certifying safety.',
  ],
};

export const TOOLS: ToolDef[] = [CHIMERAFORGE_TOOL, QUANTFIT_TOOL];

export function toolBySlug(slug: string): ToolDef | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}
