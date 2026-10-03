import { MEASUREMENTS, REPORTS } from './constants';
import { formatMonth, monthIndex, parseSpan } from './timeline';
import { CHIMERAFORGE_TOOL, QUANTFIT_TOOL } from './tools';

// The /work page's content (owner copy from résumé v8, with the PhD CV v4 of
// 2026-09-21 winning where the two disagree), kept apart from its layout
// (app/work/page.tsx), so the page test can hold every sentence to it.

/** the page title: the name /about already builds under ("Built by …") */
export const WORK_TITLE = 'Sahil Kadadekar';

/** the owner's headline, verbatim: the standfirst under the title */
export const HERO_HEADLINE =
  'Founding ML engineer building production agentic and inference systems for clinical AI, cybersecurity, and model deployment.';

// public model repositories on huggingface.co/Crusadersk (HF API, 2026-09-22)
const HUGGING_FACE_MODELS = 23;

// a download count as tools.ts states it, a floor: "28,000+"
const DOWNLOAD_FLOOR = /^(\d{1,3}(?:,\d{3})*)\+$/;
const THOUSAND = 1000;

export function downloadFloor(display: string): number {
  const match = DOWNLOAD_FLOOR.exec(display);
  if (!match) throw new Error(`[work] cannot read the download floor "${display}"; expected e.g. "28,000+"`);
  return Number(match[1].replace(/,/g, ''));
}

/** both packages' floors summed, so the lede moves with tools.ts */
export const COMBINED_PYPI_DOWNLOADS = `${Math.floor(
  [CHIMERAFORGE_TOOL, QUANTFIT_TOOL].reduce((sum, tool) => sum + downloadFloor(tool.downloads ?? ''), 0) / THOUSAND,
)}K+`;

export const HERO_SUMMARY = `Architected Attunica's AWS clinical platform, live in 2 pilots including a 120-therapist clinic; at GhostEye (YC S25), shipped Beacon to 5 enterprise pilots, cutting conversation LLM costs 30–80%. Built Chimera, a six-subsystem constitutional AI platform backed by ${REPORTS.DISPLAY} reports / ${MEASUREMENTS.SHORT} measurements, 2 workshop-accepted papers (the ICML 2026 Workshop on Hypothesis Testing and the NeurIPS 2026 Workshop on Foundation and Large Model Security), 1 more under double-blind review, 2 public arXiv preprints, six merged upstream fixes, ${HUGGING_FACE_MODELS} Hugging Face models, and two PyPI tools with ${COMBINED_PYPI_DOWNLOADS} downloads.`;

export interface ResearchItem {
  label: string;
  href: string;
  /** the résumé's right-hand annotation for the entry */
  meta?: string;
  bullets: string[];
  evidence?: { label: string; href: string }[];
}

