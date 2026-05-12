import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StreamingLadder } from '@/components/scenes/StreamingLadder';
import sceneData from '@/data/scenes/streaming-ladder.json';

const LADDER_DESCRIPTION =
  'When a language model writes a reasoning step, five staged checks run on it before it can affect the next sentence. Watch one step go through the ladder.';

export const metadata: Metadata = {
  title: 'Streaming Ladder · Chimera Show',
  description: LADDER_DESCRIPTION,
  openGraph: {
    title: 'Streaming Ladder · Chimera Show | Chimeraforge',
    description: LADDER_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/show/streaming-ladder',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Streaming Ladder · Chimera Show | Chimeraforge',
    description: LADDER_DESCRIPTION,
  },
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

      <header className="mb-10 md:mb-14 space-y-8 md:space-y-10">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground">
          A live walkthrough · TDD-012 streaming ladder
        </div>

        {/* Hero — size AND weight differential, not just color. */}
        <h1 className="font-bold tracking-tight leading-[0.95]">
          <span className="block text-3xl md:text-5xl text-muted-foreground/90 font-light">
            Every reasoning step,
          </span>
          <span className="block text-5xl md:text-7xl text-primary mt-1">
            checked five times.
          </span>
        </h1>

        {/* One paragraph of context, not two. */}
        <p className="text-base md:text-lg text-foreground/80 max-w-3xl leading-relaxed">
          A language model writes a long answer one reasoning step at a time. If a step is wrong,
          it poisons everything after it. This system inspects every step the moment it&apos;s
          written — cheap checks on every step, expensive ones only when the cheap ones can&apos;t
          resolve it. A final enforcer decides{' '}
          <span className="text-foreground">proceed</span>,{' '}
          <span className="text-primary">rewind</span>, or{' '}
          <span className="text-foreground">degrade</span>.
        </p>

        {/* Proof — comparison cards directly under the claim, before any
            explanation runs. The third card is taller and visually heavier
            to read as the differentiated outcome rather than a peer. */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-4 md:p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
              Most chatbots
            </div>
            <div className="text-3xl md:text-4xl font-light tracking-tight text-muted-foreground/80 leading-none mb-2">
              0
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-2">
              checks on intermediate reasoning
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The model writes, the user reads. A wrong reasoning step ships.
            </p>
          </div>
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-4 md:p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
              Safety-filtered
            </div>
            <div className="text-3xl md:text-4xl font-light tracking-tight text-muted-foreground/90 leading-none mb-2">
              1
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-2">
              classifier at the end
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Catches banned content after generation. Doesn&apos;t see the reasoning chain.
            </p>
          </div>
          <div className="md:col-span-6 rounded-xl border-2 border-primary/70 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-5 md:p-7 shadow-[0_0_60px_-18px_hsl(var(--primary)/0.55)] relative overflow-hidden">
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary/90 mb-2">
              This system
            </div>
            <div className="text-4xl md:text-6xl font-bold tracking-tight text-primary leading-none mb-3">
              5
            </div>
            <div className="text-[11px] uppercase tracking-widest text-primary/80 mb-3">
              staged checks per step
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              Cheap deterministic rules first. An LLM judge when the rules can&apos;t resolve. The
              model second-guessing itself when the judge is uncertain. A multi-model panel only when
              the cheaper tiers disagreed.
            </p>
          </div>
        </div>

        {/* Sub-hero copy — sets expectation for the demo below. */}
        <div className="space-y-3 max-w-3xl pt-2">
          <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
            Below is a working example. The walkthrough plays automatically — five real reasoning
            steps moving through the five-tier ladder, real verdicts, real costs.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            <span className="font-mono text-foreground/80">Public-demo caveat:</span> the T2 LLM
            judge runs against a deterministic fake provider for reproducibility. T1 (the 15-rule
            verifier), T2.5 (text-protocol self-correct), T3 (the panel client), and the enforcer
            are the real code paths. Cost numbers shown are production estimates, not the offline
            runner&apos;s in-process microseconds.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] md:text-xs font-mono text-muted-foreground/70 pt-1">
          <span>spec · {sceneData.spec_ref}</span>
          <span>generated · {new Date(sceneData.generated_at).toISOString().slice(0, 10)}</span>
          <span>scenarios · {sceneData.records.length}</span>
        </div>
      </header>

      <StreamingLadder data={sceneData} />

      <footer className="mt-20 border-t border-border/40 pt-8 space-y-3 text-sm text-muted-foreground max-w-3xl">
        <p>
          Every verdict on this page was produced by the actual P102.x streaming pipeline running
          over the example reasoning steps. The 15 deterministic rules, the T2.5 self-correct text
          protocol, the panel client, and the enforcer all ran for real on real input. The T2 LLM
          judge ran against a fake provider — see the public-demo caveat above. The build pipeline
          lives at <span className="font-mono text-foreground">demo/build-data.mjs</span> in
          Banterpacks.
        </p>
        <p>
          Each tier is governed by spec section{' '}
          <span className="font-mono text-foreground">TDD-012 §3, §8, §17</span> + the{' '}
          <span className="font-mono text-foreground">P102.0–P102.19</span> patch arc. The unit-test
          suite under <span className="font-mono text-foreground">chimera/tests/streaming/</span> is
          the contract.
        </p>
      </footer>
    </div>
  );
}
