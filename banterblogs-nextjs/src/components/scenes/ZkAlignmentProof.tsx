'use client';

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  ShieldCheck,
  Hourglass,
  AlertTriangle,
  Lock,
  Unlock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (mirror zk-alignment-proof.json)
// ---------------------------------------------------------------------------

type Beat = {
  target_phase: string | null;
  copy: string;
};

// Per-beat on-screen time, single-sourced from the copy length so the pacing
// can never drift from the text again. Research-grounded subtitle calibration:
// ~13 chars/sec is the conservative reading rate for technical copy read while
// also watching the visualization (the measured 50/50 split-attention point;
// BBC subtitles run ~15 CPS, Netflix 17-20 for lighter dialogue). +350ms to
// register the new line; clamped to a 1.5s floor (subtitle minimum ~0.83s,
// bumped for density) and a 7s ceiling (subtitle maximum). The typewriter runs
// ~9ms/char (~111 CPS) — far faster than the reading rate — so a length-derived
// dwell is always long enough for the text to finish typing.
function computeDwell(copy: string): number {
  return Math.min(7000, Math.max(1500, Math.round((copy.length / 13) * 1000 + 350)));
}

type BitProofVerifier = {
  a0_hex: string;
  a1_hex: string;
  e0_hex: string;
  s0_hex: string;
  e1_hex: string;
  s1_hex: string;
};

type BitProofProver = {
  bit_value: 0 | 1;
  blinding_hex: string;
  real_branch: 0 | 1;
};

type RangeProofVerifier = {
  bits: number;
  value_commitment_hex: string;
  bit_commitments_hex: string[];
  bit_proofs: BitProofVerifier[];
};

type ProverView = {
  bit_proofs_prover: BitProofProver[];
  total_blinding_hex: string;
};

type BitCheck = {
  bit_index: number;
  ok: boolean;
  reason: string | null;
};

type ScenarioRecord = {
  step_id: string;
  step_index: number;
  scenario_id: string;
  title: string;
  plain: string;
  expected_outcome: 'pass' | 'creation_refused' | 'verifier_rejects';
  beats: Beat[];
  action: string;
  constitution: string;
  action_hash_hex: string;
  constitution_hash_hex: string;
  score_fixed: number;
  threshold_fixed: number;
  similarity_score: number;
  threshold: number;
  range_proof: RangeProofVerifier | null;
  prover_view: ProverView | null;
  verifier_check: {
    ok: boolean;
    reason: string | null;
    bit_checks: BitCheck[];
  };
  tampered_bit: number | null;
  original_commitment_hex: string | null;
  tampered_commitment_hex: string | null;
};

type SceneData = {
  scene: string;
  generated_at: string;
  spec_ref: string;
  description: string;
  protocol: {
    curve: string;
    bits_per_range_proof: number;
    fixed_point_scale: number;
    fiat_shamir_hash: string;
    pedersen_h_domain: string;
    pedersen_h_hash_to_curve_note: string;
    fields_revealed_to_verifier: string[];
    fields_hidden_from_verifier: string[];
  };
  generator_g: { label: string; point_hex: string };
  generator_h: { label: string; point_hex: string };
  records: ScenarioRecord[];
};

type ZonePhase = 'prover' | 'construction' | 'verifier' | 'verdict';

const ZONE_META: Record<ZonePhase, { name: string; plain: string }> = {
  prover: { name: 'Prover', plain: 'knows the actual score' },
  construction: { name: 'Construction', plain: 'per-bit commits + Schnorr OR' },
  verifier: { name: 'Verifier', plain: 'sees only the bundle' },
  verdict: { name: 'Verdict', plain: 'pass / refused / rejected' },
};

// ---------------------------------------------------------------------------
// Inline Typewriter — no _shared/ imports per parked-branch rule
// ---------------------------------------------------------------------------

