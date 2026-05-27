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
  'PBFT-style consensus across 4 replicas — a 2-round signed quorum that still reaches the right answer when one replica is lying, silent, or running a stale view.';

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
          one agent saying yes isn&apos;t enough. Four replicas each hold their own Ed25519 key and
          vote in two rounds: pre-prepare (the leader proposes), prepare (everyone signs the
          proposal), commit (everyone signs the prepared set). Three matching signatures in both
          rounds = action runs.{' '}
          <span className="text-foreground">
            One replica can lie about which action it saw, sit silent through the timeout, or run a
            stale view, and the other three still agree on the same answer.
          </span>{' '}
          That&apos;s what makes the system tolerant of a faulty replica — including a malicious
          one.
        </p>

        <div className="grid grid-cols-3 md:grid-cols-12 gap-2 md:gap-4">
          <div className="md:col-span-3 rounded-lg border border-border/30 bg-card/20 p-3 md:p-5 opacity-80">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-1 md:mb-2">
              Most agents
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground/70 leading-none mb-1 md:mb-2">
              1 vote
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/60 mb-1 md:mb-2">
              the LLM&apos;s
            </div>
            <p className="hidden md:block text-xs text-muted-foreground/80 leading-relaxed">
              The model decides. If it&apos;s wrong or compromised, the wrong action runs.
            </p>
          </div>
          <div className="md:col-span-3 rounded-lg border border-border/60 bg-card/40 p-3 md:p-5">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-foreground/70 mb-1 md:mb-2">
              Majority vote
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-foreground/85 leading-none mb-1 md:mb-2">
              N votes
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/80 mb-1 md:mb-2">
              unsigned quorum
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              Replicas vote, majority wins. No signatures, no equivocation log — one lying replica
              can claim two different answers to two different peers and corrupt the count.
            </p>
          </div>
          <div className="md:col-span-6 rounded-xl border-2 border-primary/70 bg-gradient-to-br from-primary/[0.10] via-primary/[0.05] to-transparent p-3 md:p-7 shadow-[0_0_60px_-18px_hsl(var(--primary)/0.55)] relative overflow-hidden">
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
              Each replica signs every message with its own Ed25519 key. The equivocation log keys
              on{' '}
              <span className="font-mono text-xs">(replica, sequence)</span> and catches a replica
              that signs two different action hashes for the same slot. Tolerates 1 byzantine
              replica out of 4 — survives lies, silence, and stale views.
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
            SHA3-256 action hashes are real — generated here in the browser-build pipeline using
            Node&apos;s built-in{' '}
            <span className="font-mono text-foreground/80">node:crypto</span>. The protocol
            structure (n=4, f=1, quorum=2f+1=3, leader ={' '}
            <span className="font-mono text-foreground/80">replicas[view % n]</span>, equivocation
            log keyed on <span className="font-mono text-foreground/80">(replica, sequence)</span>,
            view change on 5s timeout) is{' '}
            <span className="text-foreground">protocol-faithful</span> to{' '}
            <span className="font-mono text-foreground/80">
              tdd005/crates/tdd005_orchestrator/src/bft.rs
            </span>{' '}
            — same constants, same phase ordering, same byzantine detection rule. This is the
            in-process VirtualBftCluster pattern (Patch 90), not a production multi-host PBFT
            deployment.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground/80 leading-relaxed">
            <span className="font-mono text-foreground/70">Honest divergence:</span> the action hash
            shown on screen is{' '}
            <span className="font-mono text-foreground/70">
              sha3_256(JSON.stringify(action))
            </span>{' '}
            (canonicalised JS object). The Rust runtime hashes{' '}
            <span className="font-mono text-foreground/70">serde_json::to_vec(&amp;Action)</span>{' '}
            of its enum, so the two byte strings differ by serializer — what&apos;s preserved is the
            <em> hash-then-sign </em> structure, not the input bytes. Same goes for replica names:
            the production cluster names replicas{' '}
            <span className="font-mono text-foreground/70">analytical</span>,{' '}
            <span className="font-mono text-foreground/70">creative</span>,{' '}
            <span className="font-mono text-foreground/70">adversarial</span>,{' '}
            <span className="font-mono text-foreground/70">domain_expert</span> (the cognitive
            agents from scene 02). This demo uses r0–r3 for visual room.
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
