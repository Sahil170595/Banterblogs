'use client';

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Hash,
  Signature,
  Link as LinkIcon,
  TreePine,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  CornerDownRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ---- Types (mirror provenance-chain.json shape) ----

type Beat = {
  target_phase: string | null;
  dwell_ms: number;
  copy: string;
};

type EventRecord = {
  step_id: string;
  step_index: number;
  event_type: string;
  agent_id: string;
  payload_preview: string;
  plain: string;
  summary?: string | null;
  aftermath?: string | null;
  beats: Beat[];
  event: {
    agent_id: string;
    trace_id: string;
    event_type: string;
    payload_hash_hex: string;
    prev_event_hash_hex: string | null;
    timestamp_ms: number;
    metadata: Record<string, string>;
  };
  crypto: {
    canonical_bytes_len: number;
    canonical_bytes_preview_hex: string;
    leaf_hash_hex: string;
    signature_hex: string;
    public_key_hex: string;
    merkle_proof: {
      leaf_index: number;
      leaf_hash_hex: string;
      sibling_count: number;
      siblings_hex: string[];
      sibling_kinds?: ('paired' | 'self')[];
    };
  };
  verification: {
    sig_verifies: boolean;
    chain_verifies: boolean;
    merkle_verifies: boolean;
    all_pass: boolean;
    tampered: boolean;
  };
  latency: {
    actual_total_ms: number;
    naive_total_ms: number;
    saved_pct: number;
    is_estimate?: boolean;
    breakdown?: {
      canonical_encode_ms: number;
      ed25519_sign_ms: number;
      ed25519_verify_ms: number;
      merkle_steps: number;
      merkle_total_ms: number;
    };
  };
};

type SceneData = {
  scene: string;
  generated_at: string;
  spec_ref: string;
  description: string;
  trace: {
    trace_id: string;
    event_count: number;
    merkle_root_hex: string;
  };
  records: EventRecord[];
};

type PhaseId = 'event' | 'canonical' | 'sign' | 'chain' | 'merkle' | 'verify';

const PHASE_META: Record<PhaseId, { name: string; Icon: typeof Hash; plain: string }> = {
  event: { name: 'Event', Icon: Hash, plain: 'who, what, when' },
  canonical: { name: 'Canonical bytes', Icon: Hash, plain: 'deterministic encoding' },
  sign: { name: 'SHA3 + Ed25519', Icon: Signature, plain: 'hash + signature' },
  chain: { name: 'Chain link', Icon: LinkIcon, plain: 'prev_event_hash' },
  merkle: { name: 'Merkle proof', Icon: TreePine, plain: 'leaf → root path' },
  verify: { name: 'Verify', Icon: ShieldCheck, plain: 'three independent checks' },
};

const PHASES: PhaseId[] = ['event', 'canonical', 'sign', 'chain', 'merkle', 'verify'];

// ---- Inline Typewriter (kept inline per playbook §10 sin-watch — the
//      _shared extraction caused runtime bugs; new scenes inline). ----

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
        ch === '.' || ch === '?' || ch === '!'
          ? 110
          : ch === ',' || ch === ';'
          ? 55
          : 9;
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
        <span className="inline-block w-[0.5ch] -mb-0.5 ml-0.5 bg-primary animate-pulse">
          &nbsp;
        </span>
      )}
    </span>
  );
}

// ---- Scene-specific helpers ----

function pickEntryIndex(_records: EventRecord[]): number {
  // Start on event 1 (the genesis). The tamper case at event 5 is the
  // reveal — visitors get there via scrubbing or auto-advance.
  return 0;
}

