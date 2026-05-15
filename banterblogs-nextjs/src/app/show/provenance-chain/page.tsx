import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { ProvenanceChain } from '@/components/scenes/ProvenanceChain';
import sceneDataRaw from '@/data/scenes/provenance-chain.json';

// Build-time validation. If build-data emits a shape mismatch, the
// static-render step fails loudly here instead of letting an undefined
// access crash the deployed page.
const MerkleProofSchema = z.object({
  leaf_index: z.number(),
  leaf_hash_hex: z.string(),
  sibling_count: z.number(),
  siblings_hex: z.array(z.string()),
});

const EventRecordSchema = z.object({
  step_id: z.string(),
  step_index: z.number(),
  event_type: z.string(),
  agent_id: z.string(),
  payload_preview: z.string(),
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
  event: z.object({
    agent_id: z.string(),
    trace_id: z.string(),
    event_type: z.string(),
    payload_hash_hex: z.string(),
    prev_event_hash_hex: z.string().nullable(),
    timestamp_ms: z.number(),
    metadata: z.record(z.string()),
  }),
  crypto: z.object({
    canonical_bytes_len: z.number(),
    canonical_bytes_preview_hex: z.string(),
    leaf_hash_hex: z.string(),
    signature_hex: z.string(),
    public_key_hex: z.string(),
    merkle_proof: MerkleProofSchema,
  }),
  verification: z.object({
    sig_verifies: z.boolean(),
    chain_verifies: z.boolean(),
    merkle_verifies: z.boolean(),
    all_pass: z.boolean(),
    tampered: z.boolean(),
  }),
  latency: z.object({
    actual_total_ms: z.number(),
    naive_total_ms: z.number(),
    saved_pct: z.number(),
  }),
});

const SceneDataSchema = z.object({
  scene: z.string(),
  generated_at: z.string(),
  spec_ref: z.string(),
  description: z.string(),
  trace: z.object({
    trace_id: z.string(),
    event_count: z.number(),
    merkle_root_hex: z.string(),
  }),
  records: z.array(EventRecordSchema),
});

type SceneData = ComponentProps<typeof ProvenanceChain>['data'];
const sceneData = SceneDataSchema.parse(sceneDataRaw) as unknown as SceneData;

const PROVENANCE_DESCRIPTION =
  'A signed, chained, Merkle-verifiable audit trail. Every action gets one SHA3-256 hash, one Ed25519 signature, one chain link, one Merkle proof — verifiable in any language with crypto primitives, no trusted audit service required.';

export const metadata: Metadata = {
  title: 'Provenance Chain · Chimera Show',
  description: PROVENANCE_DESCRIPTION,
  openGraph: {
    title: 'Provenance Chain · Chimera Show | Chimeraforge',
    description: PROVENANCE_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/show/provenance-chain',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Provenance Chain · Chimera Show | Chimeraforge',
    description: PROVENANCE_DESCRIPTION,
  },
};

