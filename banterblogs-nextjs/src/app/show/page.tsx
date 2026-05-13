import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const SHOW_DESCRIPTION =
  'Interactive scenes from the Chimera constitutional AI ecosystem — real cryptographic, consensus, and verifier internals rendered as visual demos.';

export const metadata: Metadata = {
  title: 'Show · Chimera',
  description: SHOW_DESCRIPTION,
  openGraph: {
    title: 'Show · Chimera | Chimeraforge',
    description: SHOW_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/show',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Show · Chimera | Chimeraforge',
    description: SHOW_DESCRIPTION,
  },
};

const scenes = [
  {
    slug: 'streaming-ladder',
    number: '01',
    title: 'The reasoning step, witnessed five times',
    blurb:
      'A single CoT step flows through T1 verifier → T2 judge → T2.5 self-correct → T3 panel → Enforcer. Real verdicts. Real rewinds.',
    available: true,
    spec: 'TDD-012 §3, §8, §17',
  },
  {
    slug: 'cognitive-agents',
    number: '02',
    title: 'Four ways to think about the same prompt',
    blurb:
      'Analytical, Creative, Adversarial, Domain Expert — four cognitive styles inspecting one task with their own structural logic. ELO-weighted, meta-controller-tuned.',
    available: true,
    spec: 'TDD-005 cognitive layer',
  },
  {
    slug: 'zk-alignment-proof',
    number: '03',
    title: 'Proving alignment without revealing the score',
    blurb:
      'Pedersen commitment over the similarity score. Schnorr OR proofs over the bits. The verifier learns the step is above threshold and nothing else.',
    available: false,
    spec: 'TDD-005 zk.rs · P102.9 · P102.18.2',
  },
  {
    slug: 'bft-consensus',
    number: '04',
    title: 'Four replicas, one decision',
    blurb:
      'Pre-prepare, prepare, commit. Ed25519 signatures collecting into quorum. Equivocation detection if a replica lies.',
    available: false,
    spec: 'TDD-005 bft.rs · P102.18 audit-fix',
  },
  {
    slug: 'provenance-chain',
    number: '05',
    title: 'Every action, signed and chained',
    blurb:
      'Tool action → SHA-256 → Ed25519 signature → Merkle node → root. Cold-tier archive. Audit trail you can verify in another language.',
    available: false,
    spec: 'TDD-004 provenance',
  },
];

export default function ShowPage() {
  return (
    <div className="container py-12 md:py-20 max-w-5xl">
      <header className="mb-16 space-y-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Chimera · Show
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95]">
          The internals,
          <br />
          on <span className="text-primary">display</span>.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed pt-2">
          Most AI demos are a chat box and a chart. These aren&apos;t. Each scene visualises the
          actual cryptographic, consensus, or verifier internals of a running system —
          deterministic data, real signatures, real Pedersen commitments. Pre-computed from the
          Banterpacks pipeline, rendered here. No mocks.
        </p>
      </header>

      <ol className="space-y-1">
        {scenes.map((s) => (
          <li key={s.slug}>
            {s.available ? (
              <Link
                href={`/show/${s.slug}`}
                className="group relative grid grid-cols-[auto_1fr_auto] items-baseline gap-6 border-t border-border/40 py-8 hover:border-primary/60 transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  {s.number}
                </span>
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight group-hover:text-primary transition-colors">
                    {s.title}
                  </h2>
                  <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
                    {s.blurb}
                  </p>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 pt-1">
                    {s.spec}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ) : (
              <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-6 border-t border-border/40 py-8 opacity-50">
                <span className="font-mono text-xs text-muted-foreground">{s.number}</span>
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                    {s.title}
                  </h2>
                  <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
                    {s.blurb}
                  </p>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 pt-1">
                    {s.spec}
                  </div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  soon
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
