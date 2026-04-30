import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink, GraduationCap, Briefcase, Code2, Github, Linkedin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Work',
  description:
    'ML Engineer · inference optimization, constitutional AI architectures, empirical safety evaluation. 5 NeurIPS 2026 papers, 44 technical reports, 728K+ measurements.',
  openGraph: {
    title: 'Work | Chimeraforge',
    description:
      'ML Engineer · inference optimization, constitutional AI architectures, empirical safety evaluation. 5 NeurIPS 2026 papers, 44 technical reports, 728K+ measurements.',
    url: 'https://chimeraforge.vercel.app/work',
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Work | Chimeraforge',
    description:
      'ML Engineer · inference optimization, constitutional AI architectures, empirical safety evaluation. 5 NeurIPS 2026 papers, 44 technical reports, 728K+ measurements.',
  },
};

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
    company: 'GhostEye Inc.',
    location: 'New York, USA',
    dates: 'Dec 2025 — Mar 2026',
    bullets: [
      'Built a multi-agent security awareness training platform in roughly 90 days across web, Slack, Teams, SMS/RCS, WhatsApp, Telegram, voice, and email. A shared JIT training agent delivered personalized training from vectorized failure history across phishing, vishing, smishing, and deepfake phishing.',
      'Built the phishing simulation agent on self-hosted 70B LLMs using domain-specific LoRA/QLoRA adapters over full retraining, trained on a 1M+ email corpus grounded in NIST guidance, with vendor-impersonation templates and typosquatted login pages.',
      'Reduced deepfake phishing simulation latency from 40s to 100–450ms on the production cluster — an 80–400× improvement.',
      'Owned agent orchestration end-to-end: Azure (app registration, tenancy/auth), intelligent call routing by country code, a custom jitter algorithm for human-like timing, and 5 specialized review agents distilled from ~2,500 reviewer comments across ~1,000 pull requests.',
      'Built LangGraph/LangSmith-traced scoring agents with input guardrails across APIs, agents, and SMS engines, with adversarial attempt logging feeding analytics, training-outcome evaluation, and SCORM-packaged compliance reporting aligned to SOC 2, NIST, ISO 27001, GDPR via Vanta.',
      'Wrote 5,000+ tests across ~20 services, built CI/CD regression pipelines with automated documentation, and built an internal CLI with custom Claude Code skills/hooks for rapid prod/staging debugging across Porter-deployed services.',
    ],
  },
  {
    role: 'Co-Founder & Lead Machine Learning Engineer',
    company: 'Attunica AI',
    location: 'New York, USA',
    dates: 'Oct 2025 — Present',
    bullets: [
      'Architected and solo-developed a four-service AI psychological safety research platform for psychotherapy training, deployed on Vercel and Fly.io, with pilot collaboration through the NYU Silberman School of Social Work.',
      'Built a real-time streaming agent using LiveKit SDK and Google Gemini Realtime API to simulate adaptive, therapist-guided AI personas in sub-100ms WebRTC sessions.',
      'Designed an IRB-aligned research data layer with tiered consent, NER-based anonymization, and longitudinal tracking of AI dependency and parasocial attachment metrics, enabling collection of independent human–AI interaction data for research.',
      'Engineered a privacy-first, cost-optimized architecture (~$1.20/session) that eliminates A/V storage via transcript mirroring, preserving fault-tolerant multi-agent communication while reducing storage and compliance risk.',
    ],
  },
  {
    role: 'Founder & Lead Machine Learning Engineer',
    company: 'Chimera AI Ecosystem',
    location: 'New York, USA',
    dates: 'Sep 2025 — Present',
    bullets: [
      'Architected a constitutional AI ecosystem spanning 9 repositories, 15+ services, and 5 languages (Python, Rust, TypeScript, C#, JavaScript), with production inference services, a research platform, mobile and web clients, and a content pipeline.',
      'Designed a constitutional alignment architecture: a multi-model debate engine with heat-based escalation, 3 consensus algorithms (weighted, ranked-choice, Condorcet), and a visual-embedding fast-path router achieving 99% single-hop routing in <10ms — a 10,000× speedup over full debate at 97% cost reduction. Productionized with drift detection (KS, PSI, ADWIN), canary deployment, and auto-rollback circuit breakers.',
      'Built the alignment runtime in Rust (7 crates): BFT consensus, Ed25519 provenance chains, Merkle tree verification, and zero-knowledge proofs (Pedersen commitments on Ristretto255). Integrated with Python ML services via zero-copy Arrow IPC FFI, achieving <20ms end-to-end P95 on the fast path.',
      'Built JARVIS, a multi-provider AI gateway (Anthropic, OpenAI, Gemini) with chat, voice, multi-graph memory (semantic, temporal, causal, entity graphs with BFS traversal and episodic consolidation), tool execution with human-in-the-loop approval, proactive intelligence (system-originated workflows), and 5 channel adapters (Slack, Discord, Telegram, WhatsApp, Email). Shipped with a Unity/C# Android client and Next.js web console, both supporting cross-device sync and session handoff.',
      'Wired a cognitive meta-controller with 4 agent styles (analytical, creative, adversarial, domain expert), ELO-based performance tracking, and advisory pre-checks on high-risk tool execution. Self-improving via a cross-repo MLOps loop: debate outcomes generate DPO training pairs (Rafailov loss), with Dr. GRPO, RLOO, and Self-Rewarding (WARM judge ensemble) post-training added 2026; fed through statistical drift detection (Welch\'s t-test, Cohen\'s d) and a canary deployment controller with auto-rollback for zero-downtime model promotion.',
      'Built a 6-agent content pipeline with ClickHouse analytics and confidence-scored publishing, plus a constitutional observability system with 6 watchers, 5 triagers, and 7 autonomous fixers driven by 8 playbooks with a SQLite-backed dead letter queue (102 tests).',
      'Extended the constitutional architecture to embodied autonomy via ProjectWyvern: a governed mission-execution plane between Chimera control and PX4/ArduPilot, with a 5-tier authority hierarchy, cryptographic mission replay, and an OpenAPI 3.1 mission contract. Phase 0 specs complete; SIM-ONLY MVP on PX4 + ROS 2 + Gazebo in progress.',
    ],
  },
  {
    role: 'Co-Founder',
    company: 'Stealth Startup, Medical AI',
    location: 'New York, USA',
    dates: 'Oct 2023 — Aug 2025',
    bullets: [
      'Led a cross-functional team of 3 engineers and 1 clinician across 5 institutions (state government, city university, dental hospital, 2 engineering colleges) to build an ML-guided diagnostic platform spanning 3 clinical domains.',
      'Designed and deployed end-to-end ML pipelines on AWS (Lambda, SageMaker, Bedrock, DynamoDB, SQS/DLQs) to process 1K+ clinical cases with reproducible throughput and scalable orchestration.',
      'Implemented RAG-based decision-support workflows with Qdrant vector search and multimodal retrieval over imaging and clinical metadata, with ingestion and model-serving endpoints designed for HIPAA-sensitive workflows (IAM-scoped roles, encryption at rest, auditable access controls).',
      'Reduced infrastructure costs by 75% through compute/storage optimization while preserving reproducibility and clinical workflow requirements.',
    ],
  },
  {
    role: 'Research Engineer — Medical Imaging AI',
    company: 'Multiple Institutions',
    location: 'Pune, India',
    dates: 'Jan 2022 — Sep 2023',
    bullets: [
      'Engineered high-throughput training and preprocessing pipelines for 92K+ fundus scans and 1K+ dental imaging cases, achieving 93% diagnostic accuracy in clinical classification workflows.',
      'Improved training efficiency with mixed-precision training, multi-GPU execution (4× throughput), and NVIDIA DALI-optimized data loading for large-scale imaging experiments.',
      'Evaluated ~10 attention mechanism variants for 5-class diabetic retinopathy severity grading and produced SHAP-based interpretability reports to support clinician review of AI-assisted diagnoses.',
      'Established dataset versioning and annotation protocols adopted by 5+ research teams, securing institutional copyright (L-122721/2023) and improving reproducibility for clinical AI research.',
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
  { label: 'Languages', items: 'Python, TypeScript, Rust, C#, SQL, C++, Java' },
  {
    label: 'Frameworks & AI',
    items:
      'FastAPI, Next.js, PyTorch, TensorFlow/Keras, Transformers, Pydantic, PEFT, Ray, DeepSpeed, LangGraph, LangSmith, LiveKit',
  },
  {
    label: 'GPU & Compilation',
    items:
      'CUDA, Triton, TensorRT, FlashAttention, ONNX Runtime, torch.compile, Nsight Systems/Compute, GPTQ, AWQ, INT4/INT8',
  },
  {
    label: 'Inference',
    items: 'vLLM, TGI, llama.cpp (GGUF), continuous batching, KV-cache optimization, speculative decoding',
  },
  { label: 'Data & Analysis', items: 'PostgreSQL, Redis, ClickHouse, MinIO, SQLAlchemy, SciPy, pandas' },
  { label: 'Cloud & Deployment', items: 'AWS (Lambda, S3, DynamoDB, SQS, IAM), Docker, Kubernetes, Celery, Vercel' },
  { label: 'Security & Auth', items: 'OAuth2, JWT, HMAC webhooks, Azure AD, RBAC' },
  { label: 'Monitoring', items: 'Prometheus, Grafana, Datadog, OpenTelemetry, pynvml, MLflow, Weights & Biases' },
];

interface OpenSourceItem {
  label: string;
  href: string;
  detail: string;
}

const OPEN_SOURCE: OpenSourceItem[] = [
  {
    label: 'Chimeraforge — PyPI capacity-planning CLI',
    href: 'https://pypi.org/project/chimeraforge/',
    detail:
      '6 validated predictive models (VRAM R²=0.968, throughput R²=0.859), dual-language harnesses (Python + Rust), 292 tests. 2,000+ installs in 2 months.',
  },
  {
    label: 'HuggingFace — 15 model releases',
    href: 'https://huggingface.co/Crusadersk',
    detail:
      '11 quantized (AWQ + GPTQ 4-bit) across Llama 3.2, Qwen 2.5, Mistral 7B, Phi-2, plus 4 custom GPT-2 scaling variants from the model scaling study.',
  },
  {
    label: 'PyTorch PR #175562 — torch.compile decode failure',
    href: 'https://github.com/pytorch/pytorch/pull/175562',
    detail:
      'Triaged upstream PR diagnosing torch.compile autoregressive decode failures where growing KV-cache tensors triggered cudagraph_trees deallocation errors during compiled inference.',
  },
];

export default function WorkPage() {
  return (
    <div className="container py-16">
      {/* ── Hero ── */}
      <div className="signal-panel-strong mb-16 p-8 md:p-12">
        <div className="space-y-5 max-w-3xl">
          <span className="signal-pill">Work</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            ML Engineer · Independent Researcher · Founder
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Building across inference optimization, constitutional AI architectures, and empirical safety evaluation.
            5 NeurIPS 2026 papers packet-ready, 41 technical reports, 728,000+ empirical measurements, and a
            constitutional AI ecosystem spanning 9 repositories and 5 languages.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="https://github.com/Sahil170595"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
            <Link
              href="https://linkedin.com/in/sahilkadadekar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </Link>
            <Link
              href="/papers"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Papers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Experience ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <Briefcase className="h-4 w-4 text-primary" />
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
          <GraduationCap className="h-4 w-4 text-primary" />
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
                <span className="text-muted-foreground/60">{edu.dates}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Skills ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <Code2 className="h-4 w-4 text-primary" />
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

      {/* ── Open Source ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <ExternalLink className="h-4 w-4 text-primary" />
          Open Source
        </h2>
        <div className="space-y-4">
          {OPEN_SOURCE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block group signal-panel p-5 hover:border-primary/40 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </h3>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 mt-1 shrink-0" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTAs ── */}
      <section>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/papers"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Papers
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
          >
            Research Archive
          </Link>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
          >
            Platform
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
          >
            About
          </Link>
        </div>
      </section>
    </div>
  );
}
