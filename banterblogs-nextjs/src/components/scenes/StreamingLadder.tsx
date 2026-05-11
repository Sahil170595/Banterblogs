'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ShieldOff, SkipForward, Activity } from 'lucide-react';

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

type TierStatus = 'pending' | 'pass' | 'fire' | 'skip' | 'final';

function classifyTier(rec: Record, tierId: string): { status: TierStatus; label: string; detail: string } {
  if (tierId === 't1') {
    if (!rec.t1) return { status: 'skip', label: 'skipped', detail: '' };
    const fired = rec.t1.rule_verdicts?.filter((r) => r.fired) || [];
    if (fired.length > 0) {
      const top = fired[0];
      return {
        status: 'fire',
        label: top.rule_name,
        detail: `${(top.confidence * 100).toFixed(0)}% conf`,
      };
    }
    return { status: 'pass', label: 'no rule fired', detail: `${rec.t1.rule_verdicts?.length ?? 0} rules checked` };
  }
  if (tierId === 't2') {
    if (!rec.t2) return { status: 'skip', label: 'not invoked', detail: '' };
    const v = rec.t2.verdict || 'unknown';
    const status: TierStatus = v === 'reject' ? 'fire' : v === 'skipped' ? 'skip' : 'pass';
    return { status, label: v, detail: rec.t2.confidence ? `${(rec.t2.confidence * 100).toFixed(0)}% conf` : '' };
  }
  if (tierId === 't2_5') {
    if (!rec.t2_5) return { status: 'skip', label: 'not invoked', detail: '' };
    const v = rec.t2_5.outcome || 'unknown';
    const status: TierStatus =
      v === 'corrected' ? 'fire' : v === 'ok' ? 'pass' : v === 'skipped' ? 'skip' : 'pass';
    return {
      status,
      label: v === 'skipped' ? 'skipped' : v,
      detail: rec.t2_5.protocol === 'text' ? 'text protocol' : 'json',
    };
  }
  if (tierId === 't3') {
    if (!rec.t3) return { status: 'skip', label: 'not invoked', detail: '' };
    const v = rec.t3.outcome || 'unknown';
    const status: TierStatus = v === 'reject' ? 'fire' : v === 'skipped' ? 'skip' : 'pass';
    return {
      status,
      label: v,
      detail:
        rec.t3.consensus_score != null
          ? `${(rec.t3.consensus_score * 100).toFixed(0)}% consensus`
          : '',
    };
  }
  if (tierId === 'enforcement') {
    if (!rec.enforcement) return { status: 'skip', label: 'no decision', detail: '' };
    const o = rec.enforcement.outcome || 'unknown';
    const status: TierStatus = o === 'rewind' || o === 'degrade' ? 'fire' : 'final';
    return {
      status,
      label: o.toUpperCase(),
      detail: rec.enforcement.reason || '',
    };
  }
  return { status: 'skip', label: '', detail: '' };
}

const STATUS_THEME: { [K in TierStatus]: { ring: string; glow: string; text: string; bar: string } } = {
  pending: {
    ring: 'border-border/30',
    glow: '',
    text: 'text-muted-foreground',
    bar: 'bg-border/30',
  },
  pass: {
    ring: 'border-accent/40',
    glow: 'shadow-[0_0_30px_-12px_hsl(var(--accent)/0.4)]',
    text: 'text-accent',
    bar: 'bg-accent/70',
  },
  fire: {
    ring: 'border-primary',
    glow: 'shadow-[0_0_40px_-8px_hsl(var(--primary)/0.6)]',
    text: 'text-primary',
    bar: 'bg-primary',
  },
  skip: {
    ring: 'border-border/40',
    glow: '',
    text: 'text-muted-foreground/60',
    bar: 'bg-muted/30',
  },
  final: {
    ring: 'border-accent',
    glow: 'shadow-[0_0_50px_-8px_hsl(var(--accent)/0.5)]',
    text: 'text-accent',
    bar: 'bg-accent',
  },
};

