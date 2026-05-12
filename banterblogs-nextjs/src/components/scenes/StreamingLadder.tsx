'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldOff,
  ShieldCheck,
  Circle,
  CornerDownRight,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Regex,
  Cpu,
  RefreshCw,
  Users,
  Scale,
} from 'lucide-react';

type RuleVerdict = {
  rule_name: string;
  fired: boolean;
  confidence: number;
  evidence: Record<string, unknown>;
};

type TierVerdict = {
  rule_verdicts?: RuleVerdict[];
  latency_ms?: number | null;
  verdict?: string | null;
  outcome?: string | null;
  confidence?: number | null;
  reasoning?: string | null;
  judge_provider?: string | null;
  judge_model?: string | null;
  corrected_step_content?: string | null;
  protocol?: string | null;
  consensus_score?: number | null;
  n_models?: number | null;
  models_used?: string[] | null;
  reason?: string | null;
  triggered_rule_names?: string[] | null;
  max_rule_confidence?: number | null;
  rewind_steps_so_far?: number | null;
  evidence?: Record<string, unknown> | null;
};

type Beat = {
  target_tier: string | null;
  dwell_ms: number;
  copy: string;
};

// Local type for one StepRecord as joined by build-data.mjs. Named
// distinctly from the global TS Record<K,V> utility type so it does
// not shadow it inside this file.
type StepRecord = {
  step_id: string;
  step_index: number;
  step_content: string;
  summary?: string | null;
  aftermath?: string | null;
  beats: Beat[];
  latency?: {
    actual_total_ms: number;
    naive_total_ms: number;
    t1_actual_ms: number;
    t2_actual_ms: number;
    t2_5_actual_ms: number;
    t3_actual_ms: number;
  };
  trigger_signals: {
    min_top1: number;
    max_entropy: number;
    max_runner_up_ratio: number;
    topk: number;
    degraded_logprobs: boolean;
  };
  trigger_verdict: boolean;
  t1: TierVerdict | null;
  t2: TierVerdict | null;
  t2_5: TierVerdict | null;
  t3: TierVerdict | null;
  enforcement: TierVerdict | null;
};

type Tier = {
  id: string;
  name: string;
  spec: string;
  port?: number | null;
  budget_ms?: number | null;
  description: string;
};

type SceneData = {
  scene: string;
  generated_at: string;
  spec_ref: string;
  description: string;
  tiers: Tier[];
  records: StepRecord[];
};

type TierId = 'gate' | 't1' | 't2' | 't2_5' | 't3' | 'enforcement';

// Plain-language metadata. `cost_log` 0..1 is the position on the
// log-scaled cost cascade (free → 8s). The Icon is the tier's identity
// glyph (distinct from the status icon on the spine node).
const TIER_PLAIN: Partial<Record<TierId, {
  plain: string;
  what_it_does: string;
  cost_label: string;
  cost_log: number;
  Icon: typeof Gauge;
}>> = {
  gate: {
    plain: 'should we even check this?',
    what_it_does:
      'looks at the model’s token confidence to decide if the step needs inspection',
    cost_label: '<1ms',
    cost_log: 0,
    Icon: Gauge,
  },
  t1: {
    plain: '15 hand-coded checks',
    what_it_does:
      'fast, deterministic — math, banned words, broken citations, repetition',
    cost_label: '~12ms',
    cost_log: 0.4,
    Icon: Regex,
  },
  t2: {
    plain: 'an LLM judge',
    what_it_does: 'reads the step and decides if the reasoning is sound',
    cost_label: '~55ms',
    cost_log: 0.55,
    Icon: Cpu,
  },
  t2_5: {
    plain: 'the model second-guesses itself',
    what_it_does: 'a one-line “OK or correction” reply from the model',
    cost_label: '~90ms',
    cost_log: 0.6,
    Icon: RefreshCw,
  },
  t3: {
    plain: 'a multi-model panel debates',
    what_it_does: 'only runs if the lower tiers couldn’t agree',
    cost_label: '~6.5s',
    cost_log: 1.0,
    Icon: Users,
  },
  enforcement: {
    plain: 'the final decision',
    what_it_does: 'collects every verdict, decides proceed / rewind / degrade',
    cost_label: 'composer',
    cost_log: 0.3,
    Icon: Scale,
  },
};

type TierState =
  | 'ran-pass'
  | 'ran-fire'
  | 'skipped'
  | 'not-invoked'
  | 'final-pass'
  | 'final-fire';

type ClassifiedTier = {
  state: TierState;
  label: string;
  sublabel: string;
  fake_provider: boolean;
  confidence_for_bar: number | null;
};

