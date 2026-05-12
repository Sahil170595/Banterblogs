'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Brain,
  Lightbulb,
  ShieldAlert,
  Compass,
  Scale,
  Flag,
  CornerDownRight,
} from 'lucide-react';

type AgentVerdict = {
  style: string;
  analysis_type: string;
  confidence: number;
  [key: string]: unknown;
};

type AnalyticalVerdict = AgentVerdict & {
  verbs: string[];
  parameters: string[];
  complexity: { nesting_depth: number; word_count: number; ambiguity: number };
  completeness: { expected: number; provided: number; missing: number; score: number };
  consistency: { flags: string[]; contradiction_count: number };
  assessment: string;
};
type CreativeVerdict = AgentVerdict & {
  novelty_score: number;
  reframing_potential: number;
  cross_domain_score: number;
  bigram_count: number;
};
type AdversarialVerdict = AgentVerdict & {
  risk_score: number;
  entropy: number;
  risk_flags: string[];
  recommendation: string;
  tool_multiplier: number;
};
type DomainExpertVerdict = AgentVerdict & {
  primary_domain: string;
  detected_domain: string;
  domain_scores: { domain: string; score: number; hits: number }[];
  cross_domain: boolean;
  domains_touched: number;
  boundary_flags: string[];
};

type Beat = {
  target_agent: string | null;
  dwell_ms: number;
  copy: string;
};

type TaskRecord = {
  step_id: string;
  step_index: number;
  task_description: string;
  primary_domain: string;
  summary?: string | null;
  aftermath?: string | null;
  beats: Beat[];
  verdicts: {
    analytical: AnalyticalVerdict;
    creative: CreativeVerdict;
    adversarial: AdversarialVerdict;
    domain_expert: DomainExpertVerdict;
  };
  meta: {
    default_weights: Record<string, number>;
    ranked: { style: string; weight: number; confidence: number }[];
    selected_style: string;
    selection_reason: string;
    surfaced_flags: Record<string, string[]>;
  };
  latency: {
    actual_total_ms: number;
    naive_total_ms: number;
    saved_pct: number;
    per_agent_ms: number;
    meta_compose_ms: number;
  };
};

type AgentMeta = {
  id: string;
  name: string;
  plain: string;
  what_it_does: string;
  cost_ms: number;
  default_weight: number | null;
  source_lines: string;
};

type SceneData = {
  scene: string;
  generated_at: string;
  spec_ref: string;
  description: string;
  agents: AgentMeta[];
  records: TaskRecord[];
};

type AgentId = 'analytical' | 'creative' | 'adversarial' | 'domain_expert' | 'meta';

const AGENT_VISUAL: Record<AgentId, { Icon: typeof Brain; accent: string; ring: string; glow: string }> = {
  analytical: {
    Icon: Brain,
    accent: 'text-accent',
    ring: 'border-accent/40',
    glow: 'shadow-[0_0_36px_-12px_hsl(var(--accent)/0.5)]',
  },
  creative: {
    Icon: Lightbulb,
    accent: 'text-accent',
    ring: 'border-accent/40',
    glow: 'shadow-[0_0_36px_-12px_hsl(var(--accent)/0.5)]',
  },
  adversarial: {
    Icon: ShieldAlert,
    accent: 'text-accent',
    ring: 'border-accent/40',
    glow: 'shadow-[0_0_36px_-12px_hsl(var(--accent)/0.5)]',
  },
  domain_expert: {
    Icon: Compass,
    accent: 'text-accent',
    ring: 'border-accent/40',
    glow: 'shadow-[0_0_36px_-12px_hsl(var(--accent)/0.5)]',
  },
  meta: {
    Icon: Scale,
    accent: 'text-accent',
    ring: 'border-accent/40',
    glow: 'shadow-[0_0_36px_-12px_hsl(var(--accent)/0.5)]',
  },
};

// Char-by-char typewriter — see playbook §8.1. Tracks all timer handles
// in a ref, parallel sr-only live region for screen readers, respects
// prefers-reduced-motion.
function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState('');
  const reducedMotion = useReducedMotion();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

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
      <span aria-hidden>
        {shown}
        {!reducedMotion && shown.length < text.length && (
          <span className="inline-block w-[0.5ch] -mb-0.5 ml-0.5 bg-primary animate-pulse">&nbsp;</span>
        )}
      </span>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {text}
      </span>
    </>
  );
}

