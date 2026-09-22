import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { STAR_SYSTEMS } from '@/components/galactic/systems';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem, HEAD_ENTRANCE_GROUPS } from '@/components/motion/entrance';
import { ReportVisual, type Variant, type VisualFamily } from '@/components/reports/ReportVisual';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { FlowFigure, type FlowStep } from '@/components/ui/FlowFigure';
import { IntentLink } from '@/components/ui/IntentLink';
import { OnwardLinks, type OnwardLink } from '@/components/ui/OnwardLinks';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Section';
import { StatRow } from '@/components/ui/StatRow';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { CHIMERAFORGE_TOOL, QUANTFIT_TOOL } from '@/lib/tools';

const METADATA_DESCRIPTION =
  'Constitutional AI architecture · debate engine, BFT consensus, ZK proofs, fast-path router. 9 repos, 4 languages.';

export const metadata: Metadata = {
  alternates: { canonical: '/platform' },
  title: 'Platform',
  description: METADATA_DESCRIPTION,
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Platform Architecture | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/platform',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Platform Architecture | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

// the ecosystem in numbers (the head's stat row)
const REPOSITORY_COUNT = 9;
const LANGUAGE_COUNT = 4;

interface Subsystem {
  label: string;
  detail: string;
}

interface Repository {
  name: string;
  /** the drawing: the archive generator, seeded by the name, in the family chosen for the repository */
  visual: readonly [VisualFamily, Variant];
  /** languages and stack, one line */
  meta?: string;
  description: ReactNode;
  subsystems?: Subsystem[];
  footnote?: string;
  /** where the repository leads; by default the landing's destination for it */
  link?: { href: string; label: string };
}

// Private repositories lead to their on-site pages and public ones to GitHub,
// exactly as the landing's star systems do (components/galactic/systems.ts).
function destination(repository: Repository): { href: string; label: string } {
  if (repository.link) return repository.link;
  const system = STAR_SYSTEMS.find((s) => s.name === repository.name);
  if (!system) throw new Error(`[platform] no destination for ${repository.name}: add it to STAR_SYSTEMS or give it a link`);
  return { href: system.href, label: system.ctaLabel };
}

// Each family says something about the repository it draws: concentric rings
// for the enforcement core, measured bars for the research platform, a
// dithered field for the agent pipeline, a fan of GPU profiles for the
// planner, signal traces for the device and channel clients.
const CORE_ENGINES: Repository[] = [
  {
    name: 'Banterpacks',
    visual: ['arcs', 0],
    meta: 'Python, Rust · 6 subsystems + 7 Rust crates',
    description:
      'The core monorepo. Six interconnected subsystems handling constitutional AI enforcement, multi-model debate, cryptographic provenance, and the JARVIS multi-modal assistant. All inter-service coupling is HTTP.',
    subsystems: [
      { label: 'JARVIS Gateway', detail: 'AI agent layer — chat, voice, semantic memory, tools, proactive intelligence, smart home' },
      { label: 'Constitutional Router', detail: 'TDD002 — embedding cosine similarity, calibration (isotonic/Platt), calibrated fast-path routing' },
      { label: 'Debate Engine', detail: 'Chimera — heat-based escalation, weighted voting, ranked choice, Condorcet consensus' },
      { label: 'Rust Runtime', detail: 'TDD005 — Ed25519 provenance, BFT consensus, ZK proofs, cognitive agents with ELO' },
    ],
    footnote: 'RLAIF self-improving loop · 3-stage tool approval',
  },
  {
    name: 'Banterhearts',
    visual: ['bars', 0],
    meta: `Python · ${MEASUREMENTS.SHORT} measurements`,
    description: `ML research platform and production inference backbone. ${MEASUREMENTS.DISPLAY} measurements across ${REPORTS.DISPLAY} technical reports, targeting consumer GPUs with sub-100ms inference.`,
    subsystems: [
      { label: 'Inference API', detail: 'Model selection, streaming, multi-backend dispatch' },
      { label: 'Safety Research', detail: 'Alignment under quantization, concurrency, cross-backend consistency' },
      { label: 'Benchmarking', detail: '4 compilation backends, 5 quantization formats, GPU kernel profiling' },
      { label: 'AutoOpt Agent', detail: 'Thompson sampling, multi-armed bandit, SLA enforcement' },
    ],
    footnote: '37-file evaluation framework · 20 monitoring modules · 12 security modules',
  },
];

const GATEWAY_MODULES = ['Calendar', 'Inbox', 'Memory', 'Smart Home', 'Proactive', 'Tools', 'Voice'];

// A chat turn's path through the gateway, drawn from the section's own
// sentences: every turn routes through the constitutional router, and a tool
// runs through the propose/approve/execute pipeline with provenance.
const GATEWAY_PATH: { title: string; caption: string; steps: FlowStep[] } = {
  title: 'A chat turn through the gateway',
  caption: 'Every turn passes the constitutional router; a tool runs only once it is proposed and approved, and every action carries cryptographic provenance.',
  steps: [
    { label: 'Chat turn', detail: 'text or voice, on Anthropic, OpenAI, Gemini or Ollama', kind: 'io' },
    { label: 'Constitutional router', detail: 'every turn routes through it' },
    { label: 'Propose', detail: 'a tool call, as a discrete step' },
    { label: 'Approve', detail: 'human in the loop' },
    { label: 'Execute', detail: 'sandboxed, with cryptographic provenance', kind: 'result' },
  ],
};

const SUPPORTING_SYSTEMS: Repository[] = [
  {
    name: 'Chimera Multi-Agent',
    visual: ['dots', 1],
    meta: 'Python · ClickHouse · OTel',
    description:
      'Muse Protocol — 6-agent content pipeline with ClickHouse analytics. Also the observability control plane (OTel tracing, Datadog metrics, DLQ).',
  },
  {
    name: 'Chimeraforge',
    visual: ['fan', 0],
    description: `LLM deployment optimizer on PyPI (v${CHIMERAFORGE_TOOL.version}). Model-agnostic 5-gate capacity planner (VRAM, Quality, Safety, Latency, Cost) — any registry / Ollama / HuggingFace model across 22 GPU profiles, plus an MCP server that serves the same numbers to AI assistants.`,
    link: { href: '/tools/chimeraforge', label: 'pip install chimeraforge' },
  },
  {
    name: 'Chimeradroid',
    visual: ['wave', 0],
    meta: 'C# / Unity · WebSocket streaming',
    description:
      'Android companion for JARVIS — Unity/C# with voice, chat, session handoff, tool approval, mesh networking, and offline-first support.',
  },
  {
    name: 'Echo',
    visual: ['wave', 1],
    meta: 'Python · Slack Bolt · discord.py',
    description: 'Messaging channel adapters — Slack and Discord bridges to JARVIS with session tracking and device key auth.',
  },
  {
    name: 'JARVIS Console',
    visual: ['bars', 1],
    meta: 'TypeScript / Next.js · WebSocket',
    description:
      'Web console — chat with streaming, control room dashboard, cognitive agent ELO, tool catalog, workflow management, memory browser.',
  },
  {
    name: 'This Site',
    visual: ['dots', 0],
    meta: 'TypeScript · Vercel',
    description: `268 auto-generated episodes from git commits (stream archived 2026-06-26). Research archive with ${REPORTS.DISPLAY} technical reports. Next.js 16 with SSG + ISR.`,
  },
];

// the ninth repository, still in development, in its own section
const IN_DEVELOPMENT: Repository[] = [
  {
    name: 'Project Wyvern',
    visual: ['fan', 1],
    meta: 'Python, Rust · ROS 2 · PX4 + Gazebo',
    description:
      'Embodied autonomy. Governed mission-execution plane between Chimera control and PX4/ArduPilot — 5-tier authority hierarchy, cryptographic mission replay, OpenAPI 3.1 mission contract. Phase 0 specs complete; SIM-ONLY MVP in progress.',
  },
];

// shipped outside the 9-repo Chimera ecosystem
const STANDALONE_TOOLS: Repository[] = [
  {
    name: 'quantfit',
    visual: ['arcs', 1],
    description: `GPU-aware quantization CLI with a built-in safety-drift check (v${QUANTFIT_TOOL.version}). Quantizes across the SOTA matrix (AWQ / GPTQ / SmoothQuant / FP8 / RTN + GGUF), refuses honestly when a model will not fit, and measures whether quantization broke refusals — a two-axis vector (refusal-robustness + over-refusal) against an unquantized baseline, with bounded Wilson-CI verdicts and an auditable drift report.`,
    link: { href: '/tools/quantfit', label: 'pip install quantfit' },
  },
];

const DATA_FLOW = [
  { step: '1', title: 'Ingest', text: 'Banterhearts bench data and Banterpacks git commits flow into ClickHouse via dedicated agents.' },
  { step: '2', title: 'Process', text: 'Watcher monitors pipeline health. Council generates episodes with performance insights baked in.' },
  { step: '3', title: 'Publish', text: 'Publisher pushes episodes to GitHub. Vercel rebuilds the site. i18n translates to German, Chinese, Hindi.' },
  { step: '4', title: 'Serve', text: 'JARVIS gateway dispatches inference locally. Chimeradroid extends access to mobile devices.' },
];

const PROSE_LINK = 'text-foreground underline decoration-foreground/35 underline-offset-4 transition-colors duration-fast ease-standard hover:decoration-primary';

const isExternal = (href: string) => /^https?:\/\//.test(href);
const outside = (href: string) => (isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {});

/**
 * A core engine: a column of the page under a hairline, not a card. Its
 * drawing on a drafting plate, the page's one large visual per engine; its
 * name, stack and story; its subsystems as a hairline definition list, each
 * name over what it does; then its footnote and where it leads.
 */
function Engine({ repository }: { repository: Repository }) {
  const { href, label } = destination(repository);
  const Arrow = isExternal(href) ? ArrowUpRight : ArrowRight;
  return (
    <article className="list-row pt-8">
      <div className="repo-plate aspect-video max-h-64">
        <ReportVisual slug={repository.name} family={repository.visual[0]} variant={repository.visual[1]} />
      </div>
      <h3 className="mt-6 text-heading-24 text-foreground">{repository.name}</h3>
      {repository.meta && <p className="mt-1 text-label-13 text-muted-foreground">{repository.meta}</p>}
      <p className="mt-3 max-w-[60ch] text-copy-16 text-muted-foreground">{repository.description}</p>
      {repository.subsystems && (
        <dl className="mt-6">
          {repository.subsystems.map((item) => (
            <div key={item.label} className="list-row grid gap-1 py-4">
              <dt className="text-copy-14 font-semibold text-foreground">{item.label}</dt>
              <dd className="text-copy-14 text-muted-foreground">{item.detail}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="list-row pt-4">
        {repository.footnote && <p className="text-label-13 text-muted-foreground">{repository.footnote}</p>}
        <p className="mt-4">
          <IntentLink href={href} className="row-link text-copy-14 font-medium text-foreground" {...outside(href)}>
            {label} <Arrow aria-hidden="true" {...(isExternal(href) ? {} : { 'data-direction': 'forward' })} className="row-arrow h-4 w-4 text-muted-foreground" />
          </IntentLink>
        </p>
      </div>
    </article>
  );
}

/**
 * Any other repository: a hairline row with its drawing small on the left,
 * its name, stack and story, and where it leads. The row is one link, a
 * linked ListRow (a.list-row: its hairline and title turn ember) that
 * answers as a card does (.card-depth: the drawing's accent lights and the
 * call to action turns ember, its arrow sliding in), without a box.
 */
function RepositoryRow({ repository }: { repository: Repository }) {
  const { href, label } = destination(repository);
  const Arrow = isExternal(href) ? ArrowUpRight : ArrowRight;
  return (
    <IntentLink
      href={href}
      className="card-depth group list-row grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-6 py-6 sm:grid-cols-[10rem_minmax(0,1fr)] md:py-8"
      {...outside(href)}
    >
      <div className="repo-plate aspect-video">
        <ReportVisual slug={repository.name} family={repository.visual[0]} variant={repository.visual[1]} />
      </div>
      <div className="min-w-0">
        <h3 className="text-heading-20 text-foreground transition-colors duration-fast ease-standard group-hover:text-primary">{repository.name}</h3>
        {repository.meta && <p className="mt-1 text-label-13 text-muted-foreground">{repository.meta}</p>}
        <p className="mt-2 max-w-[60ch] text-copy-14 text-muted-foreground md:text-copy-16">{repository.description}</p>
        <p className="card-cta mt-3 inline-flex items-center gap-1.5 text-label-13 font-medium text-foreground/80">
          {label}
          <Arrow aria-hidden="true" className="card-arrow h-3.5 w-3.5" />
        </p>
      </div>
    </IntentLink>
  );
}

function RepositoryRows({ repositories }: { repositories: Repository[] }) {
  return (
    <ul>
      {repositories.map((repository) => (
        <Reveal as="li" key={repository.name}>
          <RepositoryRow repository={repository} />
        </Reveal>
      ))}
    </ul>
  );
}

// The two core engines join the head's entrance, after its three groups.
const CORE_ENTRANCE_AFTER = HEAD_ENTRANCE_GROUPS;

export default async function PlatformPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  const explore: OnwardLink[] = [
    {
      href: '/reports',
      title: 'Research Archive',
      blurb: `${REPORTS.DISPLAY} technical reports with ${MEASUREMENTS.DISPLAY} measurements across inference, optimization, and safety.`,
    },
    {
      href: '/episodes',
      title: 'Episode Archive',
      blurb: `${stats.totalEpisodes} archived episodes documenting commits, decisions, and telemetry data points.`,
    },
    { href: '/about', title: 'About the Project', blurb: "Who built this, why, and where it's headed." },
  ];

  return (
    <div className="container pb-24">
      <PageHeader
        eyebrow={<Eyebrow dot="ember">Platform Architecture</Eyebrow>}
        title="What Powers Chimeraforge"
        lede="Nine repositories across Python, Rust, TypeScript, and C#. Constitutional AI enforcement with cryptographic provenance, multi-model debate, and a self-improving alignment loop — from the JARVIS gateway to mobile clients to channel adapters."
        meta={
          <StatRow
            label="The platform in numbers"
            items={[
              { value: REPOSITORY_COUNT, label: 'repositories' },
              { value: LANGUAGE_COUNT, label: 'languages' },
              { value: MEASUREMENTS.SHORT, label: 'research measurements' },
            ]}
          />
        }
      />

      <div className="mt-8 md:mt-14">
        <Section id="core-engines" title="Core engines" aside>
          <ul className="grid grid-cols-1 gap-12 xl:grid-cols-2">
            {CORE_ENGINES.map((repository, index) => (
              <Reveal as="li" key={repository.name} {...entranceItem(index, CORE_ENTRANCE_AFTER)}>
                <Engine repository={repository} />
              </Reveal>
            ))}
          </ul>
        </Section>

        <Section id="jarvis-gateway" title="JARVIS Gateway" aside>
          <p className="max-w-[60ch] text-copy-17 text-prose">
            Multi-modal AI gateway with multi-provider routing (Anthropic, OpenAI, Gemini, Ollama). Every chat turn routes through the
            constitutional router. Tool execution uses a 3-stage propose/approve/execute pipeline with cryptographic provenance on
            every action.
          </p>
          <Reveal className="mt-8">
            <FlowFigure {...GATEWAY_PATH} />
          </Reveal>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-label-13">
            <p className="text-muted-foreground">Modules</p>
            <ul aria-label="Gateway modules" className="flex flex-wrap gap-x-4 gap-y-1 text-foreground">
              {GATEWAY_MODULES.map((module) => (
                <li key={module}>{module}</li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="supporting-systems" title="Supporting systems" aside>
          <RepositoryRows repositories={SUPPORTING_SYSTEMS} />
        </Section>

        <Section id="in-development" title="In development" aside>
          <RepositoryRows repositories={IN_DEVELOPMENT} />
        </Section>

        <Section
          id="standalone-tools"
          title="Standalone tools"
          description="Independent CLIs shipped outside the Chimera ecosystem — their own repositories, not counted among the nine."
          aside
        >
          <RepositoryRows repositories={STANDALONE_TOOLS} />
        </Section>

        <Section id="data-flow" title="How data flows" aside>
          <ol className="hairline-grid sm:grid-cols-2 xl:grid-cols-4">
            {DATA_FLOW.map((step) => (
              <li key={step.step}>
                <Reveal className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-label-13 text-muted-foreground">{step.step}</span>
                    {/* h3, not h4: the section heading above is an h2 */}
                    <h3 className="text-copy-16 font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-copy-14 text-muted-foreground">{step.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="see-it-run" title="See it run" aside>
          <div className="max-w-[60ch] space-y-4 text-copy-17 text-prose">
            <p>
              The subsystems above are not diagrams on{' '}
              <IntentLink href="/show" className={PROSE_LINK}>
                /show
              </IntentLink>
              . Each scene replays pre-computed records from the Banterpacks pipeline — real Ed25519 signatures, real Pedersen
              commitments, real tier verdicts — and labels the one deterministic stand-in where the public demo uses it.
            </p>
            <p>
              Start with the{' '}
              <IntentLink href="/show/streaming-ladder" className={PROSE_LINK}>
                five-tier streaming ladder
              </IntentLink>
              , the{' '}
              <IntentLink href="/show/zk-alignment-proof" className={PROSE_LINK}>
                zero-knowledge alignment proof
              </IntentLink>
              , or{' '}
              <IntentLink href="/show/bft-consensus" className={PROSE_LINK}>
                BFT consensus across four replicas
              </IntentLink>
              .
            </p>
          </div>
        </Section>

        {/* where to go next */}
        <OnwardLinks links={explore} />
      </div>
    </div>
  );
}
