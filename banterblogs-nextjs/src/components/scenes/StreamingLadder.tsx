'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

type Record = {
  step_id: string;
  step_index: number;
  step_content: string;
  summary?: string | null;
  beats: Beat[];
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
  port?: number;
  budget_ms?: number;
  description: string;
};

type SceneData = {
  scene: string;
  generated_at: string;
  spec_ref: string;
  description: string;
  tiers: Tier[];
  records: Record[];
};

// Plain-language labels — what each tier IS for a non-technical reader.
const TIER_PLAIN: { [id: string]: { plain: string; what_it_does: string } } = {
  t1: {
    plain: '15 hand-coded checks',
    what_it_does:
      'fast, deterministic — math, banned words, broken citations, repetition',
  },
  t2: {
    plain: 'an LLM judge',
    what_it_does: 'reads the step and decides if the reasoning is sound',
  },
  t2_5: {
    plain: 'the model second-guesses itself',
    what_it_does: 'a one-line "OK or correction" reply from the model',
  },
  t3: {
    plain: 'a three-model panel debates',
    what_it_does: "only runs if the lower tiers couldn't agree",
  },
  enforcement: {
    plain: 'the final decision',
    what_it_does: 'collects every verdict, decides proceed / rewind / degrade',
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

function classifyTier(rec: Record, tierId: string): ClassifiedTier {
  if (tierId === 't1') {
    if (!rec.t1) return { state: 'not-invoked', label: 'not invoked', sublabel: '', fake_provider: false, confidence_for_bar: null };
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
  }
  if (tierId === 't2') {
    if (!rec.t2) return { state: 'not-invoked', label: 'not invoked', sublabel: '', fake_provider: false, confidence_for_bar: null };
    const isFake = (rec.t2.judge_provider || '').toLowerCase() === 'fake';
    const reasoning = rec.t2.reasoning || '';
    if (rec.t2.verdict === 'skipped' && reasoning.includes('t1_high_confidence')) {
      return {
        state: 'skipped',
        label: 'skipped',
        sublabel: 'a deterministic rule already caught it',
        fake_provider: false,
        confidence_for_bar: null,
      };
    }
    if (rec.t2.verdict === 'reject') {
      return {
        state: 'ran-fire',
        label: 'reject',
        sublabel: isFake ? 'fake provider · canned reject' : `${((rec.t2.confidence || 0) * 100).toFixed(0)}% conf`,
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
      sublabel: isFake ? 'fake provider · canned response' : `${((rec.t2.confidence || 0) * 100).toFixed(0)}% conf`,
      fake_provider: isFake,
      confidence_for_bar: rec.t2.confidence ?? null,
    };
  }
  if (tierId === 't2_5') {
    if (!rec.t2_5) return { state: 'not-invoked', label: 'not invoked', sublabel: '', fake_provider: false, confidence_for_bar: null };
    const reasoning = rec.t2_5.reasoning || '';
    if (rec.t2_5.outcome === 'skipped' && reasoning.includes('t1_high_confidence')) {
      return {
        state: 'skipped',
        label: 'skipped',
        sublabel: 'a deterministic rule already caught it',
        fake_provider: false,
        confidence_for_bar: null,
      };
    }
    if (rec.t2_5.outcome === 'corrected') {
      return {
        state: 'ran-fire',
        label: 'corrected',
        sublabel: rec.t2_5.protocol === 'text' ? 'one-line rewrite' : 'json envelope',
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
  }
  if (tierId === 't3') {
    if (!rec.t3) return { state: 'not-invoked', label: 'not invoked', sublabel: '', fake_provider: false, confidence_for_bar: null };
    if (!rec.t3.n_models || rec.t3.n_models === 0) {
      return {
        state: 'not-invoked',
        label: 'not invoked',
        sublabel: 'the panel only debates when the lower tiers disagree',
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
  }
  if (tierId === 'enforcement') {
    if (!rec.enforcement) return { state: 'not-invoked', label: 'no decision', sublabel: '', fake_provider: false, confidence_for_bar: null };
    const o = (rec.enforcement.outcome || '').toLowerCase();
    if (o === 'rewind' || o === 'degrade') {
      return {
        state: 'final-fire',
        label: o.toUpperCase(),
        sublabel: o === 'rewind' ? 'the step is rolled back' : 'the response is marked degraded',
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
  }
  return { state: 'not-invoked', label: '', sublabel: '', fake_provider: false, confidence_for_bar: null };
}

const STATE_THEME: { [K in TierState]: { ring: string; glow: string; text: string; bar: string; iconBg: string } } = {
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
    text: 'text-muted-foreground/50',
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
  if (state === 'ran-fire') return <AlertTriangle className={className} />;
  if (state === 'ran-pass') return <CheckCircle2 className={className} />;
  if (state === 'skipped') return <CornerDownRight className={className} />;
  if (state === 'not-invoked') return <Circle className={className} />;
  if (state === 'final-pass') return <ShieldCheck className={className} />;
  if (state === 'final-fire') return <ShieldOff className={className} />;
  return <Circle className={className} />;
}

// Char-by-char typewriter. Approximately 30ms per char with a brief
// pause on punctuation so it reads naturally rather than mechanically.
function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const [shown, setShown] = useState('');
  const idxRef = useRef(0);

  useEffect(() => {
    setShown('');
    idxRef.current = 0;
    let stopped = false;
    function tick() {
      if (stopped) return;
      const i = idxRef.current;
      if (i >= text.length) {
        onDone?.();
        return;
      }
      const next = text.slice(0, i + 1);
      setShown(next);
      idxRef.current = i + 1;
      const ch = text[i];
      // Punctuation gets a longer pause to mimic spoken cadence.
      const delay = ch === '.' || ch === '?' || ch === '!' ? 220 : ch === ',' || ch === ';' ? 110 : 28;
      setTimeout(tick, delay);
    }
    const t = setTimeout(tick, 80);
    return () => {
      stopped = true;
      clearTimeout(t);
    };
  }, [text, onDone]);

  return (
    <span>
      {shown}
      <span className="inline-block w-[0.5ch] -mb-0.5 ml-0.5 bg-primary animate-pulse" aria-hidden>
        &nbsp;
      </span>
    </span>
  );
}

export function StreamingLadder({ data }: { data: SceneData }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [beatIdx, setBeatIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  const record = data.records[activeIdx];
  const beats = record.beats || [];
  const activeBeat = beats[beatIdx];

  // Auto-advance beats with their dwell_ms. Only runs when `playing`.
  useEffect(() => {
    if (!playing) return;
    if (!activeBeat) return;
    const dwell = activeBeat.dwell_ms || 3000;
    const timer = setTimeout(() => {
      if (beatIdx < beats.length - 1) {
        setBeatIdx((b) => b + 1);
      } else {
        // Reached the end — auto-advance to next record if visitor
        // hasn't manually scrubbed, then reset to that record's start.
        if (!hasInteracted) {
          const nextRecordIdx = (activeIdx + 1) % data.records.length;
          setActiveIdx(nextRecordIdx);
          setBeatIdx(0);
        } else {
          setPlaying(false);
        }
      }
    }, dwell);
    return () => clearTimeout(timer);
  }, [playing, beatIdx, beats, activeBeat, activeIdx, data.records.length, hasInteracted]);

  // Reset beat to 0 when switching records.
  function selectRecord(idx: number) {
    setActiveIdx(idx);
    setBeatIdx(0);
    setHasInteracted(true);
    setPlaying(true);
  }

  function togglePlay() {
    setPlaying((p) => !p);
    setHasInteracted(true);
  }

  function restart() {
    setBeatIdx(0);
    setPlaying(true);
    setHasInteracted(true);
  }

  const tierClassifications = useMemo(
    () => data.tiers.map((t) => ({ tier: t, ...classifyTier(record, t.id) })),
    [data.tiers, record],
  );

  // Which tier is the active beat pointing at? Used to dim non-active tiers.
  const activeTierId = activeBeat?.target_tier ?? null;
  const isIntroBeat = activeBeat?.target_tier === null;

  // How many tiers have been "revealed" so far in this record? Used to
  // hide tiers the viewer hasn't gotten to yet — keeps focus on the
  // current beat and prevents spoiling the outcome.
  const revealedTierIds = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i <= beatIdx; i++) {
      const t = beats[i]?.target_tier;
      if (t) set.add(t);
    }
    return set;
  }, [beatIdx, beats]);

  return (
    <div className="relative">
      {/* Step content + summary */}
      <motion.div
        key={`content-${record.step_id}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="signal-panel-strong p-5 md:p-8 mb-6 md:mb-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3 md:mb-4">
          <div className="space-y-1">
            <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Reasoning step · index {record.step_index}
            </div>
            <div className="font-mono text-[10px] md:text-xs text-muted-foreground/70">
              {record.step_id} · {record.trigger_verdict ? 'flagged' : 'not flagged'} by gate
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs font-mono text-muted-foreground">
            <span>top1·{record.trigger_signals.min_top1.toFixed(2)}</span>
            <span>H·{record.trigger_signals.max_entropy.toFixed(2)}</span>
            <span>run-up·{record.trigger_signals.max_runner_up_ratio.toFixed(2)}</span>
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

      {/* Narration block — the typewriter sits here, prominent and always visible */}
      <div className="signal-panel-strong p-5 md:p-7 mb-6 md:mb-8 min-h-[160px] md:min-h-[140px] relative">
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
              className="rounded border border-border/50 hover:border-border bg-background/60 p-1.5 transition-colors text-muted-foreground hover:text-foreground"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={restart}
              className="rounded border border-border/50 hover:border-border bg-background/60 p-1.5 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Restart"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="text-base md:text-lg leading-relaxed text-foreground/95 font-serif min-h-[5rem] md:min-h-[4rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${record.step_id}-${beatIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <Typewriter text={activeBeat?.copy ?? ''} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Beat dots */}
        <div className="mt-4 flex gap-1.5 flex-wrap">
          {beats.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setBeatIdx(i);
                setHasInteracted(true);
              }}
              className={`h-1 w-6 md:w-8 rounded-full transition-all ${
                i === beatIdx
                  ? 'bg-primary'
                  : i < beatIdx
                  ? 'bg-accent/60'
                  : 'bg-border/40 hover:bg-border'
              }`}
              aria-label={`Jump to beat ${i + 1}`}
            />
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
            const plain = TIER_PLAIN[ts.tier.id];
            return (
              <motion.div
                key={ts.tier.id}
                animate={{
                  opacity: isHidden ? 0.18 : isIdle ? 0.55 : 1,
                  scale: isActive ? 1.005 : 1,
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative grid grid-cols-[32px_1fr] md:grid-cols-[1fr_40px_1fr] items-stretch gap-3 md:gap-4"
              >
                {/* Left column (desktop): plain-language label */}
                <div className="hidden md:flex flex-col items-end justify-center pr-2 text-right">
                  <div className="text-sm font-bold tracking-tight text-foreground/95">
                    {plain?.plain || ts.tier.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-snug max-w-[220px]">
                    {plain?.what_it_does || ts.tier.description}
                  </div>
                  <div className="text-[9px] text-muted-foreground/60 font-mono uppercase tracking-widest mt-0.5">
                    {ts.tier.name} · {ts.tier.spec}
                  </div>
                </div>

                {/* Spine node */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    layout
                    animate={{
                      scale: isActive ? 1.15 : 1,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`relative z-10 flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border-2 ${theme.iconBg} ${theme.ring} ${
                      isActive ? theme.glow : ''
                    } ${theme.text}`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={`${ts.tier.id}-${ts.state}`}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.18 }}
                      >
                        <StateIcon state={ts.state} className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Right column: verdict detail card */}
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.3 } }}
                  className={`relative rounded-lg border ${theme.ring} bg-card/40 backdrop-blur-sm p-3 md:p-4 transition-shadow ${
                    isActive ? theme.glow : ''
                  }`}
                >
                  {/* Mobile-only plain-language header */}
                  <div className="md:hidden mb-2">
                    <div className="text-sm font-bold tracking-tight">
                      {plain?.plain || ts.tier.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-snug">
                      {plain?.what_it_does || ts.tier.description}
                    </div>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${ts.tier.id}-${record.step_id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                        <div className={`font-mono text-sm md:text-base font-bold ${theme.text}`}>
                          {ts.label}
                          {ts.fake_provider && (
                            <span className="ml-2 text-[9px] uppercase tracking-widest text-muted-foreground/80 font-sans">
                              fake provider
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] md:text-xs font-mono text-muted-foreground">
                          {ts.sublabel}
                        </div>
                      </div>

                      <TierBody record={record} tier={ts.tier} state={ts.state} />

                      <ConfidenceBar value={ts.confidence_for_bar} barClass={theme.bar} />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Record scrubber */}
      <div className="mt-8 md:mt-12">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Try a different reasoning step · {data.records.length} scenarios
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {data.records.map((r, idx) => {
            const isActive = idx === activeIdx;
            const enf = (r.enforcement?.outcome || 'pending').toLowerCase();
            const indicator =
              enf === 'rewind' || enf === 'degrade' ? 'bg-primary' : 'bg-accent/70';
            return (
              <button
                key={r.step_id}
                onClick={() => selectRecord(idx)}
                className={`group relative flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-[0_0_25px_-12px_hsl(var(--primary)/0.5)]'
                    : 'border-border/50 hover:border-border'
                }`}
                aria-pressed={isActive}
              >
                <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">
                  step {r.step_index}
                </span>
                <span className="text-xs md:text-sm text-foreground/90 leading-tight line-clamp-2">
                  {(r.summary || r.step_content).slice(0, 60)}
                  {(r.summary || r.step_content).length > 60 ? '…' : ''}
                </span>
                <span className="text-[10px] font-mono mt-1">{enf.toUpperCase()}</span>
                <span className={`absolute top-1 right-2 h-1.5 w-1.5 rounded-full ${indicator}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TierBody({ record, tier, state }: { record: Record; tier: Tier; state: TierState }) {
  if (state === 'skipped' || state === 'not-invoked') return null;

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
        {src && <div>source · {String(src)}</div>}
        {record.enforcement.rewind_steps_so_far != null && (
          <div>rewinds used · {record.enforcement.rewind_steps_so_far}</div>
        )}
      </div>
    );
  }
  return null;
}

function ConfidenceBar({ value, barClass }: { value: number | null; barClass: string }) {
  if (value == null) return null;
  return (
    <div className="mt-3 h-1 w-full rounded-full bg-border/30 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
        className={`h-full ${barClass}`}
      />
    </div>
  );
}