function pickEntryIndex(records: TaskRecord[]): number {
  // Prefer the security-flag override record (task-1) as the opener —
  // visitor sees Adversarial catch something on first view.
  const idx = records.findIndex((r) => r.meta.selected_style === 'adversarial');
  return idx >= 0 ? idx : 0;
}

function ConfidenceBar({ value, label, isSelected }: { value: number; label: string; isSelected: boolean }) {
  const pct = Math.round(Math.min(100, Math.max(0, value * 100)));
  return (
    <div
      className="mt-2 h-1 w-full rounded-full bg-border/30 overflow-hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} confidence`}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className={`h-full ${isSelected ? 'bg-primary' : 'bg-accent/70'}`}
      />
    </div>
  );
}

function FlagBadge({ children, tone = 'risk' }: { children: React.ReactNode; tone?: 'risk' | 'info' }) {
  const cls = tone === 'risk'
    ? 'border-primary/60 bg-primary/10 text-primary'
    : 'border-accent/40 bg-accent/10 text-accent';
  return (
    <span className={`inline-flex items-center gap-1 rounded border ${cls} px-1.5 py-0.5 text-[10px] font-mono`}>
      <Flag className="h-2.5 w-2.5" aria-hidden />
      {children}
    </span>
  );
}

function AnalyticalCard({ verdict, isSelected, isRevealed }: { verdict: AnalyticalVerdict; isSelected: boolean; isRevealed: boolean }) {
  const conf = Math.round(verdict.confidence * 100);
  return (
    <AgentCard
      agentId="analytical"
      isSelected={isSelected}
      isRevealed={isRevealed}
      title="Analytical"
      plain="task decomposition"
      confidence={verdict.confidence}
    >
      <div className="space-y-2 text-[11px] md:text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-muted-foreground/90">assessment</span>
          <span className={`font-mono font-bold ${verdict.assessment === 'ready' ? 'text-accent' : 'text-primary'}`}>
            {verdict.assessment}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-muted-foreground/90">
          <div>verbs · <span className="text-foreground/90">{verdict.verbs.length}</span></div>
          <div>params · <span className="text-foreground/90">{verdict.parameters.length}</span></div>
          <div>missing · <span className="text-foreground/90">{verdict.completeness.missing}</span></div>
          <div>contradictions · <span className="text-foreground/90">{verdict.consistency.contradiction_count}</span></div>
        </div>
        {verdict.consistency.flags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {verdict.consistency.flags.slice(0, 3).map((f) => <FlagBadge key={f}>{f}</FlagBadge>)}
          </div>
        )}
        <div className="pt-1 font-mono text-[10px] text-muted-foreground/70">
          conf · {conf}%
        </div>
      </div>
    </AgentCard>
  );
}

function CreativeCard({ verdict, isSelected, isRevealed }: { verdict: CreativeVerdict; isSelected: boolean; isRevealed: boolean }) {
  const conf = Math.round(verdict.confidence * 100);
  const SignalRow = ({ label, value }: { label: string; value: number }) => {
    const pct = Math.round(Math.min(100, Math.max(0, value * 100)));
    return (
      <div className="space-y-1">
        <div className="flex items-baseline justify-between font-mono text-[10px]">
          <span className="text-muted-foreground/90">{label}</span>
          <span className="text-foreground/90">{pct}%</span>
        </div>
        <div
          className="h-1 w-full rounded-full bg-border/30 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Creative ${label}`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="h-full bg-accent/70"
          />
        </div>
      </div>
    );
  };
  return (
    <AgentCard
      agentId="creative"
      isSelected={isSelected}
      isRevealed={isRevealed}
      title="Creative"
      plain="lateral signals"
      confidence={verdict.confidence}
    >
      <div className="space-y-2">
        <SignalRow label="novelty" value={verdict.novelty_score} />
        <SignalRow label="reframing" value={verdict.reframing_potential} />
        <SignalRow label="cross-domain" value={verdict.cross_domain_score} />
        <div className="pt-1 font-mono text-[10px] text-muted-foreground/70">
          conf · {conf}% · bigrams · {verdict.bigram_count}
        </div>
      </div>
    </AgentCard>
  );
}

