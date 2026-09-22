import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { entranceGroup, entranceItem } from '@/components/motion/entrance';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { cn } from '@/lib/cn';

// PageHeader's first-load entrance on the /show head: the eyebrow and title,
// then the lede, then the first scene rows one item apart.
const HEAD_GROUPS = 2;
const ENTRANCE_ROWS = 3;

const SHOW_DESCRIPTION =
  'Interactive scenes from the Chimera constitutional AI ecosystem — real cryptographic, consensus, and verifier internals rendered as visual demos.';

export const metadata: Metadata = {
  alternates: { canonical: '/show' },
  title: 'Show · Chimera',
  description: SHOW_DESCRIPTION,
  openGraph: {
    images: ['/opengraph-image.png'],
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
    available: true,
    spec: 'TDD-005 zk.rs · P102.9 · P102.18.2',
  },
  {
    slug: 'bft-consensus',
    number: '04',
    title: 'Four replicas, one decision',
    blurb:
      'Pre-prepare, prepare, commit. Ed25519 signatures collecting into quorum. Equivocation detection if a replica lies.',
    available: true,
    spec: 'TDD-005 bft.rs · P102.18 audit-fix',
  },
  {
    slug: 'provenance-chain',
    number: '05',
    title: 'Every action, signed and chained',
    blurb:
      'Tool action → SHA-256 → Ed25519 signature → Merkle node → root. Cold-tier archive. Audit trail you can verify in another language.',
    available: true,
    spec: 'TDD-004 provenance',
  },
];

export default function ShowPage() {
  return (
    <div className="container max-w-5xl pb-12 pt-6 md:pb-20 md:pt-10">
      <header className="mb-16 space-y-4">
        <div {...entranceGroup(0)}>
          <Eyebrow as="div">Chimera · Show</Eyebrow>
          {/* the one display exception: the page-title weight at display size */}
          <h1 className="mt-4 text-display-72 text-foreground">
            The internals,
            <br />
            on <span className="text-primary">display</span>.
          </h1>
        </div>
        <p
          className={cn('text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed pt-2', entranceGroup(1).className)}
          style={entranceGroup(1).style}
        >
          Most AI demos are a chat box and a chart. These aren&apos;t. Each scene visualises the
          actual cryptographic, consensus, or verifier internals of a running system —
          deterministic data, real signatures, real Pedersen commitments. Pre-computed from the
          Banterpacks pipeline, rendered here. Where the
          public demo substitutes a deterministic provider (the T2 judge in the streaming
          ladder), the scene says so.
        </p>
      </header>

      <ol className="space-y-1">
        {scenes.map((s, index) => (
          <li key={s.slug} {...(index < ENTRANCE_ROWS ? entranceItem(index, HEAD_GROUPS) : {})}>
            {s.available ? (
              <Link
                href={`/show/${s.slug}`}
                className="group relative grid grid-cols-[auto_1fr_auto] items-baseline gap-6 border-t border-border/40 py-8 hover:border-primary/60 transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  {s.number}
                </span>
                <div className="space-y-2">
                  <h2 className="text-heading-24 md:text-heading-32 text-foreground group-hover:text-primary transition-colors">
                    {s.title}
                  </h2>
                  <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
                    {s.blurb}
                  </p>
                  <div className="text-label-12-mono text-muted-foreground/70 pt-1">
                    {s.spec}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            ) : (
              <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-6 border-t border-border/40 py-8 opacity-50">
                <span className="font-mono text-xs text-muted-foreground">{s.number}</span>
                <div className="space-y-2">
                  <h2 className="text-heading-24 md:text-heading-32 text-foreground">
                    {s.title}
                  </h2>
                  <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
                    {s.blurb}
                  </p>
                  <div className="text-label-12-mono text-muted-foreground/70 pt-1">
                    {s.spec}
                  </div>
                </div>
                <span className="text-label-12-mono text-muted-foreground/70">
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
