import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { CognitiveAgents } from '@/components/scenes/CognitiveAgents';
import sceneDataRaw from '@/data/scenes/cognitive-agents.json';
import type { ComponentProps } from 'react';

// C7 fix: validate the JSON shape at build time. If build-data emits a
// shape that doesn't match (missing field, wrong type), Next.js fails
// the static-render step at build time instead of letting a silent
// `undefined.length` crash the deployed page.
const RankedSchema = z.object({
  style: z.string(),
  weight: z.number(),
  confidence: z.number(),
});

const TaskRecordSchema = z.object({
  step_id: z.string(),
  step_index: z.number(),
  task_description: z.string(),
  primary_domain: z.string(),
  summary: z.string().nullable().optional(),
  aftermath: z.string().nullable().optional(),
  beats: z.array(
    z.object({
      target_agent: z.string().nullable(),
      dwell_ms: z.number(),
      copy: z.string(),
    }),
  ),
  verdicts: z.object({
    analytical: z.object({ style: z.literal('analytical'), confidence: z.number() }).passthrough(),
    creative: z.object({ style: z.literal('creative'), confidence: z.number() }).passthrough(),
    adversarial: z.object({ style: z.literal('adversarial'), confidence: z.number() }).passthrough(),
    domain_expert: z.object({ style: z.literal('domain_expert'), confidence: z.number() }).passthrough(),
  }),
  meta: z.object({
    default_weights: z.record(z.number()),
    ranked: z.array(RankedSchema),
    selected_style: z.string(),
    selection_reason: z.string(),
    is_flag_override: z.boolean(),
    surfaced_flags: z.record(z.array(z.string())),
  }),
  latency: z.object({
    actual_total_ms: z.number(),
    naive_total_ms: z.number(),
    saved_pct: z.number(),
    per_agent_ms: z.number(),
    meta_compose_ms: z.number(),
  }),
});

const SceneDataSchema = z.object({
  scene: z.string(),
  generated_at: z.string(),
  spec_ref: z.string(),
  description: z.string(),
  agents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    plain: z.string(),
    what_it_does: z.string(),
    cost_ms: z.number(),
    default_weight: z.number().nullable(),
    source_lines: z.string(),
  })),
  records: z.array(TaskRecordSchema),
});

type SceneData = ComponentProps<typeof CognitiveAgents>['data'];

// Parse-at-import. If shape ever drifts, the build fails loudly.
const sceneData = SceneDataSchema.parse(sceneDataRaw) as unknown as SceneData;

const AGENTS_DESCRIPTION =
  'Four agents inspect the same task in parallel — each with a structurally different algorithm, none making LLM calls.';

export const metadata: Metadata = {
  title: 'Cognitive Agents · Chimera Show',
  description: AGENTS_DESCRIPTION,
  openGraph: {
    title: 'Cognitive Agents · Chimera Show | Chimeraforge',
    description: AGENTS_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/show/cognitive-agents',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cognitive Agents · Chimera Show | Chimeraforge',
    description: AGENTS_DESCRIPTION,
  },
};