function Typewriter({
  text,
  reducedMotion,
}: {
  text: string;
  reducedMotion: boolean;
}) {
  const [shown, setShown] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (reducedMotion) {
      setShown(text);
      return () => {};
    }
    setShown('');
    let idx = 0;
    let stopped = false;
    function tick() {
      if (stopped) return;
      if (idx >= text.length) return;
      idx += 1;
      setShown(text.slice(0, idx));
      const ch = text[idx - 1];
      const delay =
        ch === '.' || ch === '?' || ch === '!' ? 110 : ch === ',' || ch === ';' ? 55 : 9;
      timerRef.current = setTimeout(tick, delay);
    }
    timerRef.current = setTimeout(tick, 40);
    return () => {
      stopped = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, reducedMotion]);

  return (
    <span aria-hidden>
      {shown}
      {!reducedMotion && shown.length < text.length && (
        <span className="inline-block w-[0.5ch] -mb-0.5 ml-0.5 bg-primary animate-pulse">&nbsp;</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncHex(hex: string, head = 8, tail = 6): string {
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

function outcomeBadge(outcome: ScenarioRecord['expected_outcome']) {
  switch (outcome) {
    case 'pass':
      return { label: 'passes', tone: 'border-accent/70 bg-accent/15 text-accent' };
    case 'creation_refused':
      return { label: 'refused', tone: 'border-primary/70 bg-primary/15 text-primary' };
    case 'verifier_rejects':
      return { label: 'rejected', tone: 'border-primary/70 bg-primary/15 text-primary' };
  }
}

function reasonLabel(reason: string | null): string {
  if (!reason) return '';
  return reason
    .replace(/^bit_(\d+)_/, 'bit $1 — ')
    .replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Scenario picker — roving-tabindex radiogroup
// ---------------------------------------------------------------------------

function ScenarioPicker({
  records,
  activeIndex,
  onSelect,
}: {
  records: ScenarioRecord[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const n = records.length;
      let next: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (activeIndex + 1) % n;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (activeIndex - 1 + n) % n;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = n - 1;
      }
      if (next !== null) {
        e.preventDefault();
        onSelect(next);
        buttonRefs.current[next]?.focus();
      }
    },
    [activeIndex, onSelect, records.length],
  );

  return (
    <div
      role="radiogroup"
      aria-label="Choose alignment-proof scenario"
      onKeyDown={onKey}
      className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-6"
    >
      {records.map((r, i) => {
        const isActive = i === activeIndex;
        const badge = outcomeBadge(r.expected_outcome);
        return (
          <button
            key={r.scenario_id}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(i)}
            className={`text-left p-3 rounded-lg border transition-colors ${
              isActive
                ? 'border-primary/70 bg-primary/[0.08] shadow-[0_0_24px_-8px_hsl(var(--primary)/0.4)]'
                : 'border-border/40 bg-card/20 hover:border-border/70 hover:bg-card/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${badge.tone}`}
              >
                {badge.label}
              </span>
            </div>
            <div className="text-sm font-medium text-foreground leading-snug">{r.title}</div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prover Zone — knows score, bit decomposition, blindings
// ---------------------------------------------------------------------------

function ProverPanel({
  record,
  visible,
  reducedMotion,
}: {
  record: ScenarioRecord;
  visible: boolean;
  reducedMotion: boolean;
}) {
  const bits = record.range_proof?.bits ?? 14;
  const proverBits = record.prover_view?.bit_proofs_prover ?? [];
  // For refused-creation, we still want to show the score on the prover side
  // so the viewer sees the prover *trying* — then the protocol blocking it.
  const refused = record.expected_outcome === 'creation_refused';

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0.3 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-5 md:p-6 ${
        visible
          ? 'border-accent/40 bg-accent/[0.04]'
          : 'border-border/30 bg-card/10'
      }`}
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Unlock className="h-4 w-4 text-accent" aria-hidden />
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Prover side — what is known
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {bits}-bit fixed-point
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-center mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            similarity score
          </div>
          <div className="font-mono text-3xl md:text-4xl font-bold text-foreground leading-none">
            {record.similarity_score.toFixed(4)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">cosine vs constitution centroid</div>
        </div>
        <div className="hidden md:flex flex-col items-center text-muted-foreground/60">
          <span className="font-mono text-[10px] uppercase tracking-widest">×10000</span>
          <span className="font-mono text-2xl leading-none">→</span>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            fixed-point value
          </div>
          <div className="font-mono text-3xl md:text-4xl font-bold text-foreground leading-none">
            {record.score_fixed.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            threshold {record.threshold_fixed.toLocaleString()} ({record.threshold.toFixed(2)})
          </div>
        </div>
      </div>

      {refused ? (
        <div className="rounded border border-primary/40 bg-primary/[0.06] p-4 text-sm text-foreground/90">
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="h-4 w-4 text-primary" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              AlignmentProof::create refuses
            </span>
          </div>
          The protocol checks <span className="font-mono text-foreground">score_fixed &lt; threshold_fixed</span>{' '}
          and returns <span className="font-mono text-foreground">ZkError::ValueOutOfRange</span>. No bit
          decomposition, no commits, no bundle. The verifier never hears about this attempted action.
        </div>
      ) : (
        <BitStripProver bits={proverBits} totalBits={bits} reducedMotion={reducedMotion} />
      )}
    </motion.div>
  );
}

function BitStripProver({
  bits,
  totalBits,
  reducedMotion,
}: {
  bits: BitProofProver[];
  totalBits: number;
  reducedMotion: boolean;
}) {
  // 14 bits, LSB first per zk.rs convention (bit i corresponds to 2^i)
  const cells = Array.from({ length: totalBits }, (_, i) => bits[i] ?? null);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        bit decomposition · 2<sup>13</sup> ... 2<sup>0</sup>
      </div>
      <div
        role="grid"
        aria-label="Per-bit values known to the prover, most significant bit first"
        className="grid grid-cols-14 gap-1"
        style={{ gridTemplateColumns: `repeat(${totalBits}, minmax(0, 1fr))` }}
      >
        {cells
          .slice()
          .reverse()
          .map((b, idx) => {
            const bitIdx = totalBits - 1 - idx;
            const value = b?.bit_value ?? null;
            return (
              <motion.div
                key={bitIdx}
                role="gridcell"
                aria-label={`bit ${bitIdx}: ${value ?? 'unknown'}`}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: reducedMotion ? 0 : idx * 0.02 }}
                className={`aspect-square min-h-[26px] flex flex-col items-center justify-center rounded border font-mono ${
                  value === 1
                    ? 'border-accent/70 bg-accent/20 text-accent'
                    : value === 0
                      ? 'border-border/60 bg-card/30 text-muted-foreground'
                      : 'border-border/30 bg-card/10 text-muted-foreground/40'
                }`}
              >
                <span className="text-sm md:text-base font-bold leading-none">{value ?? '?'}</span>
                <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-muted-foreground/70 mt-0.5">
                  2<sup>{bitIdx}</sup>
                </span>
              </motion.div>
            );
          })}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground/80 font-mono">
        prover also holds {bits.length} fresh blindings <span className="text-muted-foreground/60">r_i</span> — one per bit, never sent
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Construction Zone — Pedersen commits + Schnorr OR per bit
// ---------------------------------------------------------------------------

function ConstructionPanel({
  record,
  visible,
  reducedMotion,
  sceneData,
}: {
  record: ScenarioRecord;
  visible: boolean;
  reducedMotion: boolean;
  sceneData: SceneData;
}) {
  const refused = record.expected_outcome === 'creation_refused';
  if (refused) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0.3 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-border/30 bg-card/10 p-5 md:p-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <Hourglass className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Construction skipped
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          With score below threshold, no bit commitments are made and no Schnorr OR proofs run. The
          construction zone is empty — that&apos;s the whole point: the protocol refuses to even build
          a bundle for an aligned-below action.
        </p>
      </motion.div>
    );
  }

  const range = record.range_proof!;
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0.3 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-5 md:p-6 ${
        visible
          ? 'border-primary/40 bg-primary/[0.04]'
          : 'border-border/30 bg-card/10'
      }`}
    >
      <header className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Construction — Pedersen + Schnorr OR per bit
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Fiat-Shamir · SHA3-512
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <CommitRow
          label="G (Ristretto basepoint)"
          hex={sceneData.generator_g.point_hex}
          tone="muted"
        />
        <CommitRow
          label={`H = hash-to-curve("${sceneData.protocol.pedersen_h_domain}")`}
          hex={sceneData.generator_h.point_hex}
          tone="muted"
        />
      </div>

      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90">
          per-bit Pedersen commits · C_i = b_i · G + r_i · H
        </div>
        <CommitStrip
          commitments={range.bit_commitments_hex}
          tamperedBit={record.tampered_bit}
          reducedMotion={reducedMotion}
        />
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 pt-2">
          per-bit Schnorr OR proof · 6 scalars · prove b_i ∈ &#123;0, 1&#125; without revealing which
        </div>
        <BitProofDetail proof={range.bit_proofs[0]} bitIndex={0} reducedMotion={reducedMotion} />
        <div className="text-[10px] text-muted-foreground/70 font-mono">
          + {range.bit_proofs.length - 1} more identical-shape proofs (one per bit)
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 pt-2">
          value commitment · Σ(2<sup>i</sup> · C_i) — homomorphic sum binds the bits together
        </div>
        <CommitRow label="C_value" hex={range.value_commitment_hex} tone="primary" />
      </div>
    </motion.div>
  );
}

function CommitRow({
  label,
  hex,
  tone,
}: {
  label: string;
  hex: string;
  tone: 'primary' | 'muted';
}) {
  return (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/90 shrink-0">
        {label}
      </span>
      <span
        className={`font-mono ${
          tone === 'primary' ? 'text-primary' : 'text-foreground/80'
        } break-all`}
        aria-label={`commitment hex ${hex}`}
        title={hex}
      >
        {truncHex(hex, 12, 10)}
      </span>
    </div>
  );
}

function CommitStrip({
  commitments,
  tamperedBit,
  reducedMotion,
}: {
  commitments: string[];
  tamperedBit: number | null;
  reducedMotion: boolean;
}) {
  return (
    <div
      role="grid"
      aria-label="Per-bit Pedersen commitments, opaque to verifier"
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${commitments.length}, minmax(0, 1fr))` }}
    >
      {commitments
        .slice()
        .reverse()
        .map((hex, idx) => {
          const bitIdx = commitments.length - 1 - idx;
          const isTampered = tamperedBit === bitIdx;
          return (
            <motion.div
              key={bitIdx}
              role="gridcell"
              aria-label={`bit ${bitIdx} commitment ${isTampered ? '(tampered)' : ''}`}
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: reducedMotion ? 0 : idx * 0.02 }}
              className={`aspect-[2/3] min-h-[44px] flex flex-col items-center justify-center rounded border font-mono p-1 ${
                isTampered
                  ? 'border-primary bg-primary/25 shadow-[0_0_18px_-2px_hsl(var(--primary)/0.55)]'
                  : 'border-border/60 bg-card/30 text-muted-foreground'
              }`}
              title={hex}
            >
              <span className="text-[8px] md:text-[9px] tracking-tight text-foreground/70">
                {hex.slice(0, 4)}
              </span>
              <span className="text-[8px] md:text-[9px] text-muted-foreground/60">…</span>
              <span className="text-[8px] md:text-[9px] tracking-tight text-foreground/70">
                {hex.slice(-4)}
              </span>
              <span className="text-[7px] uppercase tracking-widest text-muted-foreground/70 mt-0.5">
                b<sub>{bitIdx}</sub>
              </span>
            </motion.div>
          );
        })}
    </div>
  );
}

function BitProofDetail({
  proof,
  bitIndex,
  reducedMotion,
}: {
  proof: BitProofVerifier;
  bitIndex: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded border border-border/40 bg-card/20 p-3 md:p-4 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-[10px] font-mono"
    >
      <div className="col-span-2 md:col-span-3 text-[10px] uppercase tracking-widest text-muted-foreground/80 mb-1">
        bit-{bitIndex} proof bundle (verifier-visible only)
      </div>
      <ScalarRow label="a_0" hex={proof.a0_hex} />
      <ScalarRow label="a_1" hex={proof.a1_hex} />
      <ScalarRow label="e_0" hex={proof.e0_hex} />
      <ScalarRow label="s_0" hex={proof.s0_hex} />
      <ScalarRow label="e_1" hex={proof.e1_hex} />
      <ScalarRow label="s_1" hex={proof.s1_hex} />
    </motion.div>
  );
}

function ScalarRow({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground/80 shrink-0" aria-hidden>
        {label}
      </span>
      <span
        className="text-foreground/80 break-all"
        aria-label={`${label} ${hex}`}
        title={hex}
      >
        {truncHex(hex, 8, 6)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verifier Zone — sees only the bundle, runs verify()
// ---------------------------------------------------------------------------

function VerifierPanel({
  record,
  visible,
  reducedMotion,
}: {
  record: ScenarioRecord;
  visible: boolean;
  reducedMotion: boolean;
}) {
  const refused = record.expected_outcome === 'creation_refused';
  if (refused) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0.3 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-border/30 bg-card/10 p-5 md:p-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Nothing reaches the verifier
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Because the prover refused to construct a bundle, the verifier&apos;s view is silence. There
          is no proof to evaluate. The action does not run.
        </p>
      </motion.div>
    );
  }

  const checks = record.verifier_check.bit_checks;
  const allOk = record.verifier_check.ok;
  const failingBit = checks.find((c) => !c.ok)?.bit_index ?? null;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0.3 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-5 md:p-6 ${
        visible
          ? allOk
            ? 'border-accent/40 bg-accent/[0.04]'
            : 'border-primary/50 bg-primary/[0.04]'
          : 'border-border/30 bg-card/10'
      }`}
    >
      <header className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-foreground" aria-hidden />
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-foreground">
            Verifier side — runs verify()
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          knows: threshold, action_hash, constitution_hash, bundle
        </span>
      </header>

      <div className="space-y-3 mb-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90">
          per-bit Schnorr OR check (e_0 + e_1 ≟ Fiat-Shamir(C, a_0, a_1) &amp; branch equations)
        </div>
        <CheckStrip checks={checks} failingBit={failingBit} reducedMotion={reducedMotion} />
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 pt-2">
          homomorphic sum check · Σ(2<sup>i</sup> · C_i) ≟ C_value
        </div>
        <SumCheckRow allOk={allOk} failingBit={failingBit} />
      </div>
    </motion.div>
  );
}

function CheckStrip({
  checks,
  failingBit,
  reducedMotion,
}: {
  checks: BitCheck[];
  failingBit: number | null;
  reducedMotion: boolean;
}) {
  return (
    <div
      role="grid"
      aria-label="Per-bit verification results"
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${checks.length}, minmax(0, 1fr))` }}
    >
      {checks
        .slice()
        .reverse()
        .map((c, idx) => {
          const bitIdx = checks.length - 1 - idx;
          const isFailing = failingBit === bitIdx;
          // Bits past the failing one weren't checked (verify short-circuits).
          const wasChecked = failingBit === null || bitIdx <= failingBit;
          return (
            <motion.div
              key={bitIdx}
              role="gridcell"
              aria-label={`bit ${bitIdx}: ${
                isFailing ? `failed — ${c.reason ?? 'unknown'}` : wasChecked ? 'ok' : 'not reached'
              }`}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: reducedMotion ? 0 : idx * 0.02 }}
              className={`aspect-square min-h-[26px] flex flex-col items-center justify-center rounded border ${
                isFailing
                  ? 'border-primary bg-primary/25 text-primary shadow-[0_0_18px_-2px_hsl(var(--primary)/0.55)]'
                  : wasChecked
                    ? 'border-accent/60 bg-accent/15 text-accent'
                    : 'border-border/30 bg-card/10 text-muted-foreground/40'
              }`}
            >
              <span className="text-sm font-bold leading-none">
                {isFailing ? '×' : wasChecked ? '✓' : '·'}
              </span>
              <span className="text-[7px] uppercase tracking-widest mt-0.5 text-muted-foreground/80">
                b<sub>{bitIdx}</sub>
              </span>
            </motion.div>
          );
        })}
    </div>
  );
}

function SumCheckRow({
  allOk,
  failingBit,
}: {
  allOk: boolean;
  failingBit: number | null;
}) {
  if (failingBit !== null) {
    return (
      <div className="rounded border border-border/40 bg-card/20 p-3 text-xs font-mono text-muted-foreground/70">
        skipped — short-circuited at bit {failingBit}
      </div>
    );
  }
  return (
    <div
      className={`rounded border p-3 text-xs font-mono ${
        allOk
          ? 'border-accent/60 bg-accent/[0.08] text-accent'
          : 'border-primary/60 bg-primary/[0.08] text-primary'
      }`}
    >
      {allOk ? '✓ Σ(2^i · C_i) == C_value — bits committed consistently' : '× sum mismatch'}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verdict + Journey + Aftermath
// ---------------------------------------------------------------------------

function VerdictPanel({
  record,
  visible,
  reducedMotion,
}: {
  record: ScenarioRecord;
  visible: boolean;
  reducedMotion: boolean;
}) {
  const outcome = record.expected_outcome;
  const passed = record.verifier_check.ok;

  const headline =
    outcome === 'pass'
      ? 'PROOF VERIFIES · score never revealed'
      : outcome === 'creation_refused'
        ? 'REFUSED · construction blocked'
        : `REJECTED · ${reasonLabel(record.verifier_check.reason)}`;

  const Icon = passed ? ShieldCheck : outcome === 'creation_refused' ? Lock : AlertTriangle;
  const tone = passed
    ? 'border-accent/70 bg-accent/[0.14] text-accent shadow-[0_0_50px_-12px_hsl(var(--accent)/0.45)]'
    : 'border-primary/80 bg-primary/[0.18] text-primary shadow-[0_0_60px_-12px_hsl(var(--primary)/0.6)]';

  const summary =
    outcome === 'pass'
      ? `The 14 per-bit Schnorr OR proofs verify and the homomorphic sum binds them to C_value. Cryptographic guarantee: the prover knew a valid 14-bit score committing to C_value. Threshold-binding (≥ ${record.threshold.toFixed(2)}) comes from the prover-side refusal-to-create rule, not the proof itself — that's why the demo shipped a refused-creation scenario.`
      : outcome === 'creation_refused'
        ? `score_fixed (${record.score_fixed}) < threshold_fixed (${record.threshold_fixed}). AlignmentProof::create returns ZkError::ValueOutOfRange before any commitments exist. The verifier never sees this attempted action — and learns nothing about its score either.`
        : `The bundle was syntactically well-formed, but ${reasonLabel(record.verifier_check.reason)}. The protocol caught the tamper without learning anything about the original score.`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`w-full rounded-xl border-2 ${tone} p-6 md:p-8`}
        >
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4 flex-wrap">
            <Icon className="h-7 w-7 md:h-9 md:w-9" aria-hidden />
            <div className="font-mono text-xl md:text-2xl font-bold tracking-tight leading-tight">
              {headline}
            </div>
          </div>
          <p className="text-base md:text-lg text-foreground/95 leading-relaxed">{summary}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function JourneyPanel({ record }: { record: ScenarioRecord }) {
  // Estimate from zk.rs §perf comment ("ZK range proof: ~10ms for 14-bit proof").
  // Per-bit ~0.7ms (point mults dominate). No "naive baseline" comparison — leaking
  // the score in cleartext costs near zero but achieves no privacy, so the two
  // numbers aren't comparable. The honest framing is: this is what privacy costs.
  const proofCostMs = record.range_proof ? Math.round(record.range_proof.bits * 0.7) : 0;
  const stalled = !record.range_proof;
  const bundleBytes = record.range_proof
    ? 32 + record.range_proof.bit_commitments_hex.length * 32 + record.range_proof.bit_proofs.length * 32 * 6
    : 0;

  return (
    <div className="signal-panel-strong p-5 md:p-7 mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr] gap-4 md:gap-6 items-baseline">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/90 mb-1.5">
          proof construction
        </div>
        <div className="font-mono text-2xl md:text-3xl text-foreground font-bold leading-tight">
          {stalled ? '—' : `~${proofCostMs}ms`}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5">
          {stalled
            ? 'no bundle constructed'
            : `14 × Pedersen commit + 14 × Schnorr OR · estimate from zk.rs §perf, not a benchmark`}
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/90 mb-1.5">
          bundle on the wire
        </div>
        <div className="font-mono text-2xl md:text-3xl text-foreground font-bold leading-tight">
          {stalled ? '—' : `~${bundleBytes} B`}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5">
          {stalled
            ? 'nothing sent'
            : 'value commit (32B) + 14 bit commits (32B each) + 14 Schnorr proofs (6×32B each)'}
        </div>
      </div>
      <div className="md:border-l md:border-border/30 md:pl-6">
        <div className="text-[11px] uppercase tracking-widest text-primary/95 mb-1.5">
          what verifier learns
        </div>
        <div className="font-mono text-2xl md:text-3xl text-primary font-bold leading-tight">
          {stalled ? 'nothing' : 'a valid 14-bit score'}
        </div>
        <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          {stalled
            ? 'the action never reached the wire'
            : `proves: prover knew a 14-bit integer committing to C_value. ≥-threshold binding is by prover-side refusal-to-create, not the range proof.`}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Beat controller (same shape as scene 04)
// ---------------------------------------------------------------------------

function useBeatController({
  beats,
  reducedMotion,
}: {
  beats: Beat[];
  reducedMotion: boolean;
}) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    stop();
    if (!playing || reducedMotion) return;
    if (beatIndex >= beats.length - 1) return;
    const dwell = computeDwell(beats[beatIndex]?.copy ?? '');
    timerRef.current = setTimeout(() => setBeatIndex((i) => i + 1), dwell);
    return stop;
  }, [beatIndex, beats, playing, reducedMotion, stop]);

  return {
    beatIndex,
    playing,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    setBeatIndex,
    reset: () => {
      stop();
      setBeatIndex(0);
      setPlaying(true);
    },
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ZkAlignmentProof({ data }: { data: SceneData }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // SSR-safe reducedMotion — default true on first render to avoid hydration mismatch.
  // (Scene 03 v1 regression caught this.)
  const rawReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    setReducedMotion(rawReducedMotion ?? false);
  }, [rawReducedMotion]);

  const record = data.records[activeIndex];

  const { beatIndex, playing, play, pause, setBeatIndex, reset } = useBeatController({
    beats: record.beats,
    reducedMotion,
  });

  // Reset to beat 0 when scenario changes.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Which zones are revealed at the current beat?
  const revealedZones = useMemo(() => {
    const targets = record.beats.slice(0, beatIndex + 1).map((b) => b.target_phase);
    const set = new Set<ZonePhase>();
    for (const t of targets) {
      if (t === 'prover' || t === 'construction' || t === 'verifier') set.add(t);
    }
    // verdict reveals once the verifier beats have run
    const lastBeat = record.beats[beatIndex];
    if (lastBeat?.target_phase === 'verifier' && beatIndex >= record.beats.length - 1) {
      set.add('verdict');
    }
    return set;
  }, [beatIndex, record.beats]);

  const verdictRevealed = revealedZones.has('verdict');

  const currentBeat = record.beats[beatIndex];
  const finalBeat = beatIndex >= record.beats.length - 1;

  return (
    <div id="demo" className="space-y-6 md:space-y-8">
      <ScenarioPicker
        records={data.records}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
      />

      <div className="rounded-xl border border-border/40 bg-card/30 p-5 md:p-7">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            scenario · {record.scenario_id}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
            action · <span className="text-foreground/80">{record.action}</span>
          </div>
        </div>
        <p className="text-base md:text-lg text-foreground/95 leading-relaxed">{record.plain}</p>
      </div>

      <JourneyPanel record={record} />

      <div className="space-y-4 md:space-y-5">
        <ProverPanel
          record={record}
          visible={revealedZones.has('prover')}
          reducedMotion={reducedMotion}
        />
        <ConstructionPanel
          record={record}
          visible={revealedZones.has('construction')}
          reducedMotion={reducedMotion}
          sceneData={data}
        />
        <VerifierPanel
          record={record}
          visible={revealedZones.has('verifier')}
          reducedMotion={reducedMotion}
        />
        <VerdictPanel
          record={record}
          visible={verdictRevealed}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Beat controls — same pattern as scene 04 */}
      <div className="rounded-xl border border-border/40 bg-card/20 p-3 md:p-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={playing ? pause : play}
          className="inline-flex items-center gap-1.5 rounded border border-border/60 bg-card/40 hover:bg-card/60 px-3 py-1.5 text-xs font-mono text-foreground"
          aria-label={playing ? 'pause autoplay' : 'resume autoplay'}
        >
          {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
          {playing ? 'pause' : 'play'}
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded border border-border/60 bg-card/40 hover:bg-card/60 px-3 py-1.5 text-xs font-mono text-foreground"
          aria-label="restart this scenario from the first beat"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          restart
        </button>

        <div
          role="group"
          aria-label="Beat navigation"
          className="flex items-center gap-1 ml-1"
        >
          {record.beats.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                pause();
                setBeatIndex(i);
              }}
              aria-label={`beat ${i + 1} of ${record.beats.length}`}
              className={`h-8 w-10 md:w-12 rounded border ${
                i === beatIndex
                  ? 'border-primary bg-primary/30'
                  : i < beatIndex
                    ? 'border-accent/60 bg-accent/15'
                    : 'border-border/40 bg-card/10 hover:bg-card/30'
              } transition-colors`}
            />
          ))}
        </div>

        <div className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {finalBeat ? 'final' : `beat ${beatIndex + 1} / ${record.beats.length}`}
        </div>
      </div>

      {/* Narration line + sr-only live region (persistent, outside AnimatePresence) */}
      <div className="rounded-xl border border-border/40 bg-card/15 p-4 md:p-5 min-h-[80px]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          {currentBeat?.target_phase
            ? ZONE_META[currentBeat.target_phase as ZonePhase]?.name ?? currentBeat.target_phase
            : 'narration'}
        </div>
        <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
          <Typewriter text={currentBeat?.copy ?? ''} reducedMotion={reducedMotion} />
        </p>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {currentBeat?.copy ?? ''}
      </div>

      {/* Protocol disclosures */}
      <details className="rounded-xl border border-border/40 bg-card/15 p-4 md:p-5">
        <summary className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground cursor-pointer">
          protocol details · ristretto255 · {data.protocol.bits_per_range_proof}-bit range
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-accent/90 mb-1.5">
              revealed to verifier
            </div>
            <ul className="space-y-1 text-foreground/80">
              {data.protocol.fields_revealed_to_verifier.map((f) => (
                <li key={f} className="font-mono">
                  · {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-primary/90 mb-1.5">
              hidden from verifier
            </div>
            <ul className="space-y-1 text-foreground/80">
              {data.protocol.fields_hidden_from_verifier.map((f) => (
                <li key={f} className="font-mono">
                  · {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          {data.protocol.pedersen_h_hash_to_curve_note}
        </p>
      </details>
    </div>
  );
}
