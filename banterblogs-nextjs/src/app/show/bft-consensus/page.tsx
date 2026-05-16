import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { BftConsensus } from '@/components/scenes/BftConsensus';
import sceneDataRaw from '@/data/scenes/bft-consensus.json';

// Build-time JSON shape validation.
const PhaseEventSchema = z.object({
  phase: z.enum(['pre_prepare', 'prepare', 'commit', 'view_change', 'new_view']),
  from_replica: z.string(),
  view: z.number(),
  sequence: z.number(),
  action_hash_hex: z.string(),
  status: z.enum(['sent', 'received', 'rejected', 'equivocation', 'timeout']),
  reason: z.string().nullable(),
  signature_hex: z.string().nullable(),
  sig_verifies: z.boolean(),
});

const ScenarioRecordSchema = z.object({
  step_id: z.string(),
  step_index: z.number(),
  scenario_id: z.string(),
  behavior: z.string(),
  plain: z.string(),
  summary: z.string().nullable().optional(),
  aftermath: z.string().nullable().optional(),
  beats: z.array(
    z.object({
      target_phase: z.string().nullable(),
      dwell_ms: z.number(),
      copy: z.string(),
    }),
  ),
  action: z.record(z.unknown()),
  action_hash_hex: z.string(),
  view: z.number(),
  view_after: z.number(),
  sequence: z.number(),
  leader: z.string(),
  leader_after: z.string(),
  quorum_size: z.number(),
  replica_count: z.number(),
  f_value: z.number(),
  phases: z.array(PhaseEventSchema),
  matrix: z.record(z.record(PhaseEventSchema.nullable())),
  counts: z.object({
    prepares_total: z.number(),
    commits_total: z.number(),
    prepare_quorum_reached: z.boolean(),
    commit_quorum_reached: z.boolean(),
  }),
  outcome: z.object({
    committed: z.boolean(),
    equivocation_replica: z.string().nullable(),
    view_changed: z.boolean(),
  }),
  latency: z.object({
    actual_total_ms: z.number(),
    naive_total_ms: z.number(),
    saved_pct: z.number(),
    is_estimate: z.boolean().optional(),
    message_count: z.number().optional(),
  }),
});

const SceneDataSchema = z.object({
  scene: z.string(),
  generated_at: z.string(),
  spec_ref: z.string(),
  description: z.string(),
  cluster: z.object({
    replicas: z.array(z.string()),
    n: z.number(),
    f: z.number(),
    quorum: z.number(),
    view_timeout_ms: z.number(),
    pubkeys_hex: z.record(z.string()),
  }),
  phases: z.array(
    z.object({ id: z.string(), name: z.string(), plain: z.string() }),
  ),
  records: z.array(ScenarioRecordSchema),
});

type SceneData = ComponentProps<typeof BftConsensus>['data'];
const sceneData = SceneDataSchema.parse(sceneDataRaw) as unknown as SceneData;

const BFT_DESCRIPTION =
  'Practical Byzantine Fault Tolerance with 4 replicas, 2-round signed quorum, and equivocation detection. Watch consensus reach the right answer even when one of the four replicas is actively trying to corrupt the vote.';

export const metadata: Metadata = {
  title: 'BFT Consensus · Chimera Show',
  description: BFT_DESCRIPTION,
  openGraph: {
    title: 'BFT Consensus · Chimera Show | Chimeraforge',
    description: BFT_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/show/bft-consensus',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BFT Consensus · Chimera Show | Chimeraforge',
    description: BFT_DESCRIPTION,
  },
};