// Externally checkable evidence first: every entry here resolves to a public
// artifact (repo, PR, preprint, package, model).
export const RESEARCH: ResearchItem[] = [
  {
    label: 'ICML 2026 Agent Reproducibility Challenge',
    href: 'https://github.com/Sahil170595/icml2026-paper-reproductions',
    meta: '48 papers · 118 claims · 297 pts, #26 of 1,221 (top 2.1%)',
    bullets: [
      'Built an autonomous, provider-neutral producer/reviewer/root-coordinator pipeline under per-paper evidence contracts fixed before execution; no human-intervention loops, no paper code reused, with every command, exit code, and output hash logged. A 4-paper concurrent calibration wave reached independent review in 27m42s; challenge referees scored each runnable Hugging Face Space.',
      "Two of the 3 official falsifications were Hierarchical Successor Representation claims, the third a nonparametric-regression re-calibration; my scaled DropoutTS rerun also failed its +46% robustness headline (independently corroborated; referee-scored toy), while spectral-bound theory reproduced to machine precision (1e-16 residuals).",
    ],
  },
  {
    label: 'LLM Safety Research & Evaluation Infrastructure',
    href: '/reports',
    meta: `${REPORTS.DISPLAY} reports / ${MEASUREMENTS.SHORT} measurements · 2 accepted + 1 under review + 2 preprints`,
    bullets: [
      'Built the Banterhearts execution substrate: shared multi-backend evaluation and serving harnesses (Transformers, Ollama, ONNX, vLLM, SGLang, TGI), per-sample JSONL provenance, seed/config/git manifests, checkpointed OpenAI/Anthropic batch judges, disagreement-aware triangulation, fail-closed analyzers, and frozen-byte paper packages under dependency-locked CI.',
      'Led the independent program across training, deployment, and inference: consumer-GPU discovery with bounded A100 confirmation; pre-registered paired designs, bootstrap CIs, TOST, and Holm-Bonferroni. Presented at the ICML 2026 Workshop on Hypothesis Testing; accepted at the NeurIPS 2026 Workshop on Foundation and Large Model Security (safety-embedding directions, the first paper on Chimera’s own thesis); 1 more paper under double-blind review; two studies public on arXiv, on quantization safety and temperature-zero speculative decoding. Every paper is first-author.',
      'Tested three serving-performance assumptions: an M/D/1 model with linear parallel-service scaling underestimated queue wait by up to 20.4×; Ollama NUM_PARALLEL changes showed no significant effect in 30 contrasts; direct PyTorch lost more per-agent throughput than Ollama as concurrency rose from one to eight (86.4% versus 82.1%). A separate N=8 comparison found up to 2.25× vLLM throughput over Ollama.',
      'Isolated deployment effects with a 78,183-row, four-stack ablation; separate safety experiments found chat-template divergence could exceed numerical-precision effects. Designed controls for backend, template, and concurrency identity so changes in the serving environment were not misattributed to model weights; deployment rules include Q4_K_M and compile-prefill-only on Linux.',
      'The TAIS preprint examines output differences and refusal behavior under temperature-zero speculative decoding.',
      'Across two shared anchor models, normalized safety-score changes split 57% quantization, 41% backend, and 2% concurrency: descriptive shares, not a causal decomposition. Across 18 models / 10+ families (15 scored), alignment type showed no statistically detectable association with fragility (p=0.942) and 4 mechanistic probes failed to predict it, while output instability was strongest (r=0.909).',
      'Showed safety can degrade 13.9× faster than quality under quantization and found hidden refusal degradation in 7 of 11 AWQ/GPTQ conditions; the Refusal Template Stability Index (RTSI) triages them for direct testing. Shipped RTSI + JTP and RTSI-gated routing, recovering 76% of the refusal gap by routing the riskiest 20% of configurations (LOOCV AUC 0.84).',
      'Isolated FP8 KV-cache precision in 24,054 paired records, then replicated the null on 7,578 records / 12 of 12 TOST-equivalent cells.',
    ],
    evidence: [
      { label: 'arXiv:2605.27763 — ICML 2026 workshop paper, presented', href: 'https://arxiv.org/abs/2605.27763' },
      {
        label: 'arXiv:2610.01801 — accepted at the NeurIPS 2026 Workshop on Foundation and Large Model Security',
        href: 'https://arxiv.org/abs/2610.01801',
      },
      { label: 'arXiv:2606.10154', href: 'https://arxiv.org/abs/2606.10154' },
      { label: 'arXiv:2606.25097 — TAIS preprint', href: 'https://arxiv.org/abs/2606.25097' },
    ],
  },
  {
    label: 'Chimeraforge — LLM deployment planner',
    href: 'https://pypi.org/project/chimeraforge/',
    meta: `v${CHIMERAFORGE_TOOL.version} · ${CHIMERAFORGE_TOOL.downloads} downloads · 2,066 tests`,
    bullets: [
      'A 13-command CLI/Python/MCP planner (five MCP tools) that ingests JSONL or live vLLM/SGLang telemetry; searches model × quantization × backend × GPU/TP/PP plans across heterogeneous fleets; propagates weakest-source evidence; predicts VRAM, TTFT/TPOT, throughput, KV-cache/offload, prefix caching, multi-LoRA, cost, and energy; and emits vLLM/TGI/SGLang/Ollama launch commands, API break-even, and provenance briefs.',
      'Made its evidence hierarchy executable: every estimate is labeled measured, extrapolated, derived, estimated, or unknown; validation separates in-corpus lookup from out-of-sample estimates, and --expect-fingerprint aborts if the pre-registered matrix changes. Validated on within-registry record-level holdouts: VRAM R²=.968, throughput R²=.859, composite quality RMSE=.062 (0–1 scale), latency MAPE=1.05%; stale prices and unsupported estimates fail closed.',
    ],
    evidence: [
      {
        label: 'MCP Registry',
        href: 'https://registry.modelcontextprotocol.io/v0/servers/io.github.Sahil170595%2Fchimeraforge/versions/latest',
      },
    ],
  },
  {
    label: 'quantfit — quantization safety measurement CLI',
    href: 'https://pypi.org/project/quantfit/',
    meta: `v${QUANTFIT_TOOL.version} · ${QUANTFIT_TOOL.downloads} downloads · 1,369 tests`,
    bullets: [
      'Implements QSR spec v0, a versioned quantization-safety measurement protocol, across AWQ/GPTQ/SmoothQuant/FP8/RTN/GGUF with capacity preflight; its two-axis release gate (refusal robustness + over-refusal) uses at-risk denominators, Wilson CIs/power and minimum-detectable-effect checks, revision-pinned artifacts, exact-engine provenance, stable JSON/exit codes, and JUnit where unmeasured axes skip rather than pass.',
      'Completed a 15-target screen (14 measured; 0 dangerous-axis regressions across 12 GGUF + 2 compressed-tensor targets) with a passing sensitivity control; calibrated and replaced a judge with 56.2% false positives, then human-adjudicated 11 flags (6 real, 5 judge errors), preventing an approximately 2× overclaim. Cross-hardware T0 replications invalidated an apparent safety breach, so I voided the result rather than publish it.',
    ],
  },
  {
    label: `Hugging Face — ${HUGGING_FACE_MODELS} model releases`,
    href: 'https://huggingface.co/Crusadersk',
    bullets: [
      `Published ${HUGGING_FACE_MODELS} Hugging Face models: 11 AWQ/GPTQ 4-bit + 6 FP8-Dynamic releases across Llama 3.2, Qwen 2.5, Mistral, Gemma 2, and Phi-2; 4 GPT-2 scaling variants; the MedMCQA Dr.GRPO LoRA adapter; and a ModernBERT refusal classifier (0.9773 macro F1 on 441 unambiguous XSTest GPT-4 responses, trained on WildGuardMix).`,
    ],
    evidence: [
      {
        label: 'quantsafe-refusal-modernbert',
        href: 'https://huggingface.co/Crusadersk/quantsafe-refusal-modernbert',
      },
      {
        label: 'qwen2.5-1.5b-medmcqa-drgrpo-lora',
        href: 'https://huggingface.co/Crusadersk/qwen2.5-1.5b-medmcqa-drgrpo-lora',
      },
    ],
  },
  {
    label: 'QuantSafe Certifier',
    href: 'https://huggingface.co/spaces/build-small-hackathon/quantsafe-certifier',
    bullets: [
      'Shipped the QuantSafe Certifier (≤32B): 4-delta refusal screen, semantic cross-check, multi-judge stack, constitutional debate, and Ed25519-signed certificates.',
    ],
    evidence: [
      { label: 'HF blog', href: 'https://huggingface.co/blog/build-small-hackathon/quantsafe' },
      {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/posts/sahilkadadekar_quantsafe-certifier-a-hugging-face-space-activity-7472355496486711296-Rgl9',
      },
      { label: 'X thread', href: 'https://x.com/KadadekarSahil/status/2066592448172720210' },
    ],
  },
  {
    label: 'vLLM PR #45207 — merged',
    href: 'https://github.com/vllm-project/vllm/pull/45207',
    bullets: [
      'Merged vLLM PR #45207 (benchislett-approved, merge 55da232): fixed a KV-cache page-size unification crash for hybrid Mamba/attention models by preserving Mamba block granularity while padding pages through page_size_padded; regression test added (fixes #43626), then independently reproduced on NVFP4 + DFlash speculative serving.',
    ],
    evidence: [{ label: 'Fixes vLLM #43626', href: 'https://github.com/vllm-project/vllm/issues/43626' }],
  },
  {
    label: 'PyTorch PR #175562 — merged',
    href: 'https://github.com/pytorch/pytorch/pull/175562',
    bullets: [
      'Landed upstream via PyTorch PR #175562 (jansel-approved, be90a14, shipped in 2.13 stable): torch.compile / CUDAGraph trees dealloc hardening against diagnostic-metadata divergence + CUDA regression test; isolated compiled-decode failure #175557 and validated maintainer PR #184102.',
    ],
    evidence: [
      { label: 'Issue #175557', href: 'https://github.com/pytorch/pytorch/issues/175557' },
      { label: 'Maintainer PR #184102', href: 'https://github.com/pytorch/pytorch/pull/184102' },
      {
        label: 'Validation gist + repro',
        href: 'https://gist.github.com/Sahil170595/062d40cb18e2b2e27e99c1efbfa3ccdb',
      },
    ],
  },
  {
    label: 'PyTorch PR #190555 — merged',
    href: 'https://github.com/pytorch/pytorch/pull/190555',
    bullets: [
      'Merged PyTorch PR #190555 (jansel-approved, 0b96f88; Inductor): split cross-device extern kernels out of CUDA-graph partitions, which were capturing CPU storage and failing memory-pool checks; same-device kernels stay graph-eligible, with regressions for custom ops, multi-output ops, index_put, and SDPA dropout.',
    ],
  },
  {
    label: 'PyTorch PR #199075 — merged',
    href: 'https://github.com/pytorch/pytorch/pull/199075',
    bullets: [
      "Merged PyTorch PR #199075 (guilhermeleobas-approved, 0055968; Dynamo): Python random float draws were traced as float32 while Inductor's CPU kernels received float64 buffers, so x * rng.random() returned values around -9e34; the graph input now uses the same full-precision conversion as runtime, with an Inductor regression test (fixes #198187).",
    ],
    evidence: [{ label: 'Fixes PyTorch #198187', href: 'https://github.com/pytorch/pytorch/issues/198187' }],
  },
  {
    label: 'Ollama PR #16669 — merged',
    href: 'https://github.com/ollama/ollama/pull/16669',
    bullets: [
      "Merged Ollama PR #16669 (dhiltgen-approved, commit fc58544): root-caused two enumeration bugs in Ollama's Go discovery path causing inverted iGPU/dGPU Vulkan classification on Windows hybrid graphics; about 9× faster inference on the affected system, with regression tests for both failure modes.",
    ],
  },
  {
    label: 'Triton PR #10819 — merged',
    href: 'https://github.com/triton-lang/triton/pull/10819',
    bullets: [
      'Merged Triton PR #10819 (peterbell10-approved, b92dc43): fixed a tl.flip compile-time crash on the documented default dim=None — resolve the dim before the bounds assert + add a dim=None test (fixes #10790).',
    ],
    evidence: [
      { label: 'Fixes Triton #10790', href: 'https://github.com/triton-lang/triton/issues/10790' },
      {
        label: 'PR #10822 — backend gather fallback (closed unmerged)',
        href: 'https://github.com/triton-lang/triton/pull/10822',
      },
    ],
  },
  {
    label: 'Earlier publications',
    href: 'https://doi.org/10.22214/ijraset.2023.55647',
    meta: 'IJRASET 2023 · JETIR 2022',
    bullets: [
      'Digital Currency Price Prediction using Machine Learning. Sahil Kadadekar, Sumaiya Shaikh, Isheeta Shahir, Hemantkumar Mali, and Rupesh Jaiswal. IJRASET 11(9):338–355, 2023.',
      'Machine Learning Based Car Damage Identification. Mansi Satpute, Sahil Kadadekar, and Rupesh C. Jaiswal. JETIR 9(10):b684–b690, 2022.',
    ],
    evidence: [{ label: 'JETIR 2022 (PDF)', href: 'https://www.jetir.org/papers/JETIR2210195.pdf' }],
  },
];

