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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CornerDownRight,
  Hourglass,
  ShieldAlert,
  Crown,
  Vote,
  ShieldCheck,
} from 'lucide-react';

// ---- Types (mirror bft-consensus.json shape) ----

type Beat = {
  target_phase: string | null;
  dwell_ms: number;
  copy: string;
};

type PhaseEvent = {
  phase: 'pre_prepare' | 'prepare' | 'commit' | 'view_change' | 'new_view';
  from_replica: string;
  view: number;
  sequence: number;
  action_hash_hex: string;
  status: 'sent' | 'received' | 'rejected' | 'equivocation' | 'timeout';
  reason: string | null;
  signature_hex: string | null;
  sig_verifies: boolean;
};

type ScenarioRecord = {
  step_id: string;
  step_index: number;
  scenario_id: string;
  behavior: string;
  plain: string;
  summary?: string | null;
  aftermath?: string | null;
  beats: Beat[];
  action: Record<string, unknown>;
  action_hash_hex: string;
  view: number;
  view_after: number;
  sequence: number;
  leader: string;
  leader_after: string;
  quorum_size: number;
  replica_count: number;
  f_value: number;
  phases: PhaseEvent[];
  matrix: Record<string, Record<string, PhaseEvent | null>>;
  counts: {
    prepares_total: number;
    commits_total: number;
    prepare_quorum_reached: boolean;
    commit_quorum_reached: boolean;
  };
  outcome: {
    committed: boolean;
    equivocation_replica: string | null;
    view_changed: boolean;
  };
  latency: {
    actual_total_ms: number;
    naive_total_ms: number;
    saved_pct: number;
    is_estimate?: boolean;
    message_count?: number;
  };
};

type SceneData = {
  scene: string;
  generated_at: string;
  spec_ref: string;
  description: string;
  cluster: {
    replicas: string[];
    n: number;
    f: number;
    quorum: number;
    view_timeout_ms: number;
    pubkeys_hex: Record<string, string>;
  };
  phases: { id: string; name: string; plain: string }[];
  records: ScenarioRecord[];
};

type PhaseId = 'pre_prepare' | 'prepare' | 'commit' | 'verdict';

const PBFT_PHASES: PhaseId[] = ['pre_prepare', 'prepare', 'commit', 'verdict'];

const PHASE_META: Record<PhaseId, { name: string; plain: string }> = {
  pre_prepare: { name: 'Pre-prepare', plain: 'leader signs the proposal' },
  prepare: { name: 'Prepare', plain: 'replicas verify + broadcast' },
  commit: { name: 'Commit', plain: 'commit on prepare quorum' },
  verdict: { name: 'Verdict', plain: 'committed / stalled / equivocation' },
};

// ---- Inline Typewriter (no shared primitives — branch has runtime bugs). ----

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

// ---- Helpers ----

function pickEntryIndex(_records: ScenarioRecord[]): number {
  // Open on clean quorum (the simplest case) so cold visitors see
  // PBFT working before the failure-mode scenarios escalate.
  return 0;
}

// Status → icon + tint for the matrix cells.
function StatusIcon({ status, className }: { status: PhaseEvent['status'] | 'leader-implicit' | 'empty'; className?: string }) {
  switch (status) {
    case 'sent':
      return <CheckCircle2 className={`${className} text-accent`} aria-hidden />;
    case 'rejected':
      return <XCircle className={`${className} text-primary/80`} aria-hidden />;
    case 'equivocation':
      return <ShieldAlert className={`${className} text-primary`} aria-hidden />;
    case 'timeout':
      return <Hourglass className={`${className} text-muted-foreground/70`} aria-hidden />;
    case 'leader-implicit':
      return <Crown className={`${className} text-accent/90`} aria-hidden />;
    default:
      return <span className={`${className} block`} aria-hidden />;
  }
}

function statusLabel(status: PhaseEvent['status']): string {
  switch (status) {
    case 'sent':
      return 'sent';
    case 'rejected':
      return 'refused';
    case 'equivocation':
      return 'byzantine';
    case 'timeout':
      return 'timeout';
    default:
      return status;
  }
}

