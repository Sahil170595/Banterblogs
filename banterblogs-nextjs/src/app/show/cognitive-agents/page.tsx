import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CognitiveAgents } from '@/components/scenes/CognitiveAgents';
import sceneDataRaw from '@/data/scenes/cognitive-agents.json';
import type { ComponentProps } from 'react';

// JSON import widens literal types (e.g. `style: "analytical"` → `string`).
// Cast at the boundary so the discriminated-union types in the component
// don't fight the JSON's inferred shape. Runtime validation via Zod is
// queued (playbook §9.6) but not yet wired.
type SceneData = ComponentProps<typeof CognitiveAgents>['data'];
const sceneData = sceneDataRaw as unknown as SceneData;

export const metadata: Metadata = {
  title: 'Cognitive Agents · Chimera Show',
  description:
    'Four agents inspect the same task in parallel — each with a structurally different algorithm, none making LLM calls.',
};

export default function CognitiveAgentsPage() {
  return (
    <div className="container py-12 md:py-20 max-w-5xl">
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
          voting on one prompt — same blind spots, just averaged. This system runs four structurally different
          agents in parallel. Each one uses a completely different algorithm: decomposition, lateral signals,
          structural risk, multi-domain taxonomy. Zero LLM calls anywhere on this page.
        </p>

        {/* Proof — comparison cards directly under the claim. */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-4 md:p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
              Most chatbots
            </div>
            <div className="text-3xl md:text-4xl font-light tracking-tight text-muted-foreground/80 leading-none mb-2">
              1
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-2">
              point of view
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              One model answers. Its blind spots become your output&apos;s blind spots.
            </p>
          </div>
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-4 md:p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
              Ensemble voting
            </div>
            <div className="text-3xl md:text-4xl font-light tracking-tight text-muted-foreground/90 leading-none mb-2">
              same×N
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-2">
              copies vote
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The 2015 ensemble pattern. Same model, multiple calls, majority wins. Same blind spots, averaged.
            </p>
          </div>
          <div className="md:col-span-6 rounded-xl border-2 border-primary/70 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-5 md:p-7 shadow-[0_0_60px_-18px_hsl(var(--primary)/0.55)] relative overflow-hidden">
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary/90 mb-2">
              This system
            </div>
            <div className="text-4xl md:text-6xl font-bold tracking-tight text-primary leading-none mb-3">
              4 paths
            </div>
            <div className="text-[11px] uppercase tracking-widest text-primary/80 mb-3">
              structurally different algorithms
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              Analytical decomposes the task structurally. Creative measures lateral signals. Adversarial runs
              CWE pattern matching + entropy. DomainExpert classifies across a multi-domain taxonomy. Different
              failure modes = genuine diverse redundancy.
            </p>
          </div>
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
          — the demo&apos;s JS port mirrors the Rust constants verbatim (CWE regex bodies, entropy thresholds,
          risk weights, default agent weights, domain taxonomies). Verifiable by grep.
        </p>
        <p>
          The meta-controller&apos;s composition logic in this walkthrough is the flag-priority path: adversarial
          recommendation of block/review takes the route, domain boundary flags take the route, otherwise the
          highest raw confidence wins. ELO-based weight adaptation lives at{' '}
          <span className="font-mono text-foreground">meta_controller.rs:478-520</span> but is out of scope for
          this scene — a single-snapshot walkthrough wouldn&apos;t show the learning anyway.
        </p>
      </footer>
    </div>
  );
}