function fmtHex(hex: string, head = 8, tail = 4) {
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

// Vertical timeline node — single radio button (v1 audit C7 collapsed
// the nested button-in-div). Native button with role=radio + aria-checked
// is widely supported despite the ARIA-spec quibble; the alternative
// (div+role=radio) loses native focus/keyboard for marginal correctness.
function TimelineNode({
  rec,
  isActive,
  isPast,
  onClick,
  reducedMotion,
  tabIndex,
}: {
  rec: EventRecord;
  isActive: boolean;
  isPast: boolean;
  onClick: () => void;
  reducedMotion: boolean;
  tabIndex: number;
}) {
  const tampered = rec.verification.tampered;
  const ring = isActive
    ? 'border-primary shadow-[0_0_30px_-10px_hsl(var(--primary)/0.55)]'
    : tampered
    ? 'border-primary/50'
    : isPast
    ? 'border-accent/60'
    : 'border-border/40';
  const dot = isActive
    ? 'bg-primary'
    : tampered
    ? 'bg-primary/70'
    : 'bg-accent/70';
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      tabIndex={tabIndex}
      onClick={onClick}
      aria-label={`Event ${rec.step_index + 1} of ${5}, ${rec.event.event_type}${tampered ? ', tampered — signature failed' : ', verified'}`}
      className={`group flex items-center gap-3 w-full text-left rounded-lg border ${ring} bg-card/40 backdrop-blur-sm p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        isActive ? '' : 'hover:border-border'
      }`}
    >
      <motion.span
        animate={reducedMotion ? { scale: 1 } : { scale: isActive ? 1.2 : 1 }}
        transition={{ duration: 0.3 }}
        className={`inline-block h-3 w-3 rounded-full ${dot} shrink-0`}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`font-mono text-[11px] uppercase tracking-widest ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            event {rec.step_index + 1}
          </span>
          <span
            className={`font-mono text-[11px] ${
              tampered ? 'text-primary' : 'text-accent/90'
            }`}
            aria-hidden
          >
            {tampered ? 'TAMPERED' : 'verified'}
          </span>
        </div>
        <div
          className={`text-[12px] md:text-[13px] leading-snug truncate mt-0.5 ${
            isActive ? 'text-foreground' : 'text-foreground/80'
          }`}
        >
          {rec.event.event_type}
        </div>
      </div>
    </button>
  );
}

// Phase card — one per crypto phase. Reveals progressively as the
// narration walks through the beats. Verify card optionally goes to
// emphasizedVerify mode (full-width, larger title) when active or when
// the verify beat is past — v1 audit C11 progressive-focus pattern.
function PhaseCard({
  phaseId,
  isActive,
  isRevealed,
  reducedMotion,
  children,
  emphasized = false,
  failedWrap = false,
}: {
  phaseId: PhaseId;
  isActive: boolean;
  isRevealed: boolean;
  reducedMotion: boolean;
  children: ReactNode;
  emphasized?: boolean;
  failedWrap?: boolean;
}) {
  const meta = PHASE_META[phaseId];
  const Icon = meta.Icon;
  // v1 audit C9 — `inert` keeps unrevealed cards out of the tab order
  // AND hides them from AT consistently. React 19 passes the inert
  // boolean to the underlying element natively.
  const inertProp = !isRevealed ? { inert: '' as unknown as boolean } : {};
  const border = failedWrap
    ? 'border-primary shadow-[0_0_44px_-10px_hsl(var(--primary)/0.65)]'
    : isActive
      ? 'border-primary shadow-[0_0_36px_-12px_hsl(var(--primary)/0.55)]'
      : 'border-border/40';
  const bg = failedWrap
    ? 'bg-primary/[0.06]'
    : 'bg-card/40';
  return (
    <motion.div
      animate={
        reducedMotion
          ? { opacity: isRevealed ? 1 : 0.5 }
          : { opacity: isRevealed ? 1 : 0.2, scale: isActive ? 1.01 : 1 }
      }
      transition={{ duration: 0.35, ease: 'easeOut' }}
      aria-hidden={!isRevealed}
      {...inertProp}
      className={`relative rounded-lg border ${border} ${bg} backdrop-blur-sm ${
        emphasized ? 'p-5 md:p-7' : 'p-4 md:p-5'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon
          className={`${emphasized ? 'h-5 w-5' : 'h-4 w-4'} ${
            isActive || failedWrap ? 'text-primary' : 'text-muted-foreground/80'
          }`}
          aria-hidden
        />
        <div
          className={`font-bold tracking-tight ${
            emphasized ? 'text-[17px] md:text-[18px]' : 'text-[15px]'
          } ${isActive || failedWrap ? 'text-primary' : 'text-foreground'}`}
        >
          {meta.name}
        </div>
        <div className="text-[12px] text-muted-foreground leading-snug ml-2">
          {meta.plain}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// Pretty hex display — truncated by default (head + … + tail) with a
// click-to-expand affordance. v1 audit C10 — full hex inline reads as a
// debug terminal dump; Etherscan-style truncation is the industry pattern.
function HexBlock({
  hex,
  ariaLabel,
  prefix,
  alwaysExpanded = false,
  headChars = 16,
  tailChars = 12,
}: {
  hex: string;
  ariaLabel: string;
  prefix?: string;
  alwaysExpanded?: boolean;
  headChars?: number;
  tailChars?: number;
}) {
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const isLong = hex.length > headChars + tailChars + 3;
  const showExpanded = expanded || !isLong || alwaysExpanded;

  // Group expanded view into 4-char chunks separated by thin spaces.
  // Memoize so we don't re-split on every render (v1 audit D25).
  const chunked = useMemo(() => {
    if (!showExpanded) return '';
    const chunks: string[] = [];
    for (let i = 0; i < hex.length; i += 4) chunks.push(hex.slice(i, i + 4));
    return chunks.join(' ');
  }, [hex, showExpanded]);

  const collapsed = `${hex.slice(0, headChars)} … ${hex.slice(-tailChars)}`;

  return (
    <div
      className="font-mono text-[11px] md:text-[12px] text-foreground/90 break-all leading-relaxed flex items-baseline gap-1.5"
      role="group"
      aria-label={`${ariaLabel} (${hex.length / 2} bytes)`}
    >
      {prefix && <span className="text-muted-foreground/80">{prefix}</span>}
      <span className={showExpanded ? '' : 'tracking-wide'}>
        {showExpanded ? chunked : collapsed}
      </span>
      {isLong && !alwaysExpanded && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 ml-1 inline-flex items-center gap-0.5 rounded border border-border/40 hover:border-border bg-background/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors"
          aria-label={expanded ? `Collapse ${ariaLabel}` : `Expand ${ariaLabel} (${hex.length} hex chars)`}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronDown className="h-2.5 w-2.5" aria-hidden /> less
            </>
          ) : (
            <>
              <ChevronRight className="h-2.5 w-2.5" aria-hidden /> full
            </>
          )}
        </button>
      )}
    </div>
  );
}