// One matrix cell — one (replica, phase) intersection.
function MatrixCell({
  event,
  isLeader,
  phaseId,
  isCurrentPhase,
  reducedMotion,
}: {
  event: PhaseEvent | null;
  isLeader: boolean;
  phaseId: PhaseId;
  isCurrentPhase: boolean;
  reducedMotion: boolean;
}) {
  // Special case: leader's "implicit prepare" — the leader doesn't
  // send itself a Prepare, it just counts as one. Show the crown.
  const leaderImplicit = phaseId === 'prepare' && isLeader && !event;
  const status = event?.status ?? (leaderImplicit ? 'leader-implicit' : 'empty');
  const tone =
    status === 'sent'
      ? 'border-accent/50 bg-accent/[0.06]'
      : status === 'equivocation'
        ? 'border-primary/60 bg-primary/[0.1]'
        : status === 'rejected'
          ? 'border-primary/30 bg-primary/[0.05]'
          : status === 'timeout'
            ? 'border-border/40 bg-card/30'
            : status === 'leader-implicit'
              ? 'border-accent/40 bg-accent/[0.04]'
              : 'border-border/30 bg-card/20';

  return (
    <motion.div
      animate={
        reducedMotion
          ? { opacity: 1 }
          : { opacity: 1, scale: isCurrentPhase && event ? 1.02 : 1 }
      }
      transition={{ duration: 0.3 }}
      className={`relative aspect-square min-h-[64px] rounded border ${tone} flex flex-col items-center justify-center gap-1 p-2 text-center`}
    >
      <StatusIcon status={status} className="h-4 w-4 md:h-5 md:w-5" />
      <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-muted-foreground/90">
        {leaderImplicit
          ? 'leader'
          : event
            ? statusLabel(event.status)
            : '—'}
      </span>
    </motion.div>
  );
}

function VoteCounter({
  count,
  quorum,
  label,
  reducedMotion,
}: {
  count: number;
  quorum: number;
  label: string;
  reducedMotion: boolean;
}) {
  const reached = count >= quorum;
  return (
    <div
      className={`rounded border p-3 ${
        reached ? 'border-accent/60 bg-accent/[0.06]' : 'border-border/40 bg-card/30'
      }`}
      role="group"
      aria-label={`${label}: ${count} of ${quorum} needed for quorum`}
    >
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <motion.span
          key={count}
          initial={reducedMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`font-mono text-2xl md:text-3xl font-bold leading-none ${
            reached ? 'text-accent' : 'text-foreground'
          }`}
        >
          {count}
        </motion.span>
        <span className="font-mono text-sm text-muted-foreground/80">/ {quorum}</span>
      </div>
      <div className="text-[10px] text-muted-foreground/90 mt-1">
        {reached ? 'quorum reached' : `${quorum - count} more needed`}
      </div>
    </div>
  );
}