export default function BftConsensusPage() {
  return (
    <div className="container py-12 md:py-20 max-w-5xl">
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
        <span className="signal-pill">Scene · 04</span>
      </div>

      <header className="mb-10 md:mb-14 space-y-8 md:space-y-10">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground">
          A live walkthrough · TDD-005 BFT consensus
        </div>

        <h1 className="font-bold tracking-tight leading-[0.95]">
          <span className="block text-3xl md:text-5xl text-muted-foreground/90 font-light">
            Four replicas,
          </span>
          <span className="block text-5xl md:text-7xl text-primary mt-1 [overflow-wrap:break-word]">
            one decision.
          </span>
        </h1>

        <p className="text-base md:text-lg text-foreground/80 max-w-3xl leading-relaxed">
          When the orchestrator wants to run a risky action — delete a file, deploy production —
          one agent saying yes isn&apos;t enough. Four replicas vote in two rounds, signing each
          message with their own Ed25519 key. Three matching signatures = quorum.{' '}
          <span className="text-foreground">
            One replica can lie, time out, or vote against, and the system still reaches the right
            answer.
          </span>{' '}
          That&apos;s what &ldquo;byzantine fault tolerant&rdquo; means, made concrete.
        </p>

        <div className="grid grid-cols-3 md:grid-cols-12 gap-2 md:gap-4">
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-3 md:p-5">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-1 md:mb-2">
              Most agents
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground/80 leading-none mb-1 md:mb-2">
              1 vote
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1 md:mb-2">
              the LLM&apos;s
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              The model decides. If it&apos;s wrong or compromised, the wrong action runs.
            </p>
          </div>
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-3 md:p-5">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-1 md:mb-2">
              Majority vote
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground/90 leading-none mb-1 md:mb-2">
              N votes
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1 md:mb-2">
              naive quorum
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              Replicas vote, majority wins. No signatures, no equivocation detection — one lying
              replica can corrupt the result.
            </p>
          </div>
          <div className="md:col-span-6 rounded-xl border-2 border-primary/70 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-3 md:p-7 shadow-[0_0_60px_-18px_hsl(var(--primary)/0.55)] relative overflow-hidden">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-primary/90 mb-1 md:mb-2">
              This system
            </div>
            <div className="text-3xl md:text-6xl font-bold tracking-tight text-primary leading-none mb-1 md:mb-3">
              3 of 4
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-primary/80 mb-1 md:mb-3">
              signed prepares + signed commits
            </div>
            <p className="hidden md:block text-sm text-foreground/90 leading-relaxed">
              Each replica signs every message with its own Ed25519 key. Equivocation log tracks
              conflicting hashes; one lying replica gets caught and excluded. n≥3f+1 with f=1 means
              the system survives any one byzantine fault out of four.
            </p>
          </div>
        </div>

        <div className="md:hidden space-y-2 text-xs text-muted-foreground leading-relaxed -mt-4">
          <p>
            <span className="text-muted-foreground/80 font-mono">most agents:</span> the LLM&apos;s
            single yes/no decides — if it&apos;s wrong, the wrong action runs.
          </p>
          <p>
            <span className="text-muted-foreground/80 font-mono">majority vote:</span> replicas vote,
            majority wins — but no signatures, so a lying replica can corrupt the count.
          </p>
          <p>
            <span className="text-primary/80 font-mono">this system:</span> 3-of-4 signed quorum +
            equivocation detection — survives any one byzantine replica.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl pt-2">
          <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
            Below are five scenarios — clean quorum, one replica dissenting, equivocation caught,
            quorum stalled, leader timeout with view change. Each one shows the real PBFT phase
            matrix: who voted what, who got flagged byzantine, when quorum was reached, when it
            wasn&apos;t.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            <span className="font-mono text-foreground/80">Scope:</span> the Ed25519 signatures and
            SHA3-256 action hashes are real (Node&apos;s built-in{' '}
            <span className="font-mono text-foreground/80">node:crypto</span>). The protocol
            structure (3f+1 replicas, 2f+1 quorum, leader = replicas[view % n], equivocation log,
            view change on timeout) mirrors{' '}
            <span className="font-mono text-foreground/80">
              tdd005/crates/tdd005_orchestrator/src/bft.rs
            </span>{' '}
            byte-for-byte. This is the in-process VirtualBftCluster pattern (Patch 90), not a
            production multi-host PBFT deployment.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] md:text-xs font-mono text-muted-foreground/70 pt-1">
          <span>spec · TDD-005 bft.rs</span>
          <span>generated · {new Date(sceneData.generated_at).toISOString().slice(0, 10)}</span>
          <span>
            cluster · n={sceneData.cluster.n} · f={sceneData.cluster.f} · quorum=
            {sceneData.cluster.quorum}
          </span>
        </div>
      </header>

      <BftConsensus data={sceneData} />

      <footer className="mt-20 border-t border-border/40 pt-8 space-y-3 text-sm text-muted-foreground max-w-3xl">
        <p>
          The PBFT protocol on this page (PrePrepare → Prepare → Commit phases, leader rotation by{' '}
          <span className="font-mono text-foreground">view % n</span>, equivocation log keyed by{' '}
          <span className="font-mono text-foreground">(replica_id, sequence)</span> → set of
          action_hashes, view change on 5s timeout) is ported from{' '}
          <span className="font-mono text-foreground">
            tdd005/crates/tdd005_orchestrator/src/bft.rs
          </span>
          . Constants verbatim: n=4, f=1, quorum=2f+1=3, view_timeout_ms=5000. Verifiable by grep.
        </p>
        <p>
          The Rust implementation is the in-process{' '}
          <span className="font-mono text-foreground">VirtualBftCluster</span> wired into 5 use
          cases via Patch 90 (multi-device tool quorum, cognitive hard gate, constitutional
          hot-swap, federated peer consensus, provenance fork resolution). Multi-host PBFT with
          full view-change recovery for production deployment is implemented but not battle-tested
          — see <span className="font-mono text-foreground">docs/tdd/TDD004_TDD005_GAPS.md</span>.
          The build pipeline lives at{' '}
          <span className="font-mono text-foreground">demo/build-data-bft-consensus.mjs</span> in
          Banterpacks.
        </p>
      </footer>
    </div>
  );
}