function AdversarialCard({ verdict, isSelected, isRevealed }: { verdict: AdversarialVerdict; isSelected: boolean; isRevealed: boolean }) {
  const conf = Math.round(verdict.confidence * 100);
  const risk = Math.round(verdict.risk_score * 100);
  const recColor = verdict.recommendation === 'block'
    ? 'text-primary'
    : verdict.recommendation === 'review'
    ? 'text-primary/80'
    : 'text-accent';
  return (
    <AgentCard
      agentId="adversarial"
      isSelected={isSelected}
      isRevealed={isRevealed}
      title="Adversarial"
      plain="structural risk"
      confidence={verdict.confidence}
    >
      <div className="space-y-2 text-[11px] md:text-xs">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-muted-foreground/90">recommendation</span>
          <span className={`font-mono font-bold uppercase ${recColor}`}>{verdict.recommendation}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-muted-foreground/90 text-[10px]">
          <div>risk · <span className={risk > 30 ? 'text-primary font-bold' : 'text-foreground/90'}>{risk}%</span></div>
          <div>entropy · <span className="text-foreground/90">{verdict.entropy.toFixed(2)}</span></div>
          <div>tool×· <span className="text-foreground/90">{verdict.tool_multiplier.toFixed(1)}</span></div>
          <div>flags · <span className="text-foreground/90">{verdict.risk_flags.length}</span></div>
        </div>
        {verdict.risk_flags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {verdict.risk_flags.slice(0, 3).map((f) => <FlagBadge key={f}>{f}</FlagBadge>)}
          </div>
        )}
        <div className="pt-1 font-mono text-[10px] text-muted-foreground/70">
          conf · {conf}% (1 − risk)
        </div>
      </div>
    </AgentCard>
  );
}

function DomainExpertCard({ verdict, isSelected, isRevealed }: { verdict: DomainExpertVerdict; isSelected: boolean; isRevealed: boolean }) {
  const conf = Math.round(verdict.confidence * 100);
  return (
    <AgentCard
      agentId="domain_expert"
      isSelected={isSelected}
      isRevealed={isRevealed}
      title="Domain Expert"
      plain="multi-domain taxonomy"
      confidence={verdict.confidence}
    >
      <div className="space-y-2 text-[11px] md:text-xs">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-muted-foreground/90">detected</span>
          <span className="font-mono font-bold text-foreground/90">{verdict.detected_domain}</span>
        </div>
        <div className="flex items-baseline justify-between font-mono text-[10px] text-muted-foreground/90">
          <span>primary configured</span>
          <span className="text-foreground/90">{verdict.primary_domain}</span>
        </div>
        <div className="flex items-baseline justify-between font-mono text-[10px] text-muted-foreground/90">
          <span>domains touched</span>
          <span className="text-foreground/90">{verdict.domains_touched}</span>
        </div>
        {verdict.domain_scores.length > 0 && (
          <div className="space-y-1 pt-1">
            {verdict.domain_scores.slice(0, 3).map((d) => (
              <div key={d.domain} className="flex items-baseline justify-between text-[10px] font-mono text-muted-foreground/90">
                <span>{d.domain}</span>
                <span className="text-foreground/90">{Math.round(d.score * 100)}% · {d.hits} hits</span>
              </div>
            ))}
          </div>
        )}
        {verdict.boundary_flags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {verdict.boundary_flags.slice(0, 2).map((f) => <FlagBadge key={f}>{f}</FlagBadge>)}
          </div>
        )}
        <div className="pt-1 font-mono text-[10px] text-muted-foreground/70">
          conf · {conf}%
        </div>
      </div>
    </AgentCard>
  );
}

