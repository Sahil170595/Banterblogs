import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { ZkAlignmentProof } from '@/components/scenes/ZkAlignmentProof';
import sceneDataRaw from '@/data/scenes/zk-alignment-proof.json';

// ---------------------------------------------------------------------------
// Build-time JSON shape validation. The build-data pipeline lives in Banterpacks
// at demo/build-data-zk-alignment-proof.mjs and produces the JSON imported above;
// this Zod schema is the contract between the two repos.
// ---------------------------------------------------------------------------

const BitProofVerifierSchema = z.object({
  a0_hex: z.string(),
  a1_hex: z.string(),
  e0_hex: z.string(),
  s0_hex: z.string(),
  e1_hex: z.string(),
  s1_hex: z.string(),
});

const BitProofProverSchema = z.object({
  bit_value: z.union([z.literal(0), z.literal(1)]),
  blinding_hex: z.string(),
  real_branch: z.union([z.literal(0), z.literal(1)]),
});

const RangeProofVerifierSchema = z.object({
  bits: z.number(),
  value_commitment_hex: z.string(),
  bit_commitments_hex: z.array(z.string()),
  bit_proofs: z.array(BitProofVerifierSchema),
});

const ProverViewSchema = z.object({
  bit_proofs_prover: z.array(BitProofProverSchema),
  total_blinding_hex: z.string(),
});

const BitCheckSchema = z.object({
  bit_index: z.number(),
  ok: z.boolean(),
  reason: z.string().nullable(),
});

const ScenarioRecordSchema = z.object({
  step_id: z.string(),
  step_index: z.number(),
  scenario_id: z.string(),
  title: z.string(),
  plain: z.string(),
  expected_outcome: z.enum(['pass', 'creation_refused', 'verifier_rejects']),
  beats: z.array(
    z.object({
      target_phase: z.string().nullable(),
      dwell_ms: z.number(),
      copy: z.string(),
    }),
  ),
  action: z.string(),
  constitution: z.string(),
  action_hash_hex: z.string(),
  constitution_hash_hex: z.string(),
  score_fixed: z.number(),
  threshold_fixed: z.number(),
  similarity_score: z.number(),
  threshold: z.number(),
  range_proof: RangeProofVerifierSchema.nullable(),
  prover_view: ProverViewSchema.nullable(),
  verifier_check: z.object({
    ok: z.boolean(),
    reason: z.string().nullable(),
    bit_checks: z.array(BitCheckSchema),
  }),
  tampered_bit: z.number().nullable(),
  original_commitment_hex: z.string().nullable(),
  tampered_commitment_hex: z.string().nullable(),
});

const SceneDataSchema = z.object({
  scene: z.string(),
  generated_at: z.string(),
  spec_ref: z.string(),
  description: z.string(),
  protocol: z.object({
    curve: z.string(),
    bits_per_range_proof: z.number(),
    fixed_point_scale: z.number(),
    fiat_shamir_hash: z.string(),
    pedersen_h_domain: z.string(),
    pedersen_h_hash_to_curve_note: z.string(),
    fields_revealed_to_verifier: z.array(z.string()),
    fields_hidden_from_verifier: z.array(z.string()),
  }),
  generator_g: z.object({ label: z.string(), point_hex: z.string() }),
  generator_h: z.object({ label: z.string(), point_hex: z.string() }),
  records: z.array(ScenarioRecordSchema),
});

type SceneData = ComponentProps<typeof ZkAlignmentProof>['data'];
const sceneData = SceneDataSchema.parse(sceneDataRaw) as unknown as SceneData;

const ZK_DESCRIPTION =
  'Constitutional alignment proofs on Ristretto255. The verifier confirms a valid 14-bit commitment and learns nothing else — not the score, not the bits, not which Schnorr branch was real. Threshold binding is enforced by a prover-side refusal-to-create rule, not the range proof.';

export const metadata: Metadata = {
  title: 'ZK Alignment Proof · Chimera Show',
  description: ZK_DESCRIPTION,
  openGraph: {
    title: 'ZK Alignment Proof · Chimera Show | Chimeraforge',
    description: ZK_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/show/zk-alignment-proof',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZK Alignment Proof · Chimera Show | Chimeraforge',
    description: ZK_DESCRIPTION,
  },
};