function StatusIcon({ status }: { status: TierStatus }) {
  if (status === 'fire') return <AlertTriangle className="h-4 w-4" />;
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'skip') return <SkipForward className="h-4 w-4" />;
  if (status === 'final') return <ShieldOff className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export function StreamingLadder({ data }: { data: SceneData }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const record = data.records[activeIdx];

  const tierStatuses = useMemo(
    () => data.tiers.map((t) => ({ tier: t, ...classifyTier(record, t.id) })),
    [data.tiers, record],
  );

  return (
    <div className="relative">
      {/* Step content + trigger signals */}
      <div className="signal-panel-strong p-6 md:p-8 mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Reasoning step · index {record.step_index}
            </div>
            <div className="font-mono text-xs text-muted-foreground/70">
              {record.step_id} · {record.trigger_verdict ? 'flagged' : 'not flagged'} by gate
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span>top1 · {record.trigger_signals.min_top1.toFixed(2)}</span>
            <span>H · {record.trigger_signals.max_entropy.toFixed(2)}</span>
            <span>runner-up · {record.trigger_signals.max_runner_up_ratio.toFixed(2)}</span>
          </div>
        </div>
        <p className="text-lg md:text-xl leading-relaxed font-serif italic text-foreground">
          “{record.step_content}”
        </p>
      </div>

      {/* Tier ladder */}
      <div className="relative">
        {/* Vertical spine */}
        <div
          aria-hidden
          className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-border/10 via-border/60 to-border/10 md:left-1/2 md:-translate-x-1/2"
        />

        <div className="space-y-4">
          {tierStatuses.map((ts, idx) => {
            const theme = STATUS_THEME[ts.status];
            return (
              <motion.div
                key={`${record.step_id}-${ts.tier.id}`}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.35, ease: 'easeOut' }}
                className="relative grid grid-cols-[40px_1fr] md:grid-cols-[1fr_40px_1fr] items-stretch gap-4"
              >
                {/* Left column (desktop): tier metadata */}
                <div className="hidden md:flex flex-col items-end justify-center pr-2 text-right">
                  <div className="text-sm font-bold tracking-tight">{ts.tier.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {ts.tier.spec}
                    {ts.tier.budget_ms ? ` · ${ts.tier.budget_ms}ms budget` : ''}
                  </div>
                </div>

                {/* Spine node */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.08 + 0.1, duration: 0.4, ease: 'backOut' }}
                    className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background ${theme.ring} ${theme.glow} ${theme.text}`}
                  >
                    <StatusIcon status={ts.status} />
                  </motion.div>
                </div>

                {/* Right column: verdict detail card */}
                <div
                  className={`relative rounded-lg border ${theme.ring} bg-card/40 backdrop-blur-sm p-4 ${theme.glow}`}
                >
                  {/* Mobile-only tier header */}
                  <div className="md:hidden mb-2">
                    <div className="text-sm font-bold tracking-tight">{ts.tier.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {ts.tier.spec}
                      {ts.tier.budget_ms ? ` · ${ts.tier.budget_ms}ms budget` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className={`font-mono text-base font-bold ${theme.text}`}>
                      {ts.label}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">{ts.detail}</div>
                  </div>

                  {/* Tier-specific detail body */}
                  <TierBody record={record} tier={ts.tier} />

                  {/* Confidence/consensus bar where applicable */}
                  <ConfidenceBar tier={ts.tier} record={record} theme={theme.bar} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Record scrubber */}
      <div className="mt-12">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Scrub through records · {data.records.length} total
        </div>
        <div className="flex gap-2 flex-wrap">
          {data.records.map((r, idx) => {
            const isActive = idx === activeIdx;
            const enf = r.enforcement?.outcome || 'pending';
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
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
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

function TierBody({ record, tier }: { record: Record; tier: Tier }) {
  if (tier.id === 't1' && record.t1) {
    const fired = record.t1.rule_verdicts?.filter((r) => r.fired) || [];
    if (fired.length === 0) return null;
    return (
      <div className="mt-3 space-y-1.5">
        {fired.slice(0, 3).map((rv) => (
          <div key={rv.rule_name} className="text-xs">
            <span className="font-mono text-primary">{rv.rule_name}</span>
            {Object.keys(rv.evidence || {}).length > 0 && (
              <span className="ml-2 text-muted-foreground/80 font-mono">
                {JSON.stringify(rv.evidence).slice(0, 80)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (tier.id === 't2' && record.t2?.reasoning) {
    return (
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{record.t2.reasoning}</p>
    );
  }
  if (tier.id === 't2_5' && record.t2_5) {
    if (record.t2_5.corrected_step_content) {
      return (
        <div className="mt-3 rounded border-l-2 border-primary/60 bg-primary/5 pl-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">
            Correction:
          </div>
          <p className="text-xs italic text-foreground/90">{record.t2_5.corrected_step_content}</p>
        </div>
      );
    }
    if (record.t2_5.reasoning) {
      return <p className="mt-3 text-xs text-muted-foreground">{record.t2_5.reasoning}</p>;
    }
  }
  if (tier.id === 't3' && record.t3?.models_used) {
    return (
      <div className="mt-3 text-xs font-mono text-muted-foreground">
        models · {record.t3.models_used.join(', ')}
      </div>
    );
  }
  if (tier.id === 'enforcement' && record.enforcement) {
    const evidence = record.enforcement.evidence || {};
    const src = (evidence as Record<string, unknown>).enforcement_source;
    return (
      <div className="mt-3 text-xs font-mono text-muted-foreground space-y-1">
        {src && <div>source · {String(src)}</div>}
        {record.enforcement.rewind_steps_so_far != null && (
          <div>rewinds used · {record.enforcement.rewind_steps_so_far}</div>
        )}
      </div>
    );
  }
  return null;
}

function ConfidenceBar({
  tier,
  record,
  theme,
}: {
  tier: Tier;
  record: Record;
  theme: string;
}) {
  let value: number | null = null;
  if (tier.id === 't1' && record.t1) {
    const fired = record.t1.rule_verdicts?.filter((r) => r.fired) || [];
    value = fired.length > 0 ? Math.max(...fired.map((r) => r.confidence)) : null;
  } else if (tier.id === 't2' && record.t2?.confidence != null) {
    value = record.t2.confidence;
  } else if (tier.id === 't2_5' && record.t2_5?.confidence != null) {
    value = record.t2_5.confidence;
  } else if (tier.id === 't3' && record.t3?.consensus_score != null) {
    value = record.t3.consensus_score;
  } else if (tier.id === 'enforcement' && record.enforcement?.max_rule_confidence != null) {
    value = record.enforcement.max_rule_confidence;
  }

  if (value == null) return null;

  return (
    <div className="mt-3 h-1 w-full rounded-full bg-border/30 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className={`h-full ${theme}`}
      />
    </div>
  );
}