export interface Experience {
  role: string;
  company: string;
  /** the company's own site */
  href?: string;
  location: string;
  dates: string;
  bullets: string[];
}

export const EXPERIENCE: Experience[] = [
  {
    role: 'Founding Machine Learning Engineer',
    company: 'GhostEye Inc. (YC S25)',
    href: 'https://ghosteye.ai',
    location: 'New York, USA',
    dates: 'Dec 2025 – Mar 2026',
    bullets: [
      "Built Beacon, GhostEye's multi-agent JIT security training, in 90 days across web, Slack/Teams, SMS/RCS, WhatsApp, Telegram, voice, and email; 5 enterprise pilots (a top-10 global asset manager, a Fortune-100 cloud platform, Eight Sleep, Fella Health, ZeroPath). The asset manager pilot cut phishing click rate 58% and tripled reporting within one quarter; a shared JIT agent personalized remediation from vectorized phishing/vishing/smishing/deepfake failure histories.",
      'Fine-tuned self-hosted Llama-3-70B for phishing simulation (domain adaptation) via LoRA/QLoRA + DeepSpeed on 1M+ NIST-grounded emails (vendor impersonation, typosquat logins). Built Go orchestration for credential-harvest pages/session-cookie capture, traced scoring/adversarial logs, Azure tenant auth, country-code routing, STT/TTS fallback, and SCORM/Vanta reporting aligned to SOC 2/NIST/ISO 27001/GDPR.',
      // v8 adds a speedup multiplier here that the 2026-09-21 CV withdrew
      // (publicClaims.test.ts WITHDRAWN); the qualified latency stays
      'Cut deepfake phishing simulation streaming response latency from about 40s in early benchmarks to 100–450 ms by rebuilding the pipeline as a multi-agent WebRTC system spanning synchronized video rendering, voice generation, human-like scheduling, and retry-aware delivery.',
      'Built analytics/evals for Vapi voice, self-hosted SMS simulation, and the training pipeline (TTFT, tokens/query, tokens/sec; in-house LangGraph evals, Kafka/ClickHouse scheduling and logging); cut per-turn latency from 5–7s to 0.5–1.5s with barge-in, streaming, caching, and summarization; caching and summarization cut conversation LLM costs 30–80%, with larger savings on longer conversations.',
      'Built C-suite OSINT knowledge graphs for enterprise clients incl. Fortune-100 (Firecrawl into Amazon Neptune, TinkerPop/Gremlin; 5K+ nodes per graph); fixed Neptune overload by restructuring around cross-executive overlap and per-executive connectivity; cut amortized render from ~360 to ~60 ms per node (83% lower) via caching and engagement-ranked level-of-detail loading.',
    ],
  },
  {
    role: 'Co-Founder & Head of Engineering',
    company: 'Attunica, LLC',
    href: 'https://attunica.ai',
    location: 'New York, USA',
    dates: 'Oct 2025 – Present',
    bullets: [
      "Architected and solo-built Attunica's multimodal psychotherapy-training and evaluation platform: real-time LiveKit + Gemini + Anam sessions, durable transcripts/debriefs, and academic workflows (instructor assessments, verified recording playback); now lead a PM + 2 engineers; shipped to 2 pilots (NYU Silver MSW program; a 120-therapist clinic); HIPAA BAAs with Anthropic + AWS.",
      'Built a consent-gated, clinician-graded LLM-persona environment for measuring simulated humanity and attachment without patient data: persona text is character data, never instructions; tenant RBAC and signed BFF capabilities fence roles; immutable eval IDs, revocable consent, private versioned media, and two-channel Deepgram bind evidence to provider identity.',
      'Rebuilt session scoring as three-sample median judging over alias-verified therapist evidence (wrong-speaker citations fail closed; input 32k → 15–18k tokens); a 40-fixture judge-validity benchmark with held-out scenarios and bias probes showed debiasing moved leniency from +0.81 to within 0.13 anchors of zero (held-out weighted kappa 0.66 vs 0.05 null; model-written key) and that sample disagreement alone misses large errors; eval records distinguish no evidence from scored zero; persisted provider-attempt state separates pre-call failures from ambiguous outcomes, preventing replay of billable side effects.',
      'Led the AWS-funded production cutover with Avahi to ECS, Aurora PostgreSQL 18, and Bedrock (retired Fly/Neon/Vercel) through a 141-row production-readiness matrix in which a PR cannot weaken the checks that approve it; qualified the release candidate with PostgreSQL 18 migration rehearsals and commit-bound artifacts under IAM-scoped credentials, zero SDK retries, bounded timeouts, and no cross-provider fallback or replay.',
      // v8 also names the row-level-security gap this rollout closed; that
      // stays on the résumé, off a public page about a PHI system
      'Lead the Article 31 documentation product on AWS ECS (clinician-reviewed Claude notes/treatment plans): release-only deploys with drained, snapshotted in-VPC migrations; PHI-blind admins and psychotherapy-note authorship enforced end to end; a fail-safe restricted-role FORCE-RLS rollout; versioned clinical writes with append-only audit; on-device Whisper.',
    ],
  },
  {
    role: 'Founder & Lead ML Architect',
    company: 'Chimera',
    location: 'New York, USA',
    dates: 'Sep 2025 – Present',
    bullets: [
      'Architected a six-subsystem constitutional AI platform (2.3K+ core tests) linking a multi-provider voice/tool JARVIS gateway, calibrated router, multi-model debate, RLAIF, Rust provenance runtime, and Muse over pinned HTTP/JSON contracts. Requests traverse verifier → judge → debate → enforcement/canary/ZK; debate outputs feed retraining under drift and rollback gates.',
      'Falsified one-class safe-centroid routing across 3 corpora / 4 encoders (AUC 0.358–0.545), traced the failure to topic confounding, and replaced it with a supervised safe-minus-unsafe direction learned from labeled and debate pairs behind calibrated fast-path, debate fallback, canaries, and rollback.',
      'Selected objectives by evidence shape: generated paired debate preferences for a self-hosted Llama-3-70B student and trained/released DPO-aligned models; implemented and one-step validated ORPO, Dr.GRPO, RLOO, and REINFORCE++ trainer paths; designed KTO for unpaired constitutional verdicts under shared evaluation and promotion gates.',
      'Diagnosed zero reward variance in 76.3% of rollout groups in a preregistered Dr.GRPO + LoRA RLVR study on MedMCQA. After revising the environment prompt and remeasuring the pre-RL baseline, a second run improved held-out pass@1 from 40.6% to 49.4% (+8.8 points, n=500; McNemar p=0.00034). Released both experiments and the adapter.',
      'Built a Rust alignment runtime across 7 crates: BFT consensus, Ed25519 provenance, Merkle verification, Ristretto255 Pedersen/Schnorr ZK proofs, Arrow IPC, sandboxed tools, and CRDT state sync; every governed decision emits a signed, replayable trace.',
      "Built JARVIS's governed temporal memory with a typed replay op-log, live write/recall, encryption, DSR/erasure fences, approval-gated destructive actions, and 5 channel adapters; external LongMemEval/LoCoMo gates shipped chunked retrieval (+7.31pp R@1) and timestamp evidence (+30.67pp LoCoMo-WHEN) while rejecting regressions. Muse converts OTel/ClickHouse traces into signed watcher → triager → fixer remediation records.",
    ],
  },
  {
    role: 'Co-Founder',
    company: 'Stealth Startup in Medical AI',
    location: 'New York, USA',
    dates: 'Oct 2023 – Aug 2025',
    bullets: [
      'Led 3 engineers + 1 clinician across 5 institutions building an ML-guided diagnostic platform (3 clinical domains, 1K+ cases) on AWS (Lambda, SageMaker, Bedrock, SQS/DLQs) + Qdrant RAG under HIPAA; 75% lower infrastructure cost.',
    ],
  },
  {
    role: 'Graduate Project — Visual Anomaly Detection',
    company: 'New York University',
    location: 'New York, USA',
    dates: 'Sep 2024 – Dec 2024',
    bullets: [
      'Implemented and benchmarked PatchCore and FastFlow on MVTec-AD using per-category AUROC; built a FastAPI service with Qdrant retrieval to return the five most visually similar anomalies for inspection.',
    ],
  },
  {
    role: 'Research Engineer — BCI, EEG & Medical Imaging',
    company: 'PICT + Cross-Institutional Research Collaborations',
    location: 'Pune, India',
    dates: 'Nov 2020 – Sep 2023',
    bullets: [
      'Adapted a channel-fused Dense CNN for BCI Competition IV-2a four-class motor imagery from 22-channel, 250-Hz EEG; deployed real-time inference in a physical NVIDIA Jetson prototype, improved preprocessing throughput 35% via pinned memory and asynchronous CPU–GPU transfers, and earned PICT Honors in AI & ML through the work.',
      'Studied five-class diabetic-retinopathy grading over 92K+ fundus scans (1.2 TB), comparing about ten attention mechanisms with clinician-facing SHAP analyses; sharded loading and multi-GPU training improved training throughput 4×.',
      'Built DenseNet201 dental classification over 1K+ expert-annotated cases and 40K+ images; dataset and annotation protocols were adopted by 5+ research teams and received institutional copyright L-122721/2023.',
    ],
  },
];