export default function ZkAlignmentProofPage() {
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
          <ArrowLeft className="h-4 w-4" aria-hidden />
          back to show
        </Link>
        <span className="signal-pill">Scene · 05</span>
      </div>

      <header className="mb-10 md:mb-14 space-y-8 md:space-y-10">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground">
          A live walkthrough · TDD-005 zero-knowledge proofs
        </div>

        <h1 className="font-bold tracking-tight leading-[0.95]">
          <span className="block text-3xl md:text-5xl text-muted-foreground/90 font-light">
            Proving alignment,
          </span>
          <span className="block text-5xl md:text-7xl text-primary mt-1 [overflow-wrap:break-word]">
            not revealing the score.
          </span>
        </h1>

        <p className="text-base md:text-lg text-foreground/80 max-w-3xl leading-relaxed">
          Before the orchestrator runs a risky action, it computes a similarity score against the
          constitution centroid. If the action is safe, that score is high. But shipping the score
          downstream leaks information about how the constitution was tuned — and an attacker who
          watches enough scores can reconstruct the centroid itself.{' '}
          <span className="text-foreground">
            Zero-knowledge alignment proofs let the verifier confirm a valid 14-bit commitment to
            the score and learn nothing else — threshold binding is enforced by a prover-side
            refusal-to-create rule, not the range proof itself.
          </span>
        </p>

        <div className="grid grid-cols-3 md:grid-cols-12 gap-2 md:gap-4">
          <div className="md:col-span-3 rounded-lg border border-border/30 bg-card/20 p-3 md:p-5 opacity-80">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-1 md:mb-2">
              Plaintext score
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground/70 leading-none mb-1 md:mb-2">
              0.92
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/60 mb-1 md:mb-2">
              full reveal
            </div>
            <p className="hidden md:block text-xs text-muted-foreground/80 leading-relaxed">
              The verifier learns the exact score. So does every downstream observer. With enough
              samples, the constitution centroid is reconstructable from the scores alone.
            </p>
          </div>
          <div className="md:col-span-3 rounded-lg border border-border/60 bg-card/40 p-3 md:p-5">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-foreground/70 mb-1 md:mb-2">
              Threshold flag
            </div>
            <div className="text-2xl md:text-4xl font-light tracking-tight text-foreground/85 leading-none mb-1 md:mb-2">
              true
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-muted-foreground/80 mb-1 md:mb-2">
              unsigned boolean
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              Just &ldquo;passes threshold: yes.&rdquo; Less leakage, but the verifier has to trust
              whoever computed it — there&apos;s no cryptographic proof anyone actually checked.
            </p>
          </div>
          <div className="md:col-span-6 rounded-xl border-2 border-primary/70 bg-gradient-to-br from-primary/[0.10] via-primary/[0.05] to-transparent p-3 md:p-7 shadow-[0_0_60px_-18px_hsl(var(--primary)/0.55)] relative overflow-hidden">
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-primary/90 mb-1 md:mb-2">
              This system
            </div>
            <div className="text-3xl md:text-6xl font-bold tracking-tight text-primary leading-none mb-1 md:mb-3">
              14-bit · proven
            </div>
            <div className="text-[9px] md:text-[11px] uppercase tracking-widest text-primary/80 mb-1 md:mb-3">
              Pedersen + Schnorr OR · 14-bit range
            </div>
            <p className="hidden md:block text-sm text-foreground/90 leading-relaxed">
              The verifier sees 14 Pedersen commitments, 14 Schnorr OR proofs, and one homomorphic
              sum check. Confirms cryptographically that the prover knew a valid 14-bit integer
              committing to the score. Threshold binding is enforced by a prover-side refusal-to-
              create rule. Cannot tell 0.76 from 0.92 from 0.99.
            </p>
          </div>
        </div>

        <div className="md:hidden space-y-2 text-xs text-muted-foreground leading-relaxed -mt-4">
          <p>
            <span className="text-muted-foreground/80 font-mono">plaintext:</span> ship the score
            (0.87…) — full reveal, centroid reconstructable.
          </p>
          <p>
            <span className="text-muted-foreground/80 font-mono">flag-only:</span> &ldquo;passes
            threshold&rdquo; — less leakage, but no cryptographic proof.
          </p>
          <p>
            <span className="text-primary/80 font-mono">this system:</span> Pedersen + Schnorr OR
            range proof — valid 14-bit commitment, mathematically, with nothing else disclosed.
            Threshold binding by prover refusal-to-create.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl pt-2">
          <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
            Below are five scenarios — high alignment, barely passing, exactly at the threshold,
            below-threshold creation refusal, and a verifier rejection after a bit-commitment
            tamper. Each scenario shows what the prover knows, what gets sent on the wire, and what
            the verifier sees.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            <span className="font-mono text-foreground/80">Scope:</span> the Pedersen commitments,
            Schnorr OR proofs, and Fiat-Shamir challenges are{' '}
            <span className="text-foreground">real</span> — generated at build time via{' '}
            <span className="font-mono text-foreground/80">@noble/curves</span> Ristretto255 +
            Node&apos;s <span className="font-mono text-foreground/80">sha3-512</span>. Every bundle
            actually verifies (or actually fails) within the same library. The protocol shape (per-bit
            Pedersen commit + Schnorr OR + homomorphic sum, 14-bit fixed-point ×10000) is{' '}
            <span className="text-foreground">protocol-faithful</span> to{' '}
            <span className="font-mono text-foreground/80">
              tdd005/crates/tdd004_provenance/src/zk.rs
            </span>
            .
          </p>
          <p className="text-xs md:text-sm text-muted-foreground/80 leading-relaxed">
            <span className="font-mono text-foreground/70">Honest divergence:</span> the H generator
            differs between implementations. Rust derives it via{' '}
            <span className="font-mono text-foreground/70">SHA3-512 hash-to-curve</span> of the
            domain string; this build uses RFC 9380 (SHA-512) via{' '}
            <span className="font-mono text-foreground/70">@noble/curves</span>. The two H points
            don&apos;t share bytes, but each is an independent generator with no known discrete log
            w.r.t. G. Proofs built here verify here; proofs built in Rust verify in Rust. Cross-impl
            verification would require matching the hash-to-curve algorithm.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] md:text-xs font-mono text-muted-foreground/70 pt-1">
          <span>spec · TDD-005 zk.rs</span>
          <span>generated · {new Date(sceneData.generated_at).toISOString().slice(0, 10)}</span>
          <span>
            curve · ristretto255 · {sceneData.protocol.bits_per_range_proof}-bit range
          </span>
        </div>
      </header>

      <ZkAlignmentProof data={sceneData} />

      <footer className="mt-20 border-t border-border/40 pt-8 space-y-3 text-sm text-muted-foreground max-w-3xl">
        <p>
          The ZK primitives on this page (Pedersen commitment{' '}
          <span className="font-mono text-foreground">C = v·G + r·H</span>, Schnorr OR proof for
          bit ∈ &#123;0, 1&#125;, bit-decomposition range proof with homomorphic sum, alignment
          proof bundling) are ported from{' '}
          <span className="font-mono text-foreground">
            tdd005/crates/tdd004_provenance/src/zk.rs
          </span>
          . Domain constants verbatim:{' '}
          <span className="font-mono text-foreground">tdd004_pedersen_h_v1</span>,{' '}
          <span className="font-mono text-foreground">schnorr_or_challenge_v1</span>. Fixed-point
          scale ×10000. Range bits = 14 (covers [0, 16383], suitable for a score in [0, 1]).
        </p>
        <p>
          The Rust implementation is wired into the orchestrator via{' '}
          <span className="font-mono text-foreground">AlignmentProof::create</span> (P102.9) and the
          JARVIS gateway calls it for high-risk tool gating (P89). The build pipeline lives at{' '}
          <span className="font-mono text-foreground">demo/build-data-zk-alignment-proof.mjs</span>{' '}
          in Banterpacks. Cross-implementation byte-compatibility is{' '}
          <span className="text-foreground">not</span>{' '}a goal of this demo — see &ldquo;honest
          divergence&rdquo; above.
        </p>
      </footer>
    </div>
  );
}