function VerificationRow({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded border bg-background/40 border-border/40">
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" aria-hidden />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-primary" aria-hidden />
        )}
        <span className="text-[12px] text-foreground/90">{label}</span>
      </div>
      <span
        className={`font-mono text-[10px] uppercase tracking-widest ${
          passed ? 'text-accent' : 'text-primary'
        }`}
      >
        {passed ? 'verifies ✓' : 'fails ✗'}
      </span>
    </div>
  );
}

function JourneyPanel({ record }: { record: EventRecord }) {
  const lat = record.latency;
  const saved = Math.min(99.9, lat.saved_pct);
  const isEstimate = lat.is_estimate;
  return (
    <div className="signal-panel-strong p-5 md:p-7 mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.6fr] gap-4 md:gap-6 items-baseline">
      <div>
        {/* v1 audit C15: sub-labels bumped from text-[9px] muted/70 to
            text-[11px] muted/90 for AA contrast. */}
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/90 mb-1.5">
          per-event audit cost
        </div>
        <div className="font-mono text-2xl md:text-3xl text-foreground font-bold leading-tight">
          ~{lat.actual_total_ms}ms
          {isEstimate && (
            <span
              className="ml-1.5 align-middle text-[10px] font-mono text-muted-foreground/80 normal-case tracking-normal"
              title="Estimate from per-phase rust costs, not a benchmark"
            >
              (est.)
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5">
          SHA3-256 hash + Ed25519 sign + Merkle proof ({lat.breakdown?.merkle_steps ?? '?'} levels)
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/90 mb-1.5">
          centralized audit DB
        </div>
        <div
          className="font-mono text-xl md:text-2xl text-muted-foreground/80 line-through font-bold leading-tight"
          aria-label={`A centralized audit-log write to a replicated database would cost approximately ${lat.naive_total_ms} milliseconds, shown as crossed-out comparison`}
        >
          ~{lat.naive_total_ms}ms
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5">
          network + replicated DB write — and you have to trust the operator
        </div>
      </div>
      <div className="md:border-l md:border-border/30 md:pl-6">
        <div className="text-[11px] uppercase tracking-widest text-primary/95 mb-1.5">
          saved
        </div>
        <div className="font-mono text-5xl md:text-6xl text-primary font-bold leading-none tracking-tight">
          {saved.toFixed(1)}%
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">
          and verifiable in any language with crypto primitives
        </div>
      </div>
    </div>
  );
}

function AftermathPanel({
  record,
  visible,
  reducedMotion,
}: {
  record: EventRecord;
  visible: boolean;
  reducedMotion: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mt-6 md:mt-8 signal-panel-strong p-5 md:p-7"
        >
          <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            What happens with this event
          </div>
          {record.aftermath && (
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
              {record.aftermath}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- Main component ----

export function ProvenanceChain({ data }: { data: SceneData }) {
  // v1 audit C1: hydration-safe motion preference. The server renders
  // with `reducedMotion=true` (motion off) and the client matches on
  // first paint. Only AFTER mount do we read the real preference. This
  // prevents React's hydration mismatch error where server emits
  // initial={false} but client emits initial={{opacity:0, y:8}}.
  const rawReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    setReducedMotion(rawReducedMotion ?? false);
  }, [rawReducedMotion]);

  const [activeIdx, setActiveIdx] = useState(() => pickEntryIndex(data.records));
  const [beatIdx, setBeatIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  // Start auto-play only AFTER hydration confirms motion preference
  // is not "reduced." If reduced, the user can opt in via the play
  // button. v1 audit C14 — also fire a one-shot SR announcement so
  // screen-reader users know the walkthrough is auto-playing.
  const [autoplayAnnouncement, setAutoplayAnnouncement] = useState('');
  useEffect(() => {
    if (rawReducedMotion === false) {
      setPlaying(true);
      setAutoplayAnnouncement(
        'Walkthrough auto-playing — pause or restart controls available.',
      );
    }
  }, [rawReducedMotion]);

  const noRecords = data.records.length === 0;
  const safeActiveIdx = noRecords
    ? 0
    : Math.min(Math.max(0, activeIdx), data.records.length - 1);
  const record: EventRecord | null = noRecords ? null : data.records[safeActiveIdx];
  const beats = useMemo(() => record?.beats || [], [record]);
  const activeBeat = beats[beatIdx];

  useEffect(() => {
    if (!playing || !activeBeat) return;
    const dwell = activeBeat.dwell_ms || 3000;
    const timer = setTimeout(() => {
      if (beatIdx < beats.length - 1) {
        setBeatIdx((b) => b + 1);
      } else if (!hasInteracted) {
        const nextIdx = (safeActiveIdx + 1) % data.records.length;
        setActiveIdx(nextIdx);
        setBeatIdx(0);
      } else {
        setPlaying(false);
      }
    }, dwell);
    return () => clearTimeout(timer);
  }, [
    playing,
    beatIdx,
    beats,
    activeBeat,
    safeActiveIdx,
    data.records.length,
    hasInteracted,
  ]);

  const selectRecord = useCallback((idx: number) => {
    setActiveIdx(idx);
    setBeatIdx(0);
    setHasInteracted(true);
    setPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
    setHasInteracted(true);
  }, []);

  const restart = useCallback(() => {
    setBeatIdx(0);
    setPlaying(true);
    setHasInteracted(true);
  }, []);

  // Roving-tabindex arrow-key handlers — inline factory matching the
  // pattern from CognitiveAgents.tsx on main.
  const handleArrowKeys = useCallback(
    (currentIdx: number, count: number, setter: (idx: number) => void) =>
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (count === 0) return;
        let next: number | null = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          next = (currentIdx + 1) % count;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          next = (currentIdx - 1 + count) % count;
        } else if (e.key === 'Home') {
          next = 0;
        } else if (e.key === 'End') {
          next = count - 1;
        }
        if (next !== null) {
          e.preventDefault();
          setter(next);
        }
      },
    [],
  );

  const handleScrubberKey = useMemo(
    () => handleArrowKeys(safeActiveIdx, data.records.length, selectRecord),
    [handleArrowKeys, safeActiveIdx, data.records.length, selectRecord],
  );

  const handleBeatKey = useMemo(
    () =>
      handleArrowKeys(beatIdx, beats.length, (idx) => {
        setBeatIdx(idx);
        setHasInteracted(true);
      }),
    [handleArrowKeys, beatIdx, beats.length],
  );

  // Which phases have been "revealed" so far in this record. The
  // verify beat reveals all earlier phases too (they're prerequisites).
  const revealedPhases = useMemo(() => {
    const set = new Set<PhaseId>();
    for (let i = 0; i <= beatIdx; i++) {
      const t = beats[i]?.target_phase as PhaseId | null | undefined;
      if (t) set.add(t);
    }
    if (set.has('verify')) {
      for (const p of PHASES) set.add(p);
    }
    return set;
  }, [beatIdx, beats]);

  const activePhaseId = (activeBeat?.target_phase ?? null) as PhaseId | null;
  const isIntroBeat = activeBeat?.target_phase === null;
  const verifyRevealed = revealedPhases.has('verify');

  // Deduped agent-reveal announcer.
  const lastPhaseRef = useRef<string>('');
  const [phaseAnnouncement, setPhaseAnnouncement] = useState('');
  useEffect(() => {
    const target = activeBeat?.target_phase;
    if (!target) return;
    if (lastPhaseRef.current === target) return;
    lastPhaseRef.current = target;
    const meta = PHASE_META[target as PhaseId];
    if (meta) {
      setPhaseAnnouncement(`${meta.name} phase revealed`);
    }
  }, [activeBeat]);

  // Reset on record switch.
  useEffect(() => {
    lastPhaseRef.current = '';
    setPhaseAnnouncement('');
  }, [safeActiveIdx]);

  if (noRecords || !record) {
    return (
      <div className="signal-panel-strong p-5 text-sm text-muted-foreground">
        No scenarios available.
      </div>
    );
  }

  const v = record.verification;

  return (
    <div className="relative" id="demo">
      {/* Persistent sr-only live regions — OUTSIDE AnimatePresence. */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {activeBeat?.copy ?? ''}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {phaseAnnouncement}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {autoplayAnnouncement}
      </span>

      {/* Trace header — Merkle root + event count, always visible. */}
      <motion.div
        key={`trace-${record.step_id}`}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="signal-panel-strong p-4 md:p-6 mb-6 md:mb-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Trace · {data.records.length} events · single chain
            </div>
            <div className="font-mono text-[10px] md:text-xs text-muted-foreground/80 break-all">
              {data.trace.trace_id}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-widest text-primary/80 mb-1">
              Merkle root
            </div>
            <div className="font-mono text-[10px] md:text-[11px] text-primary/90 break-all">
              {fmtHex(data.trace.merkle_root_hex, 12, 8)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Two-column layout: vertical timeline on left, phase cards on right.
          Mobile: timeline collapses to a horizontal scroller above the cards. */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Timeline (also doubles as the scenario scrubber). */}
        <div className="md:sticky md:top-4 md:self-start">
          <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Event timeline
          </div>
          <div
            role="radiogroup"
            aria-label="Event timeline"
            onKeyDown={handleScrubberKey}
            className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
          >
            {data.records.map((r, idx) => (
              <div key={r.step_id} className="min-w-[200px] md:min-w-0">
                <TimelineNode
                  rec={r}
                  isActive={idx === safeActiveIdx}
                  isPast={idx < safeActiveIdx}
                  onClick={() => selectRecord(idx)}
                  reducedMotion={reducedMotion}
                  tabIndex={idx === safeActiveIdx ? 0 : -1}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right side: current event + narration + phase cards. */}
        <div className="space-y-6 md:space-y-8">
          {/* Event content */}
          <motion.div
            key={`content-${record.step_id}`}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="signal-panel-strong p-5 md:p-7"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
              <div className="space-y-1">
                <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Event {record.step_index + 1} of {data.records.length}
                </div>
                <div className="font-mono text-[10px] md:text-xs text-muted-foreground/80">
                  {record.event.event_type} · {record.event.agent_id}
                </div>
              </div>
              {v.tampered && (
                <span className="rounded border border-primary/60 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden /> tampered
                </span>
              )}
            </div>
            <p className="text-base md:text-xl leading-relaxed font-serif italic text-foreground break-words">
              &ldquo;{record.payload_preview}&rdquo;
            </p>
            {record.summary && (
              <p className="mt-4 text-xs md:text-sm text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-3 md:pl-4">
                {record.summary}
              </p>
            )}
          </motion.div>

          {/* Narration */}
          <div className="signal-panel-strong p-5 md:p-7 min-h-[180px] md:min-h-[160px] relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Walkthrough · beat {beatIdx + 1} of {beats.length}
                {isIntroBeat && (
                  <span className="ml-2 text-primary/80 font-mono normal-case tracking-normal">
                    intro
                  </span>
                )}
                {!isIntroBeat && activePhaseId && (
                  <span className="ml-2 text-primary/80 font-mono normal-case tracking-normal">
                    → {activePhaseId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="rounded border border-border/50 hover:border-border bg-background/60 p-2 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
                >
                  {playing ? (
                    <Pause className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Play className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
                <button
                  onClick={restart}
                  className="rounded border border-border/50 hover:border-border bg-background/60 p-2 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label="Restart walkthrough"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="text-base md:text-lg leading-relaxed text-foreground/95 font-serif min-h-[5rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${record.step_id}-${beatIdx}`}
                  initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <Typewriter
                    text={activeBeat?.copy ?? ''}
                    reducedMotion={reducedMotion}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <div
              className="mt-4 flex gap-0.5 flex-wrap"
              role="radiogroup"
              aria-label="Beat selector"
              onKeyDown={handleBeatKey}
            >
              {beats.map((_, i) => (
                <button
                  key={`${record.step_id}-${i}`}
                  onClick={() => {
                    setBeatIdx(i);
                    setHasInteracted(true);
                  }}
                  className="group inline-flex items-center justify-center h-6 w-8 md:w-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
                  role="radio"
                  aria-checked={i === beatIdx}
                  aria-label={`Jump to beat ${i + 1} of ${beats.length}`}
                  tabIndex={i === beatIdx ? 0 : -1}
                >
                  <span
                    className={`h-1 w-full rounded-full transition-all ${
                      i === beatIdx
                        ? 'bg-primary'
                        : i < beatIdx
                        ? 'bg-accent/60 group-hover:bg-accent'
                        : 'bg-border/40 group-hover:bg-border'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Phase grid — 6 cards. Verify card spans full-width when
              revealed (progressive focus, v1 audit C11). */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {/* Event phase */}
            <PhaseCard
              phaseId="event"
              isActive={activePhaseId === 'event'}
              isRevealed={revealedPhases.has('event')}
              reducedMotion={reducedMotion}
            >
              <div className="space-y-1.5 text-[11px] md:text-xs font-mono">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground/90">agent_id</span>
                  <span className="text-foreground/90 truncate">
                    {record.event.agent_id}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground/90">event_type</span>
                  <span className="text-foreground/90">{record.event.event_type}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground/90">timestamp_ms</span>
                  <span className="text-foreground/90">{record.event.timestamp_ms}</span>
                </div>
                <div className="pt-1.5">
                  <div className="text-muted-foreground/80 text-[10px] uppercase tracking-widest mb-1">
                    payload_hash (SHA3-256)
                  </div>
                  <HexBlock
                    hex={record.event.payload_hash_hex}
                    ariaLabel="payload hash"
                  />
                </div>
                {Object.keys(record.event.metadata).length > 0 && (
                  <div className="pt-1.5">
                    <div className="text-muted-foreground/80 text-[10px] uppercase tracking-widest mb-1">
                      metadata
                    </div>
                    {Object.entries(record.event.metadata).map(([k, val]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-muted-foreground/90">{k}</span>
                        <span
                          className={`truncate ${
                            v.tampered ? 'text-primary' : 'text-foreground/90'
                          }`}
                        >
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PhaseCard>

            {/* Canonical bytes */}
            <PhaseCard
              phaseId="canonical"
              isActive={activePhaseId === 'canonical'}
              isRevealed={revealedPhases.has('canonical')}
              reducedMotion={reducedMotion}
            >
              <div className="space-y-1.5 text-[11px] md:text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground/90">total length</span>
                  <span className="text-foreground/90">
                    {record.crypto.canonical_bytes_len} bytes
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground/90">domain tag</span>
                  <span className="text-foreground/90">PROV_EVENT_V1</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground/90">schema version</span>
                  <span className="text-foreground/90">1</span>
                </div>
                <div className="pt-1.5">
                  <div className="text-muted-foreground/80 text-[10px] uppercase tracking-widest mb-1 font-mono">
                    first 32 bytes (hex)
                  </div>
                  <HexBlock
                    hex={record.crypto.canonical_bytes_preview_hex}
                    ariaLabel="canonical bytes preview"
                  />
                </div>
              </div>
            </PhaseCard>

            {/* Sign */}
            <PhaseCard
              phaseId="sign"
              isActive={activePhaseId === 'sign'}
              isRevealed={revealedPhases.has('sign')}
              reducedMotion={reducedMotion}
            >
              <div className="space-y-2 text-[11px] md:text-xs">
                <div>
                  <div className="text-muted-foreground/80 text-[10px] uppercase tracking-widest mb-1 font-mono">
                    SHA3-256 hash (32 bytes)
                  </div>
                  <HexBlock
                    hex={record.crypto.leaf_hash_hex}
                    ariaLabel="event leaf hash"
                  />
                </div>
                <div>
                  <div className="text-muted-foreground/80 text-[10px] uppercase tracking-widest mb-1 font-mono">
                    Ed25519 signature (64 bytes)
                  </div>
                  <HexBlock
                    hex={record.crypto.signature_hex}
                    ariaLabel="ed25519 signature"
                  />
                </div>
                <div>
                  <div className="text-muted-foreground/80 text-[10px] uppercase tracking-widest mb-1 font-mono">
                    public key (32 bytes)
                  </div>
                  <HexBlock
                    hex={record.crypto.public_key_hex}
                    ariaLabel="public key"
                  />
                </div>
              </div>
            </PhaseCard>

            {/* Chain */}
            <PhaseCard
              phaseId="chain"
              isActive={activePhaseId === 'chain'}
              isRevealed={revealedPhases.has('chain')}
              reducedMotion={reducedMotion}
            >
              <div className="space-y-2 text-[11px] md:text-xs">
                {record.event.prev_event_hash_hex ? (
                  <>
                    <div className="text-foreground/85">
                      Links to event {record.step_index} via prev_event_hash:
                    </div>
                    <HexBlock
                      hex={record.event.prev_event_hash_hex}
                      ariaLabel="previous event hash"
                      prefix="prev → "
                    />
                  </>
                ) : (
                  <div className="text-foreground/85 flex items-center gap-2">
                    <CornerDownRight className="h-3.5 w-3.5 text-accent" aria-hidden />
                    Genesis event — prev_event_hash is null. This is where the trace starts.
                  </div>
                )}
              </div>
            </PhaseCard>

            {/* Merkle */}
            <PhaseCard
               phaseId="merkle"
              isActive={activePhaseId === 'merkle'}
              isRevealed={revealedPhases.has('merkle')}
              reducedMotion={reducedMotion}
            >
              <div className="space-y-2 text-[11px] md:text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground/90">leaf index</span>
                  <span className="text-foreground/90">
                    {record.crypto.merkle_proof.leaf_index}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground/90">sibling count</span>
                  <span className="text-foreground/90">
                    {record.crypto.merkle_proof.sibling_count}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-muted-foreground/90">proof size</span>
                  <span className="text-foreground/90">
                    ~{record.crypto.merkle_proof.sibling_count * 32} bytes
                  </span>
                </div>
                <div className="pt-1.5">
                  <div className="text-muted-foreground/80 text-[10px] uppercase tracking-widest mb-1 font-mono">
                    sibling hashes (path to root)
                  </div>
                  <div className="space-y-1">
                    {record.crypto.merkle_proof.siblings_hex.map((s, i) => (
                      <HexBlock
                        key={i}
                        hex={s}
                        ariaLabel={`merkle sibling ${i + 1}`}
                        prefix={`sib ${i + 1} → `}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </PhaseCard>

            {/* Verify — full-width, emphasized. The payoff of the
                phase grid, treated as a verdict not card #6. Ember wash
                when any check fails (v1 audit C11, C12). */}
            <div className="md:col-span-2">
              <PhaseCard
                phaseId="verify"
                isActive={activePhaseId === 'verify'}
                isRevealed={revealedPhases.has('verify')}
                reducedMotion={reducedMotion}
                emphasized
                failedWrap={!v.all_pass && revealedPhases.has('verify')}
              >
                <div className="space-y-2 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
                  <VerificationRow label="Ed25519 signature" passed={v.sig_verifies} />
                  <VerificationRow label="Chain link (prev_event_hash)" passed={v.chain_verifies} />
                  <VerificationRow label="Merkle proof against root" passed={v.merkle_verifies} />
                </div>
                <div
                  className={`mt-3 rounded border p-3 md:p-4 text-[12px] md:text-[13px] leading-relaxed ${
                    v.all_pass
                      ? 'border-accent/40 bg-accent/10 text-accent/95'
                      : 'border-primary/60 bg-primary/10 text-primary'
                  }`}
                >
                  {v.all_pass
                    ? 'All three checks pass. The event is independently verifiable — anyone with the public key and the chain root can confirm it, without contacting the system that produced it.'
                    : 'The signature check fails: this event was signed over different bytes than the ones now sitting in the chain. The chain link and Merkle proof still verify because they prove this event sits at this position — but the signature is what catches content tamper, and one failure is enough.'}
                </div>
              </PhaseCard>
            </div>
          </div>
        </div>
      </div>

      <AftermathPanel
        key={`aftermath-${record.step_id}`}
        record={record}
        visible={verifyRevealed}
        reducedMotion={reducedMotion}
      />

      <div className="mt-8 md:mt-10">
        <JourneyPanel record={record} />
      </div>
    </div>
  );
}