// Per-tier classifier — keyed by tier id, each returns a normalised
// state/label for the UI. Replaces a 160-line if-chain.
const TIER_CLASSIFIERS: Record<string, (rec: StepRecord) => ClassifiedTier> = {
  gate: (rec) => {
    if (rec.trigger_verdict) {
      return {
        state: 'ran-fire',
        label: 'escalate',
        sublabel: 'model was uncertain — run the ladder',
        fake_provider: false,
        confidence_for_bar: 1 - rec.trigger_signals.min_top1,
      };
    }
    return {
      state: 'ran-pass',
      label: 'no escalation',
      sublabel: 'model was confident — skip the ladder',
      fake_provider: false,
      confidence_for_bar: rec.trigger_signals.min_top1,
    };
  },
  t1: (rec) => {
    if (!rec.t1 || !rec.trigger_verdict) {
      return { state: 'not-invoked', label: 'not invoked', sublabel: 'gate did not escalate', fake_provider: false, confidence_for_bar: null };
    }
    const fired = rec.t1.rule_verdicts?.filter((r) => r.fired) || [];
    const total = rec.t1.rule_verdicts?.length || 0;
    if (fired.length > 0) {
      const top = fired[0];
      return {
        state: 'ran-fire',
        label: top.rule_name,
        sublabel: `${(top.confidence * 100).toFixed(0)}% conf · ${fired.length}/${total} rules`,
        fake_provider: false,
        confidence_for_bar: top.confidence,
      };
    }
    return {
      state: 'ran-pass',
      label: 'no rule fired',
      sublabel: `${total} rules · all clear`,
      fake_provider: false,
      confidence_for_bar: null,
    };
  },
  t2: (rec) => {
    if (!rec.t2 || !rec.trigger_verdict) {
      return { state: 'not-invoked', label: 'not invoked', sublabel: 'gate did not escalate', fake_provider: false, confidence_for_bar: null };
    }
    const isFake = (rec.t2.judge_provider || '').toLowerCase() === 'fake';
    const reasoning = rec.t2.reasoning || '';
    if (rec.t2.verdict === 'skipped' && reasoning.includes('t1_high_confidence')) {
      return {
        state: 'skipped',
        label: 'short-circuit',
        sublabel: 'T1 already caught it with high confidence',
        fake_provider: false,
        confidence_for_bar: null,
      };
    }
    if (rec.t2.verdict === 'reject') {
      return {
        state: 'ran-fire',
        label: 'reject',
        sublabel: isFake ? 'fake provider · staged reject' : `${((rec.t2.confidence || 0) * 100).toFixed(0)}% conf`,
        fake_provider: isFake,
        confidence_for_bar: rec.t2.confidence ?? null,
      };
    }
    if (rec.t2.verdict === 'uncertain' || rec.t2.verdict === 'undecided') {
      return {
        state: 'ran-pass',
        label: rec.t2.verdict,
        sublabel: 'in the gray zone — escalate',
        fake_provider: isFake,
        confidence_for_bar: rec.t2.confidence ?? null,
      };
    }
    return {
      state: 'ran-pass',
      label: rec.t2.verdict || 'ok',
      sublabel: isFake ? 'fake provider · public-demo staging' : `${((rec.t2.confidence || 0) * 100).toFixed(0)}% conf`,
      fake_provider: isFake,
      confidence_for_bar: rec.t2.confidence ?? null,
    };
  },
  t2_5: (rec) => {
    if (!rec.t2_5 || !rec.trigger_verdict) {
      return { state: 'not-invoked', label: 'not invoked', sublabel: 'gate did not escalate', fake_provider: false, confidence_for_bar: null };
    }
    const reasoning = rec.t2_5.reasoning || '';
    if (rec.t2_5.outcome === 'skipped' && reasoning.includes('t1_high_confidence')) {
      return {
        state: 'skipped',
        label: 'short-circuit',
        sublabel: 'T1 already caught it with high confidence',
        fake_provider: false,
        confidence_for_bar: null,
      };
    }
    if (rec.t2_5.outcome === 'corrected') {
      return {
        state: 'ran-fire',
        label: 'corrected',
        sublabel: rec.t2_5.protocol === 'text' ? 'one-line text rewrite' : 'json envelope',
        fake_provider: false,
        confidence_for_bar: rec.t2_5.confidence ?? null,
      };
    }
    return {
      state: 'ran-pass',
      label: rec.t2_5.outcome || 'ok',
      sublabel: rec.t2_5.protocol === 'text' ? 'no correction needed' : 'json envelope',
      fake_provider: false,
      confidence_for_bar: null,
    };
  },
  t3: (rec) => {
    if (!rec.t3 || !rec.trigger_verdict) {
      return { state: 'not-invoked', label: 'not invoked', sublabel: 'gate did not escalate', fake_provider: false, confidence_for_bar: null };
    }
    if (!rec.t3.n_models || rec.t3.n_models === 0) {
      return {
        state: 'not-invoked',
        label: 'not invoked',
        sublabel: 'lower tiers reached agreement — no debate needed',
        fake_provider: false,
        confidence_for_bar: null,
      };
    }
    if (rec.t3.outcome === 'reject') {
      return {
        state: 'ran-fire',
        label: 'reject',
        sublabel: `${((rec.t3.consensus_score || 0) * 100).toFixed(0)}% consensus · ${rec.t3.n_models} models`,
        fake_provider: false,
        confidence_for_bar: rec.t3.consensus_score ?? null,
      };
    }
    return {
      state: 'ran-pass',
      label: rec.t3.outcome || 'ok',
      sublabel: `${((rec.t3.consensus_score || 0) * 100).toFixed(0)}% consensus · ${rec.t3.n_models} models`,
      fake_provider: false,
      confidence_for_bar: rec.t3.consensus_score ?? null,
    };
  },
  enforcement: (rec) => {
    if (!rec.enforcement) {
      return { state: 'not-invoked', label: 'no decision', sublabel: '', fake_provider: false, confidence_for_bar: null };
    }
    const o = (rec.enforcement.outcome || '').toLowerCase();
    if (o === 'rewind' || o === 'degrade') {
      return {
        state: 'final-fire',
        label: o.toUpperCase(),
        sublabel: o === 'rewind' ? 'host runtime rolls the step back' : 'response marked degraded',
        fake_provider: false,
        confidence_for_bar: rec.enforcement.max_rule_confidence ?? null,
      };
    }
    return {
      state: 'final-pass',
      label: 'PROCEED',
      sublabel: 'the step is allowed through',
      fake_provider: false,
      confidence_for_bar: null,
    };
  },
};