function VerdictPanel({
  record,
  visible,
  reducedMotion,
}: {
  record: ScenarioRecord;
  visible: boolean;
  reducedMotion: boolean;
}) {
  const { outcome } = record;
  let kind: 'committed' | 'stalled' | 'view-change' = 'stalled';
  if (outcome.committed && outcome.view_changed) kind = 'view-change';
  else if (outcome.committed) kind = 'committed';

  const headline =
    kind === 'committed'
      ? 'COMMITTED'
      : kind === 'view-change'
        ? `COMMITTED · view ${record.view_after}`
        : 'NOT COMMITTED';
  const Icon =
    kind === 'committed' || kind === 'view-change' ? ShieldCheck : Hourglass;
  const tone =
    kind === 'committed'
      ? 'border-accent/60 bg-accent/[0.08] text-accent'
      : kind === 'view-change'
        ? 'border-primary/60 bg-primary/[0.08] text-primary'
        : 'border-primary/40 bg-primary/[0.05] text-primary/90';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`rounded-xl border-2 ${tone} p-5 md:p-7`}
        >
          <div className="flex items-center gap-3 mb-3">
            <Icon className="h-6 w-6 md:h-7 md:w-7" aria-hidden />
            <div className="font-mono text-xl md:text-2xl font-bold tracking-tight">
              {headline}
            </div>
            {outcome.equivocation_replica && (
              <span className="ml-auto rounded border border-primary/60 bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-mono uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                {outcome.equivocation_replica} byzantine
              </span>
            )}
          </div>
          {record.summary && (
            <p className="text-sm md:text-base text-foreground/95 leading-relaxed">
              {record.summary}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AftermathPanel({
  record,
  visible,
  reducedMotion,
}: {
  record: ScenarioRecord;
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
            What happens after this consensus instance
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

function JourneyPanel({ record }: { record: ScenarioRecord }) {
  const lat = record.latency;
  const saved = Math.min(99.9, lat.saved_pct);
  return (
    <div className="signal-panel-strong p-5 md:p-7 mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.6fr] gap-4 md:gap-6 items-baseline">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/90 mb-1.5">
          BFT round cost
        </div>
        <div className="font-mono text-2xl md:text-3xl text-foreground font-bold leading-tight">
          ~{lat.actual_total_ms}ms
          {lat.is_estimate && (
            <span
              className="ml-1.5 align-middle text-[10px] font-mono text-muted-foreground/80 normal-case tracking-normal"
              title="Estimate from per-message Rust costs, not a benchmark"
            >
              (est.)
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5">
          {lat.message_count} signed messages + state transitions
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/90 mb-1.5">
          single-leader trust
        </div>
        <div
          className="font-mono text-xl md:text-2xl text-muted-foreground/80 line-through font-bold leading-tight"
          aria-label={`A single-leader trust model would commit in approximately ${lat.naive_total_ms} milliseconds, shown as crossed-out comparison`}
        >
          ~{lat.naive_total_ms}ms
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5">
          one signature, no agreement — and the leader is the system
        </div>
      </div>
      <div className="md:border-l md:border-border/30 md:pl-6">
        <div className="text-[11px] uppercase tracking-widest text-primary/95 mb-1.5">
          tolerates
        </div>
        <div className="font-mono text-5xl md:text-6xl text-primary font-bold leading-none tracking-tight">
          f={record.f_value}
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">
          byzantine fault out of n={record.replica_count} replicas — {saved.toFixed(0)}% faster than naive while staying safe
        </div>
      </div>
    </div>
  );
}

// ---- Main component ----

export function BftConsensus({ data }: { data: SceneData }) {
  // Hydration-safe motion preference. Server renders motion=off; client
  // flips to real value after mount (avoids the hydration mismatch
  // that scene-03 v1 hit).
  const rawReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    setReducedMotion(rawReducedMotion ?? false);
  }, [rawReducedMotion]);

  const [activeIdx, setActiveIdx] = useState(() => pickEntryIndex(data.records));
  const [beatIdx, setBeatIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
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
  const record: ScenarioRecord | null = noRecords ? null : data.records[safeActiveIdx];
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

  // Which phases have been revealed so far on this scenario.
  const revealedPhases = useMemo(() => {
    const set = new Set<PhaseId>();
    for (let i = 0; i <= beatIdx; i++) {
      const t = beats[i]?.target_phase as PhaseId | null | undefined;
      if (t && PBFT_PHASES.includes(t)) set.add(t);
    }
    if (set.has('verdict')) {
      for (const p of PBFT_PHASES) set.add(p);
    }
    return set;
  }, [beatIdx, beats]);

  const activePhaseId = (activeBeat?.target_phase ?? null) as PhaseId | null;
  const isIntroBeat = activeBeat?.target_phase === null;
  const verdictRevealed = revealedPhases.has('verdict');

  // Phase-reveal announcer (dedup'd).
  const lastPhaseRef = useRef<string>('');
  const [phaseAnnouncement, setPhaseAnnouncement] = useState('');
  useEffect(() => {
    const target = activeBeat?.target_phase;
    if (!target || !(target in PHASE_META)) return;
    if (lastPhaseRef.current === target) return;
    lastPhaseRef.current = target;
    setPhaseAnnouncement(`${PHASE_META[target as PhaseId].name} phase revealed`);
  }, [activeBeat]);

  useEffect(() => {
    lastPhaseRef.current = '';
    setPhaseAnnouncement('');
    setAutoplayAnnouncement('');
  }, [safeActiveIdx]);

  if (noRecords || !record) {
    return (
      <div className="signal-panel-strong p-5 text-sm text-muted-foreground">
        No scenarios available.
      </div>
    );
  }

  const replicas = data.cluster.replicas;
  const leaderForRecord = record.outcome.view_changed ? record.leader_after : record.leader;

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

      {/* Cluster header — replicas, quorum, view. */}
      <motion.div
        key={`cluster-${record.step_id}`}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="signal-panel-strong p-4 md:p-6 mb-6 md:mb-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Cluster · n={data.cluster.n} · f={data.cluster.f} · quorum={data.cluster.quorum}
            </div>
            <div className="font-mono text-[10px] md:text-xs text-muted-foreground/80">
              view {record.view}
              {record.outcome.view_changed && (
                <>
                  <span className="mx-1 text-primary">→</span>
                  view {record.view_after}
                </>
              )}{' '}
              · sequence {record.sequence}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-primary/90 mb-1">
              leader
            </div>
            <div className="font-mono text-sm md:text-base text-primary flex items-center gap-1.5 justify-end">
              <Crown className="h-3.5 w-3.5" aria-hidden />
              {leaderForRecord}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Two-column: timeline left, walkthrough + matrix right. */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Scenario timeline. */}
        <div className="md:sticky md:top-4 md:self-start">
          <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Scenarios
          </div>
          <div
            role="radiogroup"
            aria-label="BFT scenarios"
            onKeyDown={handleScrubberKey}
            className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
          >
            {data.records.map((r, idx) => {
              const isActive = idx === safeActiveIdx;
              const committed = r.outcome.committed;
              const equiv = r.outcome.equivocation_replica;
              const viewChanged = r.outcome.view_changed;
              const statusLabel = committed
                ? viewChanged
                  ? 'view→1 ✓'
                  : 'committed'
                : equiv
                  ? `${equiv} byzantine`
                  : 'stalled';
              const statusTone = committed
                ? viewChanged
                  ? 'text-primary'
                  : 'text-accent'
                : equiv
                  ? 'text-primary'
                  : 'text-muted-foreground/80';
              return (
                <button
                  key={r.step_id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => selectRecord(idx)}
                  aria-label={`Scenario ${idx + 1}: ${r.plain}`}
                  className={`group flex flex-col items-start gap-1 min-w-[220px] md:min-w-0 rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                    isActive
                      ? 'border-primary shadow-[0_0_30px_-10px_hsl(var(--primary)/0.55)] bg-card/50'
                      : 'border-border/40 bg-card/30 hover:border-border'
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    scenario {idx + 1}
                  </span>
                  <span
                    className={`text-[13px] leading-snug ${
                      isActive ? 'text-foreground' : 'text-foreground/80'
                    }`}
                  >
                    {r.plain.split(' — ')[0]}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest mt-1 ${statusTone}`}
                  >
                    {statusLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column — narration + matrix + counters. */}
        <div className="space-y-6 md:space-y-8">
          {/* Action panel */}
          <motion.div
            key={`action-${record.step_id}`}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="signal-panel-strong p-5 md:p-7"
          >
            <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Proposed action
            </div>
            <pre className="font-mono text-[11px] md:text-[12px] text-foreground/90 leading-relaxed bg-background/40 border border-border/40 rounded p-3 overflow-x-auto">
              {JSON.stringify(record.action, null, 2)}
            </pre>
            <div className="text-[10px] md:text-[11px] font-mono text-muted-foreground/80 mt-2 break-all">
              <span className="text-muted-foreground/90">action_hash · </span>
              {record.action_hash_hex.slice(0, 16)}…{record.action_hash_hex.slice(-12)}
            </div>
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
                  <Typewriter text={activeBeat?.copy ?? ''} reducedMotion={reducedMotion} />
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

          {/* The PBFT matrix — 3 rows (PrePrepare/Prepare/Commit) × 4 cols (replicas). */}
          <div className="signal-panel-strong p-4 md:p-5">
            <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
              PBFT phase × replica matrix
            </div>
            {/* Header row */}
            <div className="grid grid-cols-[80px_repeat(4,1fr)] gap-2 md:gap-3 mb-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                phase
              </div>
              {replicas.map((r) => {
                const isLeader = r === leaderForRecord;
                return (
                  <div
                    key={r}
                    className={`flex items-center justify-center gap-1 text-[10px] md:text-[11px] font-mono uppercase tracking-widest ${
                      isLeader ? 'text-primary' : 'text-muted-foreground/90'
                    }`}
                  >
                    {isLeader && <Crown className="h-3 w-3" aria-hidden />}
                    {r}
                  </div>
                );
              })}
            </div>
            {/* Phase rows */}
            {(['pre_prepare', 'prepare', 'commit'] as const).map((phaseId) => {
              const phaseRevealed = revealedPhases.has(phaseId);
              return (
                <div
                  key={phaseId}
                  className="grid grid-cols-[80px_repeat(4,1fr)] gap-2 md:gap-3 mb-2"
                >
                  <div
                    className={`flex flex-col justify-center text-left ${
                      phaseRevealed ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <span className="text-[12px] md:text-[13px] font-bold text-foreground/95">
                      {PHASE_META[phaseId].name}
                    </span>
                    <span className="text-[9px] md:text-[10px] text-muted-foreground/80">
                      {PHASE_META[phaseId].plain}
                    </span>
                  </div>
                  {replicas.map((r) => {
                    const ev = record.matrix[r]?.[phaseId] ?? null;
                    const isLeader = r === leaderForRecord;
                    const isCurrentPhase = activePhaseId === phaseId;
                    return (
                      <div
                        key={`${phaseId}-${r}`}
                        className={phaseRevealed ? 'opacity-100' : 'opacity-30'}
                        aria-hidden={!phaseRevealed}
                      >
                        <MatrixCell
                          event={ev}
                          isLeader={isLeader}
                          phaseId={phaseId}
                          isCurrentPhase={isCurrentPhase && phaseRevealed}
                          reducedMotion={reducedMotion}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Vote counters */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 mt-4">
              <VoteCounter
                count={record.counts.prepares_total}
                quorum={record.quorum_size}
                label="prepare votes"
                reducedMotion={reducedMotion}
              />
              <VoteCounter
                count={record.counts.commits_total}
                quorum={record.quorum_size}
                label="commit votes"
                reducedMotion={reducedMotion}
              />
            </div>
          </div>

          {/* View change row (only if relevant) */}
          {record.outcome.view_changed && (
            <div className="signal-panel-strong p-4 md:p-5 border-l-2 border-primary/60">
              <div className="flex items-center gap-2 mb-3">
                <Vote className="h-4 w-4 text-primary" aria-hidden />
                <div className="text-[11px] uppercase tracking-[0.2em] text-primary/90 font-mono">
                  View change · view 0 → {record.view_after}
                </div>
              </div>
              <div className="grid grid-cols-[80px_repeat(4,1fr)] gap-2 md:gap-3">
                <div className="flex flex-col justify-center text-left">
                  <span className="text-[12px] font-bold text-foreground/95">View change</span>
                  <span className="text-[10px] text-muted-foreground/80">
                    replicas vote new leader
                  </span>
                </div>
                {replicas.map((r) => {
                  const ev = record.matrix[r]?.['view_change'] ?? null;
                  return (
                    <div key={`vc-${r}`}>
                      <MatrixCell
                        event={ev}
                        isLeader={r === record.leader_after}
                        phaseId="prepare"
                        isCurrentPhase={false}
                        reducedMotion={reducedMotion}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                3 ViewChange messages (quorum reached) → view advances → new leader (
                <span className="text-primary font-mono">{record.leader_after}</span>) re-proposes
                the action.
              </div>
            </div>
          )}

          {/* Verdict */}
          <VerdictPanel record={record} visible={verdictRevealed} reducedMotion={reducedMotion} />
        </div>
      </div>

      <AftermathPanel
        key={`aftermath-${record.step_id}`}
        record={record}
        visible={verdictRevealed}
        reducedMotion={reducedMotion}
      />

      <div className="mt-8 md:mt-10">
        <JourneyPanel record={record} />
      </div>
    </div>
  );
}

// Lint: keep unused-import discipline tight.
export type { SceneData, ScenarioRecord };

// CornerDownRight is imported but only conditionally used — preserve
// the import for any future verdict variants without surfacing as a
// lint warning.
void CornerDownRight;