const startMonth = (job: Experience) => monthIndex(parseSpan(job.dates).start);
const CHRONOLOGICAL = [...EXPERIENCE].sort((a, b) => startMonth(a) - startMonth(b));
const STILL_RUNNING = EXPERIENCE.filter((job) => parseSpan(job.dates).end === null).length;
const FIRST_START = formatMonth(parseSpan(CHRONOLOGICAL[0].dates).start);

/**
 * The roles on one time axis, the page's figure (components/ui/TimelineFigure):
 * oldest first, each by its company and role, drawn from its dates as written.
 */
export const CAREER_TIMELINE = {
  title: 'Roles over time',
  caption: `${EXPERIENCE.length} roles since ${FIRST_START}; the ${STILL_RUNNING} still running reach the present.`,
  lanes: CHRONOLOGICAL.map((job) => ({ label: job.company, detail: job.role, dates: job.dates })),
};

// PhD2027_v4's service list; all reviews completed
export const SERVICE = [
  {
    role: 'NeurIPS 2026 reviewer',
    detail:
      'Workshops: FLMSec (2), JUDGe (3), RTCA (5). Ethics: main conference (1), Evaluations & Datasets track (1). All 12 reviews completed.',
    dates: '2026',
  },
  {
    role: 'Journal reviewer',
    detail:
      'Advances in Artificial Intelligence and Machine Learning (AAIML; ISSN 2582-9793), a Scopus- and Web of Science-indexed journal. One review completed.',
    dates: '2026',
  },
  {
    role: 'Hackathon judge',
    detail: 'Build for the Border (May 2026) and AI Healthcare Hack NYC (Jul 2026).',
    dates: '2026',
  },
];