function classifyTier(rec: StepRecord, tierId: string): ClassifiedTier {
  const fn = TIER_CLASSIFIERS[tierId];
  if (fn) return fn(rec);
  return { state: 'not-invoked', label: '', sublabel: '', fake_provider: false, confidence_for_bar: null };
}

const STATE_THEME: Record<TierState, { ring: string; glow: string; text: string; bar: string; iconBg: string }> = {
  'ran-pass': {
    ring: 'border-accent/40',
    glow: 'shadow-[0_0_30px_-14px_hsl(var(--accent)/0.35)]',
    text: 'text-accent',
    bar: 'bg-accent/70',
    iconBg: 'bg-background',
  },
  'ran-fire': {
    ring: 'border-primary',
    glow: 'shadow-[0_0_36px_-10px_hsl(var(--primary)/0.55)]',
    text: 'text-primary',
    bar: 'bg-primary',
    iconBg: 'bg-background',
  },
  skipped: {
    ring: 'border-border/40 border-dashed',
    glow: '',
    text: 'text-muted-foreground/70',
    bar: 'bg-border/40',
    iconBg: 'bg-background',
  },
  'not-invoked': {
    ring: 'border-border/30 border-dashed',
    glow: '',
    text: 'text-muted-foreground/60',
    bar: 'bg-border/20',
    iconBg: 'bg-background',
  },
  'final-pass': {
    ring: 'border-accent',
    glow: 'shadow-[0_0_42px_-10px_hsl(var(--accent)/0.45)]',
    text: 'text-accent',
    bar: 'bg-accent',
    iconBg: 'bg-background',
  },
  'final-fire': {
    ring: 'border-primary',
    glow: 'shadow-[0_0_50px_-8px_hsl(var(--primary)/0.65)]',
    text: 'text-primary',
    bar: 'bg-primary',
    iconBg: 'bg-background',
  },
};

function StateIcon({ state, className }: { state: TierState; className?: string }) {
  if (state === 'ran-fire') return <AlertTriangle className={className} aria-hidden />;
  if (state === 'ran-pass') return <CheckCircle2 className={className} aria-hidden />;
  if (state === 'skipped') return <CornerDownRight className={className} aria-hidden />;
  if (state === 'not-invoked') return <Circle className={className} aria-hidden />;
  if (state === 'final-pass') return <ShieldCheck className={className} aria-hidden />;
  if (state === 'final-fire') return <ShieldOff className={className} aria-hidden />;
  return <Circle className={className} aria-hidden />;
}

