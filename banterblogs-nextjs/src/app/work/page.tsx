import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink, GraduationCap, Briefcase, Code2, Github, Linkedin } from 'lucide-react';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { CHIMERAFORGE_TOOL, QUANTFIT_TOOL } from '@/lib/tools';

const METADATA_DESCRIPTION =
  'ML engineer and independent researcher · LLM serving and quantization safety, constitutional AI systems, upstream PyTorch/vLLM/Ollama/Triton fixes. An accepted ICML 2026 workshop paper, technical reports, and two PyPI tools.';

export const metadata: Metadata = {
  alternates: { canonical: '/work' },
  title: 'Work',
  description: METADATA_DESCRIPTION,
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Work | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/work',
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Work | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

const HERO_HEADLINE =
  'Founding ML engineer building production agentic and inference systems for clinical AI, cybersecurity, and model deployment.';

const HERO_SUMMARY = `Architected Attunica's multimodal psychotherapy platform and AWS ECS/Bedrock cutover; at GhostEye (YC S25), shipped security agents to 5 enterprise pilots and cut deepfake latency 80–400×. Built Chimera, a six-subsystem constitutional AI platform backed by ${REPORTS.DISPLAY} reports / ${MEASUREMENTS.SHORT} measurements, 9 sole-author 2026 papers (1 accepted at an ICML 2026 workshop; 8 under double-blind review), four upstream contributions, 22 Hugging Face models, and two PyPI tools with 37K+ downloads.`;

interface ResearchItem {
  label: string;
  href: string;
  /** the résumé's right-hand annotation for the entry */
  meta?: string;
  bullets: string[];
  evidence?: { label: string; href: string }[];
}

// Externally checkable evidence first: every entry here resolves to a public
// artifact (repo, PR, preprint, package, model).
const RESEARCH: ResearchItem[] = [
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
    meta: `${REPORTS.DISPLAY} reports / ${MEASUREMENTS.SHORT} measurements · 1 accepted + 8 under double-blind review`,
    bullets: [
      'Built the Banterhearts execution substrate: shared multi-backend evaluation and serving harnesses (Transformers, Ollama, ONNX, vLLM, SGLang, TGI), per-sample JSONL provenance, seed/config/git manifests, checkpointed OpenAI/Anthropic batch judges, disagreement-aware triangulation, fail-closed analyzers, and frozen-byte paper packages under dependency-locked CI.',
      'Led the sole-author program across training, deployment, and inference: consumer-GPU discovery with bounded A100 confirmation; pre-registered paired designs, bootstrap CIs, TOST, and Holm-Bonferroni. Accepted: ICML 2026 Workshop on Hypothesis Testing; under double-blind review: 3 main-track and 5 workshop submissions spanning quantization safety, judge reliability, multi-turn jailbreak risk, prompt-template transfer, serving state, and reproducibility. Reviewer for three ML workshops and for Advances in Artificial Intelligence and Machine Learning (AAIML), a Scopus-indexed journal.',
      "Reported 3 pre-registered negative results against my own models: M/D/1 queueing missed observed continuous-batching latency by 20.4×; NUM_PARALLEL had no detectable effect (0/30 significant); PyTorch Direct caused larger safety degradation than Ollama. A 78,183-row 4-stack ablation isolated its N=2 concurrency failure and vLLM/TGI's 2.25× gain at N=8; deployment rules include Q4_K_M and compile-prefill-only on Linux.",
      "The TAIS preprint found no detectable safety divergence under speculative decoding at temperature zero across 60,849 matched samples: maximum absolute Cohen's h = 0.024, with 25/27 per-task TOST contrasts within ±3pp.",
      'Decomposed the measured safety tax to quantization 57%, backend 41%, concurrency 2%; across 18 models / 10+ families, alignment type (p=0.942) and 4 mechanistic probes failed to predict fragility, while output instability was strongest (r=0.91) and chat-template divergence sometimes exceeded precision effects.',
      'Showed safety can degrade 13.9× faster than quality under quantization; isolated FP8 KV-cache precision in 24,054 paired records, then replicated the null on 7,578 records / 12 of 12 TOST-equivalent cells. Shipped RTSI + JTP and RTSI-gated routing, recovering 76% of the refusal gap by routing the riskiest 20% of configurations (LOOCV AUC 0.84).',
    ],
    evidence: [
      { label: 'arXiv:2605.27763 — accepted ICML 2026 workshop paper', href: 'https://arxiv.org/abs/2605.27763' },
      { label: 'arXiv:2606.10154', href: 'https://arxiv.org/abs/2606.10154' },
      { label: 'arXiv:2606.25097 — TAIS preprint', href: 'https://arxiv.org/abs/2606.25097' },
    ],
  },
  {
    label: 'Chimeraforge — LLM deployment planner',
    href: 'https://pypi.org/project/chimeraforge/',
    meta: `v${CHIMERAFORGE_TOOL.version} · ${CHIMERAFORGE_TOOL.downloads} downloads · 1,571 tests`,
    bullets: [
      'A 13-command CLI/Python/MCP planner that ingests JSONL or live vLLM/SGLang telemetry; searches model × quantization × backend × GPU/TP/PP plans across heterogeneous fleets; propagates weakest-source evidence; predicts VRAM, TTFT/TPOT, throughput, KV-cache/offload, prefix caching, multi-LoRA, cost, and energy; and emits vLLM/TGI/SGLang/Ollama launch commands, API break-even, and provenance briefs.',
      'Made its evidence hierarchy executable: every estimate is labeled measured, extrapolated, derived, estimated, or unknown; validation separates in-corpus lookup from out-of-sample estimates, and --expect-fingerprint aborts if the pre-registered matrix changes. Measured validation: VRAM R²=.968, throughput R²=.859, quality RMSE=.062, latency MAPE=1.05%; stale prices and unsupported estimates fail closed.',
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
      'Implements QSR spec v0, a versioned quantization-safety measurement protocol, across AWQ/GPTQ/SmoothQuant/FP8/RTN/GGUF; its two-axis release gate (refusal robustness + over-refusal) uses at-risk denominators, Wilson CIs/power, revision-pinned artifacts, exact-engine provenance, stable JSON/exit codes, and JUnit where unmeasured axes skip rather than pass.',
      'Completed a 15-target screen (14 measured; 0 dangerous-axis regressions across 12 GGUF + 2 compressed-tensor targets) with a passing sensitivity control; calibrated and replaced a judge with 56.2% false positives, then human-adjudicated 11 flags (6 real, 5 judge errors), preventing an approximately 2× overclaim. Cross-hardware T0 replications invalidated an apparent safety breach, so I voided the result rather than publish it.',
    ],
  },
  {
    label: 'Hugging Face — 22 model releases',
    href: 'https://huggingface.co/Crusadersk',
    bullets: [
      'Published 22 Hugging Face models: 11 AWQ/GPTQ 4-bit + 6 FP8-Dynamic releases across Llama 3.2, Qwen 2.5, Mistral, Gemma 2, and Phi-2; 4 GPT-2 scaling variants; and a ModernBERT refusal classifier (97.73% XSTest).',
    ],
    evidence: [
      {
        label: 'quantsafe-refusal-modernbert',
        href: 'https://huggingface.co/Crusadersk/quantsafe-refusal-modernbert',
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
    label: 'Ollama PR #16669 — merged',
    href: 'https://github.com/ollama/ollama/pull/16669',
    bullets: [
      'Merged Ollama PR #16669 (dhiltgen-approved, commit fc58544): root-caused two enumeration bugs causing inverted iGPU/dGPU Vulkan classification on Windows hybrid graphics; about 9× inference speedup with regression tests for both failure modes.',
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
];

interface Experience {
  role: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
}

const EXPERIENCE: Experience[] = [
  {
    role: 'Founding Machine Learning Engineer',
    company: 'GhostEye Inc. (YC S25)',
    location: 'New York, USA',
    dates: 'Dec 2025 – Mar 2026',
    bullets: [
      'Built a multi-agent security training platform in 90 days across web, Slack, Teams, SMS/RCS, WhatsApp, Telegram, voice, and email; shipped to 5 enterprise pilots: a top-10 global asset manager, a Fortune-100 cloud platform, and 3 mid-market firms (200–1000 employees). A shared JIT agent personalized remediation from vectorized phishing, vishing, smishing, and deepfake failure history.',
      'Built phishing simulation on self-hosted Llama-3-70B with domain-specific LoRA/QLoRA + DeepSpeed over a 1M+ email corpus grounded in NIST guidance, vendor impersonation, and typosquat logins; owned LangGraph/LangSmith-traced scoring, adversarial-attempt logs, Azure tenancy/auth, country-code-aware routing, STT/TTS fallback, and SCORM/Vanta reporting aligned to SOC 2, NIST, ISO 27001, and GDPR.',
      'Reduced deepfake phishing simulation from a 40s offline render to 100–450ms streaming (80–400×) by replacing it with a multi-agent WebRTC pipeline spanning synchronized video rendering, voice generation, human-like scheduling, and retry-aware delivery.',
    ],
  },
  {
    role: 'Co-Founder & Head of Engineering',
    company: 'Attunica, LLC',
    location: 'New York, USA',
    dates: 'Oct 2025 – Present',
    bullets: [
      "Architected and solo-built Attunica's multimodal psychotherapy-training and evaluation platform: real-time LiveKit + Gemini + Anam sessions, durable transcripts/debriefs, and academic workflows; now lead a PM + 2 engineers; NYU Silver MSW pilot; HIPAA BAAs with Anthropic + AWS.",
      'Built a consent-gated, clinician-graded LLM-persona environment for measuring simulated humanity and attachment without patient data: persona text is character data, never instructions; tenant RBAC and signed BFF capabilities fence roles; immutable eval IDs, revocable consent, private versioned media, and two-channel Deepgram bind evidence to provider identity.',
      'Made evaluation state auditable: content-addressed records pin prompt/provider/model/schema revisions; distinguish no evidence from scored zero; gate scoring on clinical validation; persist lifecycle/budget state; and separate pre-call failure from ambiguous provider outcomes to prevent billable replay.',
      'Led the AWS-funded production cutover with Avahi to ECS, Aurora PostgreSQL 18, and Bedrock; retired Fly/Neon/Vercel; enforced IAM-scoped credentials, typed runtime contracts, zero SDK retries, bounded timeouts, no cross-provider fallback/replay, and an audited canary with content-free receipts.',
      'Executed a 141-row production-readiness matrix through 40 dependency-ordered PRs under exact-base validation, lane ownership, and append-only admission (a PR cannot weaken its approving checks); qualified the source candidate with 6K+ tests, PostgreSQL 18 migration rehearsals, commit-bound artifacts, and content-free Bedrock/Deepgram evidence.',
      'Lead the Article 31 documentation product (v0.5.1 on AWS ECS): release-only deploys and gated in-VPC migrations; domain-restricted SSO, patient-scoped RBAC/RLS/audits, browser-only PII-scrubbed PDF extraction, on-device Whisper, and clinician-reviewed Claude notes/treatment plans with end-to-end authorship.',
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
    role: 'Research Engineer — BCI, EEG & Medical Imaging',
    company: 'PICT + Cross-Institutional Research Collaborations',
    location: 'India',
    dates: 'Nov 2020 – Sep 2023',
    bullets: [
      'Adapted a channel-fused Dense CNN for BCI Competition IV-2a four-class motor imagery from 22-channel, 250-Hz EEG; deployed real-time inference in a physical NVIDIA Jetson prototype, improved preprocessing throughput 35% via pinned memory and asynchronous CPU–GPU transfers, and earned PICT Honors in AI & ML through the work.',
      'Engineered training and preprocessing pipelines for 92K+ fundus scans and 1K+ dental imaging cases (93% diagnostic accuracy) on TensorFlow/Keras (2022–2023).',
      'Evaluated about 10 attention variants for 5-class diabetic retinopathy grading, produced SHAP interpretability reports, and established dataset/annotation protocols adopted by 5+ research teams with institutional copyright L-122721/2023.',
    ],
  },
];

const EDUCATION = [
  {
    school: 'New York University',
    location: 'New York, USA',
    degree: 'M.S. in Computer Science',
    detail: 'GPA: 3.5/4.0',
    dates: 'May 2025',
  },
  {
    school: 'Pune Institute of Computer Technology',
    location: 'Pune, India',
    degree: 'B.E. in Electronics & Telecommunications',
    detail: 'SGPA: 9.1/10.0',
    dates: 'Aug 2022',
  },
];

const SKILLS = [
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
      'Python, Rust, TypeScript, SQL, C++, C#, FastAPI, Next.js, React, PostgreSQL/pgvector, Redis, ClickHouse, Qdrant, DynamoDB, Docker, Kubernetes, AWS (ECS, Bedrock, Aurora), Azure',
  },
  {
    label: 'Voice & agents',
    items:
      'LangGraph, LangSmith, MCP, LiveKit, Gemini Realtime, Whisper STT, TTS, WebRTC streaming, multi-provider gateways',
  },
];

export default function WorkPage() {
  return (
    <div className="container py-16">
      {/* ── Hero ── */}
      <div className="signal-panel-strong mb-16 p-8 md:p-12">
        <div className="space-y-5 max-w-3xl">
          <span className="signal-pill">Work</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{HERO_HEADLINE}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{HERO_SUMMARY}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="https://github.com/Sahil170595"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98] hover:border-primary/60 hover:text-primary"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
            <Link
              href="https://linkedin.com/in/sahilkadadekar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98] hover:border-primary/60 hover:text-primary"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </Link>
            <Link
              href="https://orcid.org/0000-0002-7139-1251"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98] hover:border-primary/60 hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              ORCID
            </Link>
            <Link
              href="/papers"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98] hover:bg-primary/90"
            >
              Papers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Research & Open Source ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          Research &amp; Open Source
        </h2>
        <div className="space-y-4">
          {RESEARCH.map((item) => {
            const external = item.href.startsWith('http');
            return (
              <div key={item.href} className="group signal-panel p-5 transition-colors duration-fast ease-standard hover:border-primary/40">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <Link
                      href={item.href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="font-semibold text-foreground group-hover:text-primary transition-colors"
                    >
                      {item.label}
                    </Link>
                    {item.meta && <p className="mt-1 text-xs text-muted-foreground/80">{item.meta}</p>}
                  </div>
                  {external && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/70 mt-1 shrink-0" />}
                </div>
                <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
                  {item.bullets.map((b, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {item.evidence && item.evidence.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {item.evidence.map((ev) => (
                      <Link
                        key={ev.href}
                        href={ev.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        {ev.label}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Experience ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          Experience
        </h2>
        <div className="space-y-8">
          {EXPERIENCE.map((job) => (
            <article key={`${job.company}-${job.dates}`} className="signal-panel p-6 md:p-8">
              <header className="mb-4 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">{job.role}</h3>
                  <p className="text-sm text-muted-foreground">
                    {job.company} · {job.location}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80 md:whitespace-nowrap">
                  {job.dates}
                </span>
              </header>
              <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
                {job.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ── Education ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          Education
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {EDUCATION.map((edu) => (
            <div key={edu.school} className="signal-panel p-5">
              <h3 className="font-semibold text-foreground">{edu.school}</h3>
              <p className="text-xs text-muted-foreground mb-2">{edu.location}</p>
              <p className="text-sm text-muted-foreground">{edu.degree}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground/80">{edu.detail}</span>
                <span className="text-muted-foreground/70">{edu.dates}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Skills ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          Technical Skills
        </h2>
        <div className="signal-panel p-6 md:p-8">
          <dl className="space-y-4 text-sm">
            {SKILLS.map((s) => (
              <div key={s.label} className="grid gap-1 md:grid-cols-[180px_1fr] md:gap-6">
                <dt className="font-semibold text-foreground">{s.label}</dt>
                <dd className="text-muted-foreground leading-relaxed">{s.items}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTAs ── */}
      <section>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/papers"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98] hover:bg-primary/90"
          >
            Papers
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98] hover:border-primary hover:bg-primary/5"
          >
            Research Archive
          </Link>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-semibold text-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98] hover:border-primary/60 hover:text-primary"
          >
            Platform
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-semibold text-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard motion-safe:active:scale-[0.98] hover:border-primary/60 hover:text-primary"
          >
            About
          </Link>
        </div>
      </section>
    </div>
  );
}