export const EDUCATION = [
  {
    school: 'New York University — Tandon School of Engineering',
    location: 'New York, USA',
    degree: 'M.S. in Computer Science',
    detail: 'GPA: 3.5/4.0',
    dates: 'May 2025',
  },
  {
    school: 'Pune Institute of Computer Technology',
    location: 'Pune, India',
    degree: 'B.E. in Electronics & Telecommunications, Honors in AI & ML',
    detail: 'CGPA: 9.1/10.0',
    dates: 'Aug 2022',
  },
];

export const SKILLS = [
  {
    label: 'LLM systems',
    items:
      'PyTorch, Transformers, DeepSpeed, Accelerate, Ray, vLLM, SGLang, TGI, TensorRT-LLM, llama.cpp/GGUF, continuous batching, KV-cache optimization, speculative decoding',
  },
  {
    label: 'Inference optimization',
    items:
      'CUDA, Vulkan, Triton, TensorRT, FlashAttention, ONNX Runtime, torch.compile, Nsight Systems/Compute, NVIDIA DALI, GPTQ, AWQ, FP8, INT4/INT8',
  },
  {
    label: 'Post-training & evals',
    items:
      "LoRA/QLoRA, DPO, ORPO, KTO, GRPO, Dr.GRPO, DAPO, RLOO, REINFORCE++, RLAIF, PRM/ORM routing, WARM judges, TOST equivalence, Holm-Bonferroni, Cohen's d, LOOCV, SHAP, SciPy",
  },
  {
    label: 'Product stack',
    items:
      'Python, Go, Rust, TypeScript, SQL, C++, C#, FastAPI, Next.js, React, PostgreSQL/pgvector, Redis, ClickHouse, Qdrant, DynamoDB, Docker, Kubernetes, AWS (ECS, Bedrock, Aurora), Azure',
  },
  {
    label: 'Voice & agents',
    items:
      'LangGraph, LangSmith, MCP, LiveKit, Gemini Realtime, Whisper STT, TTS, WebRTC streaming, multi-provider gateways',
  },
];

export interface WorkLink {
  label: string;
  href: string;
}

/** the rail's one call to action, first in it */
export const PROFILE_CTA: WorkLink = { label: 'Papers', href: '/papers' };

/** the profile links under it */
export const PROFILE_LINKS: WorkLink[] = [
  { label: 'GitHub', href: 'https://github.com/Sahil170595' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/sahilkadadekar' },
  { label: 'ORCID', href: 'https://orcid.org/0000-0002-7139-1251' },
];

/** where the page leads next */
export const NEXT_LINKS: WorkLink[] = [
  { label: 'Papers', href: '/papers' },
  { label: 'Research Archive', href: '/reports' },
  { label: 'Platform', href: '/platform' },
  { label: 'About', href: '/about' },
];