// Char-by-char typewriter. All timer handles tracked in a ref so prop
// changes cancel cleanly. Wrapped in an aria-live region; the live
// region holds the FULL text so screen readers announce the completed
// sentence once instead of stuttering per character. Respects
// prefers-reduced-motion — renders the full text immediately.
function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const [shown, setShown] = useState('');
  const reducedMotion = useReducedMotion();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    // Clear any pending timers from the previous text.
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    if (reducedMotion) {
      setShown(text);
      onDoneRef.current?.();
      return () => {};
    }

    setShown('');
    let idx = 0;
    let stopped = false;
    function tick() {
      if (stopped) return;
      if (idx >= text.length) {
        onDoneRef.current?.();
        return;
      }
      idx += 1;
      setShown(text.slice(0, idx));
      const ch = text[idx - 1];
      const delay = ch === '.' || ch === '?' || ch === '!' ? 180 : ch === ',' || ch === ';' ? 80 : 18;
      const t = setTimeout(tick, delay);
      timersRef.current.push(t);
    }
    const first = setTimeout(tick, 60);
    timersRef.current.push(first);
    return () => {
      stopped = true;
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [text, reducedMotion]);

  return (
    <>
      {/* Visible char-by-char output. */}
      <span aria-hidden>
        {shown}
        {!reducedMotion && shown.length < text.length && (
          <span className="inline-block w-[0.5ch] -mb-0.5 ml-0.5 bg-primary animate-pulse">
            &nbsp;
          </span>
        )}
      </span>
      {/* Screen reader gets the completed sentence as a polite live
          region — announced once when the text settles, not per char. */}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {text}
      </span>
    </>
  );
}

// Find the index of the strongest "first impression" record — prefer a
// record where T1 fires so cold visitors see the catch payoff. Falls
// back to 0 if no such record exists.
function pickEntryIndex(records: StepRecord[]): number {
  const idx = records.findIndex((r) => {
    if (!r.trigger_verdict || !r.t1) return false;
    const fired = r.t1.rule_verdicts?.some((rv) => rv.fired);
    const enf = (r.enforcement?.outcome || '').toLowerCase();
    return Boolean(fired) && enf === 'rewind';
  });
  return idx >= 0 ? idx : 0;
}