export default function CognitiveAgentsPage() {
  return (
    <div className="container py-12 md:py-20 max-w-5xl">
      {/* D24 fix: skip-link past the long header to the demo. Visible
          only when keyboard-focused. */}
      <a
        href="#demo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-mono focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to demo
      </a>

      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/show"
          className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          back to show
        </Link>
        <span className="signal-pill">Scene · 02</span>
      </div>

      <header className="mb-10 md:mb-14 space-y-8 md:space-y-10">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground">
          A live walkthrough · four cognitive agents
        </div>

        <h1 className="font-bold tracking-tight leading-[0.95]">
          <span className="block text-3xl md:text-5xl text-muted-foreground/90 font-light">
            Four ways to think,
          </span>
          <span className="block text-5xl md:text-7xl text-primary mt-1 [overflow-wrap:break-word]">
            no LLMs.
          </span>
        </h1>

        <p className="text-base md:text-lg text-foreground/80 max-w-3xl leading-relaxed">
          Most multi-agent systems are <span className="text-foreground">several copies of the same LLM</span>{' '}
          voting on one prompt — same blind spots, just averaged. This system runs four rule-based agents in
          parallel. Each one uses a completely different algorithm: decomposition, lateral signals, structural
          risk, multi-domain taxonomy. Zero LLM calls anywhere on this page.
        </p>

        {/* D10 fix: comparison cards stay side-by-side at mobile too — the
            point of the comparison is the contrast. grid-cols-3 on mobile,
            col-span proportions preserved on md+. */}
        <div className="grid grid-cols-3 md:grid-cols-12 gap-2 md:gap-4">
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-3 md:p-5">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-1 md:mb-2">
              Most chatbots
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground/80 leading-none mb-1 md:mb-2">
              1
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1 md:mb-2">
              point of view
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              One model answers. Its blind spots become your output&apos;s blind spots.
            </p>
          </div>
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-3 md:p-5">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-1 md:mb-2">
              Ensemble voting
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground/90 leading-none mb-1 md:mb-2">
              same×N
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1 md:mb-2">
              copies vote
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              The 2015 ensemble pattern. Same model, multiple calls, majority wins. Same blind spots, averaged.
            </p>
          </div>
          <div className="md:col-span-6 rounded-xl border-2 border-primary/70 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-3 md:p-7 shadow-[0_0_60px_-18px_hsl(var(--primary)/0.55)] relative overflow-hidden">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-primary/90 mb-1 md:mb-2">
              This system
            </div>
            <div className="text-3xl md:text-6xl font-bold tracking-tight text-primary leading-none mb-1 md:mb-3">
              4 paths
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-primary/80 mb-1 md:mb-3">
              structurally different algorithms
            </div>
            <p className="hidden md:block text-sm text-foreground/90 leading-relaxed">
              Analytical decomposes the task structurally. Creative measures lateral signals. Adversarial runs
              CWE pattern matching + entropy. DomainExpert classifies across a multi-domain taxonomy. Different
              failure modes = genuine diverse redundancy.
            </p>
          </div>
        </div>

        {/* Mobile-only expanded descriptions, stacked below the cards. */}
        <div className="md:hidden space-y-2 text-xs text-muted-foreground leading-relaxed -mt-4">
          <p><span className="text-muted-foreground/80 font-mono">most chatbots:</span> one model answers; its blind spots become yours.</p>
          <p><span className="text-muted-foreground/80 font-mono">ensemble:</span> same model, multiple calls, majority wins. Same blind spots, averaged.</p>
          <p><span className="text-primary/80 font-mono">this system:</span> four different algorithms with different failure modes — genuine redundancy.</p>
        </div>

        <div className="space-y-3 max-w-3xl pt-2">
          <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
            Below is a working example. The walkthrough plays automatically — five real tasks running through
            all four agents in parallel, the meta-controller composing the verdicts.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            <span className="font-mono text-foreground/80">Scope:</span> this walkthrough uses the agents&apos;{' '}
            static default weights. The system can also adapt weights over time based on which agent style
            tends to be right for which task class — that learning behavior is a separate scene.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] md:text-xs font-mono text-muted-foreground/70 pt-1">
          <span>spec · TDD-005 cognitive layer</span>
          <span>generated · {new Date(sceneData.generated_at).toISOString().slice(0, 10)}</span>
          <span>scenarios · {sceneData.records.length}</span>
        </div>
      </header>

      <CognitiveAgents data={sceneData} />

      <footer className="mt-20 border-t border-border/40 pt-8 space-y-3 text-sm text-muted-foreground max-w-3xl">
        <p>
          The four cognitive agents are not LLM agents. They are deterministic Rust code that runs in under 2ms
          per task. Each algorithm is described inline in{' '}
          <span className="font-mono text-foreground">tdd005/crates/tdd005_orchestrator/src/cognitive_agent.rs</span>{' '}
          — the demo&apos;s JS port mirrors the Rust constants verbatim (CWE regex bodies and case-sensitivity,
          entropy thresholds, risk weights, default agent weights, domain taxonomies, verb/ambiguity/contradiction
          lists). Verifiable by grep.
        </p>
        <p>
          The meta-controller layer in this walkthrough — flag-priority overrides on top of raw confidence
          ranking — is a <span className="text-foreground/90">demonstration composition</span>, not a port of
          any single Rust function. The Rust code has{' '}
          <span className="font-mono text-foreground">process_task</span> (sort by confidence) and{' '}
          <span className="font-mono text-foreground">route_task</span> (keyword route on input text) as two
          separate paths. This demo shows what an orchestrator using the agents&apos; flags as routing signals
          would look like, with the structural agents themselves running unchanged. ELO-based weight adaptation
          lives at <span className="font-mono text-foreground">meta_controller.rs:479-523</span> and is out of
          scope for this scene&apos;s walkthrough.
        </p>
      </footer>
    </div>
  );
}
