import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StreamingLadder } from '@/components/scenes/StreamingLadder';
import sceneData from '@/data/scenes/streaming-ladder.json';

export const metadata: Metadata = {
  title: 'Streaming Ladder · Chimera Show',
  description:
    'When a language model writes a reasoning step, five independent checks run on it before it can affect the next sentence. Watch one step go through the ladder.',
};

export default function StreamingLadderPage() {
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
        <span className="signal-pill">Scene · 01</span>
      </div>

      <header className="mb-10 md:mb-12 space-y-6">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          A live walkthrough
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          Every reasoning step,
          <br />
          <span className="text-primary">checked five times</span>.
        </h1>
        <div className="space-y-4 text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed">
          <p>
            When a language model writes a long answer, it builds it one reasoning step at a time —
            each step a sentence or two of thinking that feeds the next one. If a step is wrong
            (bad math, faulty logic, banned language) it poisons everything after it.
          </p>
          <p>
            This system inspects every step the moment it&apos;s written, before it&apos;s allowed to
            influence the next one. Each tier is cheaper to skip than to run; the expensive ones
            only fire when the cheap ones can&apos;t resolve it. A final &ldquo;enforcer&rdquo;
            composes every verdict into one decision: <span className="text-foreground/90">proceed</span>,
            <span className="text-primary"> rewind</span>, or
            <span className="text-foreground/90"> degrade</span>.
          </p>
        </div>

        {/* Compared to what — the contrast that makes this matter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 pt-2">
          <div className="rounded-lg border border-border/40 bg-card/30 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
              Most chatbots
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-muted-foreground/80 leading-none mb-2">
              0 checks
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The model writes, the user reads. If a step is wrong, the wrong answer ships.
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-card/30 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
              Safety-filtered chatbots
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-muted-foreground/90 leading-none mb-2">
              1 check
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A single classifier runs once at the end. Catches banned content. Misses reasoning errors.
            </p>
          </div>
          <div className="rounded-lg border border-primary/60 bg-primary/5 p-4 shadow-[0_0_30px_-14px_hsl(var(--primary)/0.5)]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-2">
              This system
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-primary leading-none mb-2">
              5 staged
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">
              Five tiers per step, cheap-first, gated by a token-probability trigger. Inspects every step before it ships.
            </p>
          </div>
        </div>

        <p className="text-base md:text-lg text-foreground/90 leading-relaxed max-w-3xl">
          Below is a working example. The walkthrough auto-plays. Each beat is a narration of what
          the system is doing right now.
        </p>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] md:text-xs font-mono text-muted-foreground/70 pt-2">
          <span>spec · {sceneData.spec_ref}</span>
          <span>generated · {new Date(sceneData.generated_at).toLocaleString()}</span>
          <span>scenarios · {sceneData.records.length}</span>
        </div>
      </header>

      <StreamingLadder data={sceneData} />

      <footer className="mt-20 border-t border-border/40 pt-8 space-y-3 text-sm text-muted-foreground max-w-3xl">
        <p>
          Every verdict on this page was produced by the actual pipeline running over the example
          reasoning steps. The deterministic rule pack, the LLM judge (with a fake provider for
          public demos), the self-correction stage, the panel client, and the enforcer all ran for
          real. No mocks. The build pipeline lives at{' '}
          <span className="font-mono text-foreground">demo/build-data.mjs</span> in the Banterpacks
          repo.
        </p>
        <p>
          Each tier is governed by spec section TDD-012 §3, §8, §17 + the P102.0–P102.19 patch arc.
          The 1053+ unit tests in{' '}
          <span className="font-mono text-foreground">chimera/tests/streaming/</span> are the
          contract.
        </p>
      </footer>
    </div>
  );
}