function AgentCard({
  agentId,
  isSelected,
  isRevealed,
  title,
  plain,
  confidence,
  children,
}: {
  agentId: AgentId;
  isSelected: boolean;
  isRevealed: boolean;
  title: string;
  plain: string;
  confidence: number;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const visual = AGENT_VISUAL[agentId];
  const Icon = visual.Icon;
  return (
    <motion.div
      animate={
        reducedMotion
          ? { opacity: isRevealed ? 1 : 0.5 }
          : { opacity: isRevealed ? 1 : 0.18, scale: isSelected ? 1.01 : 1 }
      }
      transition={{ duration: 0.35, ease: 'easeOut' }}
      aria-hidden={!isRevealed}
      className={`relative rounded-lg border ${isSelected ? 'border-primary' : visual.ring} bg-card/40 backdrop-blur-sm p-4 md:p-5 ${
        isSelected ? visual.glow : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground/80'}`} aria-hidden />
            <div className={`font-bold tracking-tight text-[15px] ${isSelected ? 'text-primary' : 'text-foreground'}`}>
              {title}
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">{plain}</div>
        </div>
        {isSelected && (
          <span className="rounded border border-primary/60 bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest">
            selected
          </span>
        )}
      </div>
      {children}
      <ConfidenceBar value={confidence} label={title} isSelected={isSelected} />
    </motion.div>
  );
}

function MetaControllerCard({ record }: { record: TaskRecord }) {
  const meta = record.meta;
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="signal-panel-strong p-5 md:p-6 mt-4 md:mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" aria-hidden />
          <div className="font-bold tracking-tight text-foreground text-[15px]">Meta-controller</div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80 ml-1">
            composes
          </span>
        </div>
        <span className="rounded border border-primary/60 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest">
          → {meta.selected_style}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        {meta.ranked.map((r) => {
          const isSelected = r.style === meta.selected_style;
          const pct = Math.round(r.confidence * 100);
          return (
            <div
              key={r.style}
              className={`grid grid-cols-[140px_1fr_50px] items-center gap-3 px-3 py-2 rounded ${
                isSelected ? 'bg-primary/[0.07] border border-primary/40' : 'bg-card/30 border border-border/30'
              }`}
            >
              <div className={`font-mono text-xs ${isSelected ? 'text-primary font-bold' : 'text-foreground/80'}`}>
                {isSelected && <CornerDownRight className="inline h-3 w-3 mr-1" aria-hidden />}
                {r.style}
              </div>
              <div
                className="h-1.5 rounded-full bg-border/30 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${r.style} raw confidence`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full ${isSelected ? 'bg-primary' : 'bg-accent/60'}`}
                />
              </div>
              <div className={`font-mono text-xs text-right ${isSelected ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded border border-border/40 bg-background/40 p-3 text-[11px] md:text-xs font-mono text-muted-foreground leading-relaxed">
        <span className="text-foreground/90 font-bold">decision · </span>
        {meta.selection_reason}
      </div>
    </motion.div>
  );
}

function JourneyPanel({ record }: { record: TaskRecord }) {
  const lat = record.latency;
  // Cap at 99.9% per playbook §6.3.
  const saved = Math.min(99.9, lat.saved_pct);
  return (
    <div className="signal-panel-strong p-4 md:p-5 mb-6 md:mb-8 grid grid-cols-3 gap-3 md:gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          this task cost
        </div>
        <div className="font-mono text-xl md:text-2xl text-foreground font-bold leading-tight">
          {lat.actual_total_ms}ms
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          4 structural agents in parallel + meta
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          4-LLM ensemble would cost
        </div>
        <div className="font-mono text-xl md:text-2xl text-muted-foreground/80 line-through font-bold leading-tight">
          ~{lat.naive_total_ms}ms
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          4 × ~{Math.round(lat.naive_total_ms / 4)}ms LLM call
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          saved
        </div>
        <div className="font-mono text-xl md:text-2xl text-primary font-bold leading-tight">
          {saved.toFixed(1)}%
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          no LLM, no API bill
        </div>
      </div>
    </div>
  );
}

function AftermathPanel({ record, visible, reducedMotion }: { record: TaskRecord; visible: boolean; reducedMotion: boolean }) {
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
            What the orchestrator does with this
          </div>
          {record.aftermath && (
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-4">
              {record.aftermath}
            </p>
          )}
          {/* Surfaced flags — even when an agent didn't "win", its flags are
              recorded. Show them so the visitor sees that nothing is lost. */}
          {Object.entries(record.meta.surfaced_flags).some(([, flags]) => flags.length > 0) && (
            <div className="rounded border border-border/40 bg-background/40 p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90">
                surfaced flags — recorded regardless of winner
              </div>
              {Object.entries(record.meta.surfaced_flags).map(([style, flags]) =>
                flags.length > 0 ? (
                  <div key={style} className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-mono text-muted-foreground/80 min-w-[100px]">{style}:</span>
                    <div className="flex flex-wrap gap-1">
                      {flags.map((f) => <FlagBadge key={f} tone={style === 'adversarial' ? 'risk' : 'info'}>{f}</FlagBadge>)}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CognitiveAgents({ data }: { data: SceneData }) {
  const reducedMotion = useReducedMotion();
  const entryIdx = useMemo(() => pickEntryIndex(data.records), [data.records]);
  const [activeIdx, setActiveIdx] = useState(entryIdx);
  const [beatIdx, setBeatIdx] = useState(0);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [hasInteracted, setHasInteracted] = useState(false);

  const noRecords = data.records.length === 0;
  const safeActiveIdx = noRecords ? 0 : Math.min(Math.max(0, activeIdx), data.records.length - 1);
  const record = noRecords ? null : data.records[safeActiveIdx];
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

  // Which agents have been "revealed" so far in this record.
  const revealedAgents = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i <= beatIdx; i++) {
      const t = beats[i]?.target_agent;
      if (t) set.add(t);
    }
    // If meta is revealed, all four agents are revealed (the meta only
    // makes sense after all four have run).
    if (set.has('meta')) {
      set.add('analytical');
      set.add('creative');
      set.add('adversarial');
      set.add('domain_expert');
    }
    return set;
  }, [beatIdx, beats]);

  const activeAgentId = activeBeat?.target_agent ?? null;
  const isIntroBeat = activeBeat?.target_agent === null;
  const metaRevealed = revealedAgents.has('meta');

  if (noRecords || !record) {
    return (
      <div className="signal-panel-strong p-5 text-sm text-muted-foreground">
        No scenarios available.
      </div>
    );
  }

  const selectedStyle = record.meta.selected_style;
  return (
    <div className="relative">
      {/* Task content + summary */}
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
              Task · index {record.step_index}
            </div>
            <div className="font-mono text-[10px] md:text-xs text-muted-foreground/80">
              {record.step_id} · primary domain · {record.primary_domain}
            </div>
          </div>
        </div>
        <p className="text-base md:text-xl leading-relaxed font-serif italic text-foreground break-words">
          &ldquo;{record.task_description}&rdquo;
        </p>
        {record.summary && (
          <p className="mt-4 text-xs md:text-sm text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-3 md:pl-4">
            {record.summary}
          </p>
        )}
      </motion.div>

      {/* Narration block */}
      <div className="signal-panel-strong p-5 md:p-7 mb-6 md:mb-8 min-h-[180px] md:min-h-[160px] relative">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Walkthrough · beat {beatIdx + 1} of {beats.length}
            {isIntroBeat && (
              <span className="ml-2 text-primary/80 font-mono normal-case tracking-normal">intro</span>
            )}
            {!isIntroBeat && activeAgentId && (
              <span className="ml-2 text-primary/80 font-mono normal-case tracking-normal">
                → {activeAgentId}
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

        <div className="text-base md:text-lg leading-relaxed text-foreground/95 font-serif min-h-[5rem] md:min-h-[5rem]">
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

      {/* 4-agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <AnalyticalCard
          verdict={record.verdicts.analytical}
          isSelected={selectedStyle === 'analytical' && metaRevealed}
          isRevealed={revealedAgents.has('analytical')}
        />
        <CreativeCard
          verdict={record.verdicts.creative}
          isSelected={selectedStyle === 'creative' && metaRevealed}
          isRevealed={revealedAgents.has('creative')}
        />
        <AdversarialCard
          verdict={record.verdicts.adversarial}
          isSelected={selectedStyle === 'adversarial' && metaRevealed}
          isRevealed={revealedAgents.has('adversarial')}
        />
        <DomainExpertCard
          verdict={record.verdicts.domain_expert}
          isSelected={selectedStyle === 'domain_expert' && metaRevealed}
          isRevealed={revealedAgents.has('domain_expert')}
        />
      </div>

      {/* Meta-controller — revealed when its beat plays. */}
      {metaRevealed && <MetaControllerCard record={record} />}

      {/* Aftermath — what the orchestrator does next. */}
      <AftermathPanel
        key={`aftermath-${record.step_id}`}
        record={record}
        visible={metaRevealed}
        reducedMotion={Boolean(reducedMotion)}
      />

      <div className="mt-8 md:mt-10">
        <JourneyPanel record={record} />
      </div>

      {/* Record scrubber */}
      <div className="mt-6 md:mt-8">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Try a different task · {data.records.length} scenarios
        </div>
        <div role="radiogroup" aria-label="Task scenarios" className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {data.records.map((r, idx) => {
            const isActive = idx === safeActiveIdx;
            const sel = r.meta.selected_style;
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
                  task {r.step_index}
                </span>
                <span className="text-xs md:text-sm text-foreground/90 leading-tight line-clamp-2">
                  {r.task_description.slice(0, 60)}
                  {r.task_description.length > 60 ? '…' : ''}
                </span>
                <span className={`text-[10px] font-mono mt-1 flex items-center gap-1 text-primary`}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  → {sel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
