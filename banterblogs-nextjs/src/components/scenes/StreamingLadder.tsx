'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldOff,
  ShieldCheck,
  SkipForward,
  Circle,
  CornerDownRight,
} from 'lucide-react';

// Type-light shape — the JSON is the contract. We don't import from
// chimera/streaming because that would couple the Chimeraforge build
// to the Python streaming layer. The JSON is the boundary.

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

type Record = {
  step_id: string;
  step_index: number;
  step_content: string;
  narrative?: string | null;
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

// `state` distinguishes:
//   ran-pass    LLM/rule actually ran and produced a passing/ok verdict
//   ran-fire    LLM/rule actually ran and produced a firing/reject verdict
//   skipped     tier was deliberately bypassed (T1-skip optimization, etc.)
//   not-invoked tier didn't run at all (no LLM debate path configured, etc.)
//   final-pass  enforcer's terminal PROCEED
//   final-fire  enforcer's terminal REWIND/DEGRADE
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
  // True when this tier's output is from a fake LLM provider — surface
  // it in the UI so viewers don't think canned 0.5 conf is a real call.
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
        sublabel: `${(top.confidence * 100).toFixed(0)}% conf · ${fired.length}/${total} rules fired`,
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
        sublabel: 'T1 high-confidence resolved · §8 T1-skip',
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
        sublabel: 'in undecided zone — escalate',
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
        sublabel: 'T1 high-confidence resolved',
        fake_provider: false,
        confidence_for_bar: null,
      };
    }
    if (rec.t2_5.outcome === 'corrected') {
      return {
        state: 'ran-fire',
        label: 'corrected',
        sublabel: rec.t2_5.protocol === 'text' ? 'text protocol' : 'json envelope',
        fake_provider: false,
        confidence_for_bar: rec.t2_5.confidence ?? null,
      };
    }
    return {
      state: 'ran-pass',
      label: rec.t2_5.outcome || 'ok',
      sublabel: rec.t2_5.protocol === 'text' ? 'text protocol · no correction needed' : 'json envelope',
      fake_provider: false,
      confidence_for_bar: null,
    };
  }
  if (tierId === 't3') {
    if (!rec.t3) return { state: 'not-invoked', label: 'not invoked', sublabel: '', fake_provider: false, confidence_for_bar: null };
    // n_models === 0 means panel didn't actually run a debate. Treat
    // as not-invoked rather than rendering a bogus "0% consensus".
    if (!rec.t3.n_models || rec.t3.n_models === 0) {
      return {
        state: 'not-invoked',
        label: 'not invoked',
        sublabel: 'panel debate path not configured in this demo',
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
        sublabel: rec.enforcement.reason || '',
        fake_provider: false,
        confidence_for_bar: rec.enforcement.max_rule_confidence ?? null,
      };
    }
    return {
      state: 'final-pass',
      label: 'PROCEED',
      sublabel: rec.enforcement.reason || '',
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

export function StreamingLadder({ data }: { data: SceneData }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const record = data.records[activeIdx];

  const tierClassifications = useMemo(
    () => data.tiers.map((t) => ({ tier: t, ...classifyTier(record, t.id) })),
    [data.tiers, record],
  );

  return (
    <div className="relative">
      {/* Step content + trigger signals */}
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
        {record.narrative && (
          <p className="mt-4 text-xs md:text-sm text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-3 md:pl-4">
            {record.narrative}
          </p>
        )}
      </motion.div>

      {/* Tier ladder */}
      <div className="relative">
        {/* Vertical spine */}
        <div
          aria-hidden
          className="absolute left-[15px] md:left-[calc(50%-0.5px)] top-2 bottom-2 w-px bg-gradient-to-b from-border/10 via-border/60 to-border/10"
        />

        <div className="space-y-3 md:space-y-4">
          {tierClassifications.map((ts, idx) => {
            const theme = STATE_THEME[ts.state];
            const isLast = idx === tierClassifications.length - 1;
            return (
              <div
                key={ts.tier.id}
                className="relative grid grid-cols-[32px_1fr] md:grid-cols-[1fr_40px_1fr] items-stretch gap-3 md:gap-4"
              >
                {/* Left column (desktop): tier metadata */}
                <div className="hidden md:flex flex-col items-end justify-center pr-2 text-right">
                  <div className={`text-sm font-bold tracking-tight ${isLast ? 'text-foreground' : 'text-foreground/90'}`}>
                    {ts.tier.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                    {ts.tier.spec}
                    {ts.tier.budget_ms ? ` · ${ts.tier.budget_ms}ms` : ''}
                  </div>
                </div>

                {/* Spine node — persistent (no key change between records) */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    layout
                    animate={{
                      scale: ts.state === 'final-fire' || ts.state === 'ran-fire' ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`relative z-10 flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border-2 ${theme.iconBg} ${theme.ring} ${theme.glow} ${theme.text}`}
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
                  className={`relative rounded-lg border ${theme.ring} bg-card/40 backdrop-blur-sm p-3 md:p-4 transition-shadow ${theme.glow}`}
                >
                  {/* Mobile-only tier header */}
                  <div className="md:hidden mb-2 flex items-baseline justify-between gap-2">
                    <div className="text-sm font-bold tracking-tight">{ts.tier.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                      {ts.tier.spec}
                      {ts.tier.budget_ms ? ` · ${ts.tier.budget_ms}ms` : ''}
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Record scrubber */}
      <div className="mt-8 md:mt-12">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Scrub through records · {data.records.length} total
        </div>
        <div className="grid grid-cols-2 md:flex gap-2 md:flex-wrap">
          {data.records.map((r, idx) => {
            const isActive = idx === activeIdx;
            const enf = (r.enforcement?.outcome || 'pending').toLowerCase();
            const indicator =
              enf === 'rewind' || enf === 'degrade' ? 'bg-primary' : 'bg-accent/70';
            return (
              <button
                key={r.step_id}
                onClick={() => setActiveIdx(idx)}
                className={`group relative flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-[0_0_25px_-12px_hsl(var(--primary)/0.5)]'
                    : 'border-border/50 hover:border-border'
                }`}
                aria-pressed={isActive}
              >
                <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">
                  step {r.step_index} · {r.step_id}
                </span>
                <span className="text-xs font-mono">{enf.toUpperCase()}</span>
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