export default function ProvenanceChainPage() {
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
        <span className="signal-pill">Scene · 03</span>
      </div>

      <header className="mb-10 md:mb-14 space-y-8 md:space-y-10">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground">
          A live walkthrough · TDD-004 provenance chain
        </div>

        <h1 className="font-bold tracking-tight leading-[0.95]">
          <span className="block text-3xl md:text-5xl text-muted-foreground/90 font-light">
            Every action,
          </span>
          <span className="block text-5xl md:text-7xl text-primary mt-1 [overflow-wrap:break-word]">
            signed and chained.
          </span>
        </h1>

        <p className="text-base md:text-lg text-foreground/80 max-w-3xl leading-relaxed">
          When an agent does something — read a file, write a file, make an HTTP call — that action
          becomes a signed, hash-chained event. Anyone with the public key and the chain root can
          verify it happened, in this exact position, after these exact predecessors. No central
          audit service in the loop. The whole thing verifies in any language with crypto
          primitives.
        </p>

        {/* Comparison: how systems track what they did. */}
        <div className="grid grid-cols-3 md:grid-cols-12 gap-2 md:gap-4">
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-3 md:p-5">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-1 md:mb-2">
              Most chatbots
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground/80 leading-none mb-1 md:mb-2">
              0
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1 md:mb-2">
              records of what they did
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              The model ran tools, then forgot. Want to know what happened? You don&apos;t.
            </p>
          </div>
          <div className="md:col-span-3 rounded-lg border border-border/40 bg-card/30 p-3 md:p-5">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-1 md:mb-2">
              Audit logs
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground/90 leading-none mb-1 md:mb-2">
              1 log
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1 md:mb-2">
              that you have to trust
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              Centralized append-only log. Verifiable only if you trust the operator. Quietly
              editable by whoever runs the database.
            </p>
          </div>
          <div className="md:col-span-6 rounded-xl border-2 border-primary/70 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-3 md:p-7 shadow-[0_0_60px_-18px_hsl(var(--primary)/0.55)] relative overflow-hidden">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-primary/90 mb-1 md:mb-2">
              This system
            </div>
            <div className="text-3xl md:text-6xl font-bold tracking-tight text-primary leading-none mb-1 md:mb-3">
              3 checks
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-primary/80 mb-1 md:mb-3">
              per event, locally verifiable
            </div>
            <p className="hidden md:block text-sm text-foreground/90 leading-relaxed">
              Every action becomes a SHA3-256 hashed, Ed25519 signed, hash-chained, Merkle-proven
              event. Three independent verifications. Re-runnable in any language. No trusted
              intermediary.
            </p>
          </div>
        </div>

        <div className="md:hidden space-y-2 text-xs text-muted-foreground leading-relaxed -mt-4">
          <p>
            <span className="text-muted-foreground/80 font-mono">most chatbots:</span> ran the tool,
            forgot what happened.
          </p>
          <p>
            <span className="text-muted-foreground/80 font-mono">audit logs:</span> centralized log
            you have to trust the operator of.
          </p>
          <p>
            <span className="text-primary/80 font-mono">this system:</span> SHA3-256 + Ed25519 +
            chain + Merkle — three independent crypto checks per event.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl pt-2">
          <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
            Below is a real trace — five events in one chain. Pick any event in the timeline to
            inspect its canonical bytes, its hash, its signature, its chain link, and its Merkle
            proof against the chain root. The fifth event was signed honestly, then tampered with
            after the fact — the signature catches it.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            <span className="font-mono text-foreground/80">Scope:</span> all crypto material on this
            page is real. The Ed25519 keypairs were generated by Node&apos;s native{' '}
            <span className="font-mono text-foreground/80">crypto.generateKeyPairSync</span>; the
            SHA3-256 hashes are real digests; the Merkle proofs verify against the real root. The
            wire format mirrors{' '}
            <span className="font-mono text-foreground/80">tdd004_provenance/src/lib.rs</span>{' '}
            byte-for-byte (domain tag, schema version, length-prefixed strings, sorted metadata).
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] md:text-xs font-mono text-muted-foreground/70 pt-1">
          <span>spec · TDD-004 provenance</span>
          <span>generated · {new Date(sceneData.generated_at).toISOString().slice(0, 10)}</span>
          <span>events · {sceneData.records.length}</span>
        </div>
      </header>

      <ProvenanceChain data={sceneData} />

      <footer className="mt-20 border-t border-border/40 pt-8 space-y-3 text-sm text-muted-foreground max-w-3xl">
        <p>
          The crypto algorithms on this page are deterministic, well-known, and match the Rust
          implementation in{' '}
          <span className="font-mono text-foreground">
            tdd005/crates/tdd004_provenance/src/lib.rs
          </span>{' '}
          byte-for-byte. The canonical_bytes wire format (domain tag{' '}
          <span className="font-mono text-foreground">PROV_EVENT_V1</span>, schema version 1,
          length-prefixed UTF-8 strings, sorted metadata) is ported verbatim. The Merkle root and
          per-event proofs use SHA3-256 with duplicate-last-for-odd, matching the Rust{' '}
          <span className="font-mono text-foreground">merkle_root()</span> and{' '}
          <span className="font-mono text-foreground">merkle_proof()</span> exactly.
        </p>
        <p>
          The build pipeline lives at{' '}
          <span className="font-mono text-foreground">demo/build-data-provenance-chain.mjs</span> in
          Banterpacks. It uses Node&apos;s built-in{' '}
          <span className="font-mono text-foreground">node:crypto</span> module — no external crypto
          dependency. Hot/warm/cold lifecycle tiering (WAL → rotated logs → S3 archive) is
          described in the Rust crate&apos;s{' '}
          <span className="font-mono text-foreground">wal.rs</span> and the TDD005 CLAUDE.md but is
          a runtime concern not visualised in this walkthrough.
        </p>
      </footer>
    </div>
  );
}