export function StreamingLadder({ data }: { data: SceneData }) {
  const reducedMotion = useReducedMotion();
  const entryIdx = useMemo(() => pickEntryIndex(data.records), [data.records]);
  const [activeIdx, setActiveIdx] = useState(entryIdx);
  const [beatIdx, setBeatIdx] = useState(0);
  // Reduced motion: don't auto-play. User can opt in.
  const [playing, setPlaying] = useState(!reducedMotion);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Defensive bounds — clamp to a valid index even on empty arrays so
  // the hooks below always have a non-null record to memo against.
  const noRecords = data.records.length === 0;
  const safeActiveIdx = noRecords ? 0 : Math.min(Math.max(0, activeIdx), data.records.length - 1);
  // Memoize so dependent hooks see a stable identity. The stub case
  // (noRecords) short-circuits below at render time.
  const record: StepRecord = useMemo(
    () =>
      noRecords
        ? ({ step_id: 'none', step_index: 0, step_content: '', beats: [], trigger_signals: { min_top1: 0, max_entropy: 0, max_runner_up_ratio: 0, topk: 0, degraded_logprobs: false }, trigger_verdict: false, t1: null, t2: null, t2_5: null, t3: null, enforcement: null } as StepRecord)
        : data.records[safeActiveIdx],
    [noRecords, data.records, safeActiveIdx],
  );
  const beats = useMemo(() => record.beats || [], [record.beats]);
  const activeBeat = beats[beatIdx];

  // Auto-advance beats with their dwell_ms. Only runs when `playing`.
  useEffect(() => {
    if (!playing) return;
    if (!activeBeat) return;
    const dwell = activeBeat.dwell_ms || 3000;
    const timer = setTimeout(() => {
      if (beatIdx < beats.length - 1) {
        setBeatIdx((b) => b + 1);
      } else if (!hasInteracted) {
        // Cycle to next record if visitor hasn't manually scrubbed yet.
        const nextRecordIdx = (safeActiveIdx + 1) % data.records.length;
        setActiveIdx(nextRecordIdx);
        setBeatIdx(0);
      } else {
        setPlaying(false);
      }
    }, dwell);
    return () => clearTimeout(timer);
  }, [playing, beatIdx, beats, activeBeat, safeActiveIdx, data.records.length, hasInteracted]);

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

  const tierClassifications = useMemo(
    () => data.tiers.map((t) => ({ tier: t, ...classifyTier(record, t.id) })),
    [data.tiers, record],
  );

  const activeTierId = activeBeat?.target_tier ?? null;
  const isIntroBeat = activeBeat?.target_tier === null;

  // Which tiers have been "revealed" so far in this record — used to
  // keep visitors focused on the current beat instead of spoiling the
  // outcome. Unrevealed tiers are aria-hidden so screen readers don't
  // read them out on page load.
  const revealedTierIds = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i <= beatIdx; i++) {
      const t = beats[i]?.target_tier;
      if (t) set.add(t);
    }
    return set;
  }, [beatIdx, beats]);

  if (noRecords) {
    return (
      <div className="signal-panel-strong p-5 text-sm text-muted-foreground">
        No scenarios available.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Step content + summary */}
      <motion.div
        key={`content-${record.step_id}`}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="signal-panel-strong p-5 md:p-8 mb-6 md:mb-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3 md:mb-4">
          <div className="space-y-1">
            <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Reasoning step · index {record.step_index}
            </div>
            <div className="font-mono text-[10px] md:text-xs text-muted-foreground/80">
              {record.step_id} · {record.trigger_verdict ? 'flagged' : 'not flagged'} by gate
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs font-mono text-muted-foreground">
            <span title="model's own top-1 token probability">
              top1·{record.trigger_signals.min_top1.toFixed(2)}
            </span>
            <span title="entropy across the next-token candidates">
              entropy·{record.trigger_signals.max_entropy.toFixed(2)}
            </span>
            <span title="runner-up token probability ratio">
              run-up·{record.trigger_signals.max_runner_up_ratio.toFixed(2)}
            </span>
          </div>
        </div>
        <p className="text-base md:text-xl leading-relaxed font-serif italic text-foreground">
          &ldquo;{record.step_content}&rdquo;
        </p>
        {record.summary && (
          <p className="mt-4 text-xs md:text-sm text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-3 md:pl-4">
            {record.summary}
          </p>
        )}
      </motion.div>

      {/* Narration block — typewriter sits here. */}
      <div className="signal-panel-strong p-5 md:p-7 mb-6 md:mb-8 min-h-[180px] md:min-h-[150px] relative">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Walkthrough · beat {beatIdx + 1} of {beats.length}
            {isIntroBeat && (
              <span className="ml-2 text-primary/80 font-mono normal-case tracking-normal">intro</span>
            )}
            {!isIntroBeat && activeTierId && (
              <span className="ml-2 text-primary/80 font-mono normal-case tracking-normal">
                → {activeTierId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="rounded border border-border/50 hover:border-border bg-background/60 p-2 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
            >
              {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
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

        <div className="text-base md:text-lg leading-relaxed text-foreground/95 font-serif min-h-[5rem] md:min-h-[4.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${record.step_id}-${beatIdx}`}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <Typewriter text={activeBeat?.copy ?? ''} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Beat dots — each wrapped in a 24x24 hit target for WCAG 2.5.5. */}
        <div className="mt-4 flex gap-0.5 flex-wrap" role="tablist" aria-label="Beat selector">
          {beats.map((_, i) => (
            <button
              key={`${record.step_id}-${i}`}
              onClick={() => {
                setBeatIdx(i);
                setHasInteracted(true);
              }}
              className="group inline-flex items-center justify-center h-6 w-8 md:w-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
              role="tab"
              aria-selected={i === beatIdx}
              aria-label={`Jump to beat ${i + 1} of ${beats.length}`}
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

      {/* Tier ladder */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute left-[15px] md:left-[calc(50%-0.5px)] top-2 bottom-2 w-px bg-gradient-to-b from-border/10 via-border/60 to-border/10"
        />

        <div className="space-y-3 md:space-y-4">
          {tierClassifications.map((ts) => {
            const theme = STATE_THEME[ts.state];
            const isActive = activeTierId === ts.tier.id;
            const isRevealed = revealedTierIds.has(ts.tier.id);
            const isIdle = !isActive && isRevealed;
            const isHidden = !isRevealed;
            const plain = TIER_PLAIN[ts.tier.id as TierId];
            return (
              <motion.div
                key={ts.tier.id}
                animate={
                  reducedMotion
                    ? { opacity: isHidden ? 0.5 : 1 }
                    : { opacity: isHidden ? 0.18 : isIdle ? 0.55 : 1, scale: isActive ? 1.005 : 1 }
                }
                transition={{ duration: 0.35, ease: 'easeOut' }}
                aria-hidden={isHidden}
                className="relative grid grid-cols-[32px_1fr] md:grid-cols-[1fr_40px_1fr] items-stretch gap-3 md:gap-4"
              >
                {/* Desktop left column — plain-language label, what it does, cost cascade. */}
                <div className="hidden md:flex flex-col items-end justify-center pr-2 text-right gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="text-[15px] font-bold tracking-tight text-foreground">
                      {plain?.plain || ts.tier.name}
                    </div>
                    {plain?.Icon && (
                      <plain.Icon className="h-4 w-4 text-muted-foreground/70" aria-hidden />
                    )}
                  </div>
                  <div className="text-[12px] text-muted-foreground leading-snug max-w-[240px]">
                    {plain?.what_it_does || ts.tier.description}
                  </div>
                  {plain && (
                    <div className="mt-0.5">
                      <CostCascade
                        costLog={plain.cost_log}
                        label={plain.cost_label}
                        faded={ts.state === 'skipped' || ts.state === 'not-invoked'}
                      />
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground/70 font-mono uppercase tracking-widest mt-1">
                    {ts.tier.name} · {ts.tier.spec}
                  </div>
                </div>

                {/* Spine node */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={
                      reducedMotion ? { scale: 1 } : { scale: isActive ? 1.15 : 1 }
                    }
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className={`relative z-10 flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border-2 ${theme.iconBg} ${theme.ring} ${
                      isActive ? theme.glow : ''
                    } ${theme.text}`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={`${ts.tier.id}-${ts.state}`}
                        initial={reducedMotion ? false : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reducedMotion ? undefined : { opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.18 }}
                      >
                        <StateIcon state={ts.state} className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Right column — verdict card */}
                <motion.div
                  transition={{ duration: 0.3 }}
                  className={`relative rounded-lg border ${theme.ring} bg-card/40 backdrop-blur-sm p-3 md:p-4 transition-shadow ${
                    isActive ? theme.glow : ''
                  }`}
                >
                  {/* Mobile-only plain-language header + cost cascade. */}
                  <div className="md:hidden mb-2 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        {plain?.Icon && (
                          <plain.Icon className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                        )}
                        <div className="text-[14px] font-bold tracking-tight text-foreground">
                          {plain?.plain || ts.tier.name}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        {plain?.what_it_does || ts.tier.description}
                      </div>
                    </div>
                    {plain && (
                      <CostCascade
                        costLog={plain.cost_log}
                        label={plain.cost_label}
                        faded={ts.state === 'skipped' || ts.state === 'not-invoked'}
                      />
                    )}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${ts.tier.id}-${record.step_id}`}
                      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                        <div className={`font-mono text-sm md:text-base font-bold ${theme.text}`}>
                          {ts.label}
                          {ts.fake_provider && (
                            <span
                              className="ml-2 text-[9px] uppercase tracking-widest text-muted-foreground/80 font-sans"
                              title="this tier ran against a deterministic fake provider for the public demo"
                            >
                              fake provider
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] md:text-xs font-mono text-muted-foreground">
                          {ts.sublabel}
                        </div>
                      </div>

                      <TierBody record={record} tier={ts.tier} state={ts.state} />

                      <ConfidenceBar value={ts.confidence_for_bar} barClass={theme.bar} label={ts.label} />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Aftermath — keyed by step_id so motion delays don't replay
          stale across record switches. */}
      <AftermathPanel
        key={`aftermath-${record.step_id}`}
        record={record}
        visible={revealedTierIds.has('enforcement')}
        reducedMotion={Boolean(reducedMotion)}
      />

      {/* Journey panel — production cost estimate vs naive worst case. */}
      <div className="mt-8 md:mt-10">
        <JourneyPanel record={record} />
      </div>

      {/* Record scrubber — radio-group semantics, not toggle. */}
      <div className="mt-6 md:mt-8">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Try a different reasoning step · {data.records.length} scenarios
        </div>
        <div role="radiogroup" aria-label="Reasoning step scenarios" className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {data.records.map((r, idx) => {
            const isActive = idx === safeActiveIdx;
            const enf = (r.enforcement?.outcome || 'pending').toLowerCase();
            const isRewind = enf === 'rewind' || enf === 'degrade';
            return (
              <button
                key={r.step_id}
                onClick={() => selectRecord(idx)}
                className={`group relative flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-[0_0_25px_-12px_hsl(var(--primary)/0.5)]'
                    : 'border-border/50 hover:border-border'
                }`}
                role="radio"
                aria-checked={isActive}
                tabIndex={isActive ? 0 : -1}
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  step {r.step_index}
                </span>
                <span className="text-xs md:text-sm text-foreground/90 leading-tight line-clamp-2">
                  {(r.summary || r.step_content).slice(0, 60)}
                  {(r.summary || r.step_content).length > 60 ? '…' : ''}
                </span>
                <span
                  className={`text-[10px] font-mono mt-1 flex items-center gap-1 ${
                    isRewind ? 'text-primary' : 'text-accent/90'
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isRewind ? 'bg-primary' : 'bg-accent/80'
                    }`}
                    aria-hidden
                  />
                  {enf.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TierBody({ record, tier, state }: { record: StepRecord; tier: Tier; state: TierState }) {
  if (state === 'skipped' || state === 'not-invoked') return null;

  if (tier.id === 'gate') {
    const ts = record.trigger_signals;
    return (
      <div className="mt-2 md:mt-3 grid grid-cols-3 gap-2 md:gap-3">
        <SignalGauge
          label="top-1 prob"
          value={ts.min_top1}
          hint="how sure the model was about its most likely next token"
        />
        <SignalGauge
          label="entropy"
          value={Math.min(1, ts.max_entropy / 3.5)}
          raw={ts.max_entropy.toFixed(2)}
          hint="how spread out the next-token candidates were"
        />
        <SignalGauge
          label="runner-up"
          value={ts.max_runner_up_ratio}
          hint="how close the second-best token was to the top one"
        />
      </div>
    );
  }

  if (tier.id === 't1' && record.t1) {
    const fired = record.t1.rule_verdicts?.filter((r) => r.fired) || [];
    if (fired.length === 0) return null;
    return (
      <div className="mt-2 md:mt-3 space-y-1">
        {fired.slice(0, 3).map((rv) => (
          <div key={rv.rule_name} className="text-[11px] md:text-xs">
            <span className="font-mono text-primary">{rv.rule_name}</span>
            {Object.keys(rv.evidence || {}).length > 0 && (
              <span className="ml-2 text-muted-foreground/80 font-mono text-[10px] md:text-xs break-all">
                {JSON.stringify(rv.evidence).slice(0, 120)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (tier.id === 't2' && record.t2?.reasoning && record.t2.reasoning !== 'fake') {
    return (
      <p className="mt-2 md:mt-3 text-[11px] md:text-xs text-muted-foreground leading-relaxed">
        {record.t2.reasoning}
      </p>
    );
  }
  if (tier.id === 't2_5' && record.t2_5?.corrected_step_content) {
    return (
      <div className="mt-2 md:mt-3 rounded border-l-2 border-primary/60 bg-primary/5 pl-3 py-2">
        <div className="text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-primary mb-1">
          Correction:
        </div>
        <p className="text-[11px] md:text-xs italic text-foreground/90">
          {record.t2_5.corrected_step_content}
        </p>
      </div>
    );
  }
  if (tier.id === 't3' && record.t3?.models_used && record.t3.models_used.length > 0) {
    return (
      <div className="mt-2 md:mt-3 text-[11px] md:text-xs font-mono text-muted-foreground">
        models · {record.t3.models_used.join(', ')}
      </div>
    );
  }
  if (tier.id === 'enforcement' && record.enforcement) {
    const evidence = (record.enforcement.evidence || {}) as Record<string, unknown>;
    const src = evidence.enforcement_source;
    return (
      <div className="mt-2 md:mt-3 text-[11px] md:text-xs font-mono text-muted-foreground space-y-0.5">
        {src != null && <div>source · {String(src)}</div>}
        {record.enforcement.rewind_steps_so_far != null && (
          <div>rewinds used · {record.enforcement.rewind_steps_so_far}</div>
        )}
      </div>
    );
  }
  return null;
}

function ConfidenceBar({ value, barClass, label }: { value: number | null; barClass: string; label?: string }) {
  if (value == null) return null;
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div
      className="mt-3 h-1 w-full rounded-full bg-border/30 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ? `${label} confidence` : 'Confidence'}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
        className={`h-full ${barClass}`}
      />
    </div>
  );
}

// Signal gauge — fills proportional to value (0..1). role=progressbar
// surfaces the value to assistive tech; tooltip is keyboard-reachable
// via focus-within.
function SignalGauge({
  label,
  value,
  raw,
  hint,
}: {
  label: string;
  value: number;
  raw?: string;
  hint?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const pct = Math.round(clamped * 100);
  return (
    <div className="rounded border border-border/40 bg-background/40 p-2 group relative focus-within:border-border">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1.5">
        {label}
      </div>
      <div
        className="h-1 w-full rounded-full bg-border/30 overflow-hidden mb-1.5"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} ${raw ?? clamped.toFixed(2)}`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-accent/70"
        />
      </div>
      <div className="font-mono text-[11px] text-foreground">{raw ?? clamped.toFixed(2)}</div>
      {hint && (
        <div
          tabIndex={0}
          className="hidden group-hover:block group-focus-within:block absolute left-1/2 -translate-x-1/2 -bottom-1.5 translate-y-full z-20 w-48 rounded border border-border/60 bg-background/95 backdrop-blur p-2 text-[10px] text-muted-foreground leading-snug pointer-events-none"
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// Cost cascade — log-scaled 6-segment bar. Number of filled segments
// scales with cost_log (0..1).
function CostCascade({ costLog, label, faded }: { costLog: number; label: string; faded: boolean }) {
  const segments = 6;
  const filled = Math.max(1, Math.round(costLog * segments));
  return (
    <div className="flex items-center gap-1.5" aria-label={`Cost: ${label}`}>
      <div className="flex gap-[2px]" aria-hidden>
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-1 rounded-sm ${
              i < filled
                ? faded
                  ? 'bg-border/40'
                  : 'bg-primary/70'
                : 'bg-border/30'
            }`}
          />
        ))}
      </div>
      <span className={`font-mono text-[10px] ${faded ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}

// Format ms for display.
function fmtMs(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return ms < 10 ? `${ms.toFixed(1)}ms` : `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Compact stat panel: production cost estimate vs naive worst case.
function JourneyPanel({ record }: { record: StepRecord }) {
  const lat = record.latency;
  if (!lat) return null;
  const actual = lat.actual_total_ms;
  const naive = lat.naive_total_ms;
  // Cap displayed savings at 99.9% — even when actual is sub-ms, we
  // never want to show 100.0% which reads as a gamed metric.
  const saved_pct_raw = naive > 0 ? Math.max(0, 100 - (actual / naive) * 100) : 0;
  const saved_pct = Math.min(99.9, saved_pct_raw);
  return (
    <div className="signal-panel-strong p-4 md:p-5 mb-6 md:mb-8 grid grid-cols-3 gap-3 md:gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          this step cost
        </div>
        <div className="font-mono text-xl md:text-2xl text-foreground font-bold leading-tight">
          {fmtMs(actual)}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          production estimate
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          worst case
        </div>
        <div className="font-mono text-xl md:text-2xl text-muted-foreground/80 line-through font-bold leading-tight">
          {fmtMs(naive)}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          if every tier ran to budget
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          saved
        </div>
        <div className="font-mono text-xl md:text-2xl text-primary font-bold leading-tight">
          {saved_pct.toFixed(1)}%
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          by short-circuiting
        </div>
      </div>
    </div>
  );
}

// What happens after the enforcer fires — token-stream preview. Ember
// is used only on the verdict accent, not also on the rewind label —
// reserves the accent for one focal element per panel.
function AftermathPanel({
  record,
  visible,
  reducedMotion,
}: {
  record: StepRecord;
  visible: boolean;
  reducedMotion: boolean;
}) {
  const outcome = (record.enforcement?.outcome || '').toLowerCase();
  const isRewind = outcome === 'rewind';
  const isDegrade = outcome === 'degrade';
  const isPass = outcome === 'proceed';

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
            What the user sees
          </div>

          <div className="font-mono text-xs md:text-sm leading-relaxed bg-background/40 border border-border/40 rounded p-3 md:p-4 mb-4 space-y-2">
            <div className="text-muted-foreground/70">
              …previous reasoning step shipped…
            </div>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.2 }}
              className={
                isRewind
                  ? 'text-foreground/70 line-through decoration-primary/60 decoration-2'
                  : isDegrade
                  ? 'text-foreground/80'
                  : 'text-foreground/90'
              }
            >
              {record.step_content}
            </motion.div>
            {isRewind && (
              <>
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reducedMotion ? 0 : 0.7 }}
                  className="text-primary font-bold"
                >
                  ← REWIND signaled to host runtime
                </motion.div>
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reducedMotion ? 0 : 1.1 }}
                  className="text-muted-foreground italic"
                >
                  …host rolls state back; model resamples the step…
                </motion.div>
              </>
            )}
            {isDegrade && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.6 }}
                className="text-primary font-bold"
              >
                ⚠ response marked degraded
              </motion.div>
            )}
            {isPass && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.5 }}
                className="text-accent/90"
              >
                → step accepted, model continues to the next reasoning step
              </motion.div>
            )}
          </div>

          {record.aftermath && (
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {record.aftermath}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
