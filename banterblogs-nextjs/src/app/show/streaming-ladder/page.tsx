import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StreamingLadder } from '@/components/scenes/StreamingLadder';
import sceneData from '@/data/scenes/streaming-ladder.json';

export const metadata: Metadata = {
  title: 'Streaming Ladder · Chimera Show',
  description:
    'A reasoning step flows through five tiers of constitutional adjudication: T1 deterministic verifier, T2 LLM judge, T2.5 RISE self-correct, T3 multi-model panel, Enforcer. Real verdicts from the live pipeline.',
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

      <header className="mb-12 space-y-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          TDD-012 streaming adjudication
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          The reasoning step,
          <br />
          <span className="text-primary">witnessed</span> five times.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
          Every reasoning step the policy model emits is inspected by five independent tiers
          before it&apos;s allowed to influence the rest of the response. Deterministic rules first.
          An LLM judge if the rules don&apos;t resolve it. The model itself second-guessing its own
          step. A multi-model panel if disagreement remains. An enforcer that decides{' '}
          <span className="font-mono text-foreground">proceed</span>,{' '}
          <span className="font-mono text-primary">rewind</span>, or{' '}
          <span className="font-mono text-foreground">degrade</span> based on which tier resolved
          it.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-muted-foreground pt-2">
          <span>spec · {sceneData.spec_ref}</span>
          <span>generated · {new Date(sceneData.generated_at).toLocaleString()}</span>
          <span>records · {sceneData.records.length}</span>
        </div>
      </header>

      <StreamingLadder data={sceneData} />

      <footer className="mt-20 border-t border-border/40 pt-8 space-y-3 text-sm text-muted-foreground max-w-3xl">
        <p>
          Data on this page is pre-computed from the actual P102.x streaming pipeline in the
          Banterpacks repo — the verifier rule pack, the judge router, the RISE self-corrector,
          the panel client, and the enforcer all ran for real to produce these verdicts. No
          mocks. The build pipeline lives at{' '}
          <span className="font-mono text-foreground">demo/build-data.mjs</span>.
        </p>
        <p>
          Each tier is governed by spec section TDD-012 §3, §8, §17 + the P102.0–P102.19 patch
          arc. The 1053+ unit tests in{' '}
          <span className="font-mono text-foreground">chimera/tests/streaming/</span> are the
          contract.
        </p>
      </footer>
    </div>
  );
}
