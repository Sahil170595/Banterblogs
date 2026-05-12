'use client';

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
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
  ShieldCheck,
} from 'lucide-react';

type AnalyticalVerdict = {
  style: 'analytical';
  analysis_type: string;
  confidence: number;
  verbs: string[];
  parameters: string[];
  complexity: { nesting_depth: number; word_count: number; ambiguity: number };
  completeness: { expected: number; provided: number; missing: number; score: number };
  consistency: { flags: string[]; contradiction_count: number };
  assessment: string;
};
type CreativeVerdict = {
  style: 'creative';
  analysis_type: string;
  confidence: number;
  novelty_score: number;
  reframing_potential: number;
  cross_domain_score: number;
  bigram_count: number;
  memory_entries_compared: number;
};
type AdversarialVerdict = {
  style: 'adversarial';
  analysis_type: string;
  confidence: number;
  risk_score: number;
  entropy: number;
  risk_flags: string[];
  recommendation: string;
  tool_multiplier: number;
};
type DomainExpertVerdict = {
  style: 'domain_expert';
  analysis_type: string;
  confidence: number;
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

// Per-agent visual register. Each agent gets its own color temperature
// so the four cards read as four genuinely different cognitive paths
// at TikTok scroll speed — not "four identical orange dashboard tiles."
// When an agent is SELECTED the card flips to ember (primary) so the
// selection signal still dominates.
const AGENT_VISUAL: Record<AgentId, { Icon: typeof Brain; tint: string; ring: string; icon: string }> = {
  analytical: {
    Icon: Brain,
    tint: 'slate',
    ring: 'border-slate-400/30',
    icon: 'text-slate-300/90',
  },
  creative: {
    Icon: Lightbulb,
    tint: 'amber',
    ring: 'border-amber-400/30',
    icon: 'text-amber-300/90',
  },
  adversarial: {
    Icon: ShieldAlert,
    tint: 'rose',
    ring: 'border-rose-400/30',
    icon: 'text-rose-300/90',
  },
  domain_expert: {
    Icon: Compass,
    tint: 'cyan',
    ring: 'border-cyan-400/30',
    icon: 'text-cyan-300/90',
  },
  meta: {
    Icon: Scale,
    tint: 'ember',
    ring: 'border-primary/40',
    icon: 'text-primary',
  },
};

// Char-by-char typewriter. All timer handles tracked in a ref; a
// parallel sr-only live region carries the full text so screen readers
// announce once. Respects prefers-reduced-motion via prop.
function Typewriter({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  const [shown, setShown] = useState('');
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
  const idx = records.findIndex((r) => r.meta.selected_style === 'adversarial');
  return idx >= 0 ? idx : 0;
}

function ConfidenceBar({
  value,
  label,
  isSelected,
  reducedMotion,
}: {
  value: number;
  label: string;
  isSelected: boolean;
  reducedMotion: boolean;
}) {
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
        initial={reducedMotion ? { width: `${pct}%` } : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className={`h-full ${isSelected ? 'bg-primary' : 'bg-accent/70'}`}
      />
    </div>
  );
}

// Extracted to module scope (was defined inside CreativeCard render
// body; that created a new component identity per render and
// re-animated the bars on every beat tick).
function SignalRow({
  label,
  value,
  agentLabel,
  reducedMotion,
}: {
  label: string;
  value: number;
  agentLabel: string;
  reducedMotion: boolean;
}) {
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
        aria-label={`${agentLabel} ${label}`}
      >
        <motion.div
          initial={reducedMotion ? { width: `${pct}%` } : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-accent/70"
        />
      </div>
    </div>
  );
}

function FlagBadge({ children, tone = 'risk' }: { children: React.ReactNode; tone?: 'risk' | 'info' }) {
  const cls = tone === 'risk'
    ? 'border-primary/60 bg-primary/10 text-primary'
    : 'border-accent/40 bg-accent/10 text-accent';
  return (
    <span className={`inline-flex items-center gap-1 rounded border ${cls} px-1.5 py-0.5 text-[11px] font-mono`}>
      <Flag className="h-2.5 w-2.5" aria-hidden />
      {children}
    </span>
  );
}

function AnalyticalCard({
  verdict,
  isSelected,
  isRevealed,
  reducedMotion,
}: {
  verdict: AnalyticalVerdict;
  isSelected: boolean;
  isRevealed: boolean;
  reducedMotion: boolean;
}) {
  const conf = Math.round(verdict.confidence * 100);
  return (
    <AgentCard
      agentId="analytical"
      isSelected={isSelected}
      isRevealed={isRevealed}
      reducedMotion={reducedMotion}
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
            {verdict.consistency.flags.slice(0, 3).map((f, i) => (
              <FlagBadge key={`${f}-${i}`}>{f}</FlagBadge>
            ))}
          </div>
        )}
        <div className="pt-1 font-mono text-[10px] text-muted-foreground/70">
          conf · {conf}%
        </div>
      </div>
    </AgentCard>
  );
}

function CreativeCard({
  verdict,
  isSelected,
  isRevealed,
  reducedMotion,
}: {
  verdict: CreativeVerdict;
  isSelected: boolean;
  isRevealed: boolean;
  reducedMotion: boolean;
}) {
  const conf = Math.round(verdict.confidence * 100);
  return (
    <AgentCard
      agentId="creative"
      isSelected={isSelected}
      isRevealed={isRevealed}
      reducedMotion={reducedMotion}
      title="Creative"
      plain="lateral signals"
      confidence={verdict.confidence}
    >
      <div className="space-y-2">
        <SignalRow label="novelty" value={verdict.novelty_score} agentLabel="Creative" reducedMotion={reducedMotion} />
        <SignalRow label="reframing" value={verdict.reframing_potential} agentLabel="Creative" reducedMotion={reducedMotion} />
        <SignalRow label="cross-domain" value={verdict.cross_domain_score} agentLabel="Creative" reducedMotion={reducedMotion} />
        <div className="pt-1 font-mono text-[10px] text-muted-foreground/70">
          conf · {conf}% · bigrams · {verdict.bigram_count}
        </div>
      </div>
    </AgentCard>
  );
}

function AdversarialCard({
  verdict,
  isSelected,
  isRevealed,
  reducedMotion,
}: {
  verdict: AdversarialVerdict;
  isSelected: boolean;
  isRevealed: boolean;
  reducedMotion: boolean;
}) {
  const conf = Math.round(verdict.confidence * 100);
  const risk = Math.round(verdict.risk_score * 100);
  const recColor =
    verdict.recommendation === 'block'
      ? 'text-primary'
      : verdict.recommendation === 'review'
      ? 'text-primary/80'
      : 'text-accent';
  return (
    <AgentCard
      agentId="adversarial"
      isSelected={isSelected}
      isRevealed={isRevealed}
      reducedMotion={reducedMotion}
      title="Adversarial"
      plain="structural risk"
      confidence={verdict.confidence}
    >
      <div className="space-y-2 text-[11px] md:text-xs">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-muted-foreground/90">recommendation</span>
          <span className={`font-mono font-bold uppercase ${recColor}`}>{verdict.recommendation}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-muted-foreground/90 text-[11px]">
          <div>risk · <span className={risk > 30 ? 'text-primary font-bold' : 'text-foreground/90'}>{risk}%</span></div>
          <div>entropy · <span className="text-foreground/90">{verdict.entropy.toFixed(2)}</span></div>
          <div>tool×· <span className="text-foreground/90">{verdict.tool_multiplier.toFixed(1)}</span></div>
          <div>flags · <span className="text-foreground/90">{verdict.risk_flags.length}</span></div>
        </div>
        {verdict.risk_flags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {verdict.risk_flags.slice(0, 3).map((f, i) => (
              <FlagBadge key={`${f}-${i}`}>{f}</FlagBadge>
            ))}
          </div>
        )}
        <div className="pt-1 font-mono text-[10px] text-muted-foreground/70">
          conf · {conf}% (1 − risk)
        </div>
      </div>
    </AgentCard>
  );
}

function DomainExpertCard({
  verdict,
  isSelected,
  isRevealed,
  reducedMotion,
}: {
  verdict: DomainExpertVerdict;
  isSelected: boolean;
  isRevealed: boolean;
  reducedMotion: boolean;
}) {
  const conf = Math.round(verdict.confidence * 100);
  return (
    <AgentCard
      agentId="domain_expert"
      isSelected={isSelected}
      isRevealed={isRevealed}
      reducedMotion={reducedMotion}
      title="Domain Expert"
      plain="multi-domain taxonomy"
      confidence={verdict.confidence}
    >
      <div className="space-y-2 text-[11px] md:text-xs">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-muted-foreground/90">detected</span>
          <span className="font-mono font-bold text-foreground/90">{verdict.detected_domain}</span>
        </div>
        <div className="flex items-baseline justify-between font-mono text-[11px] text-muted-foreground/90">
          <span>primary configured</span>
          <span className="text-foreground/90">{verdict.primary_domain}</span>
        </div>
        <div className="flex items-baseline justify-between font-mono text-[11px] text-muted-foreground/90">
          <span>domains touched</span>
          <span className="text-foreground/90">{verdict.domains_touched}</span>
        </div>
        {verdict.domain_scores.length > 0 && (
          <div className="space-y-1 pt-1">
            {verdict.domain_scores.slice(0, 3).map((d) => (
              <div key={d.domain} className="flex items-baseline justify-between text-[11px] font-mono text-muted-foreground/90">
                <span>{d.domain}</span>
                <span className="text-foreground/90">{Math.round(d.score * 100)}% · {d.hits} hits</span>
              </div>
            ))}
          </div>
        )}
        {verdict.boundary_flags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {verdict.boundary_flags.slice(0, 2).map((f, i) => (
              <FlagBadge key={`${f}-${i}`}>{f}</FlagBadge>
            ))}
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
  reducedMotion,
  title,
  plain,
  confidence,
  children,
}: {
  agentId: AgentId;
  isSelected: boolean;
  isRevealed: boolean;
  reducedMotion: boolean;
  title: string;
  plain: string;
  confidence: number;
  children: React.ReactNode;
}) {
  const visual = AGENT_VISUAL[agentId];
  const Icon = visual.Icon;
  return (
    <motion.div
      animate={
        reducedMotion
          ? { opacity: isRevealed ? 1 : 0.5 }
          : { opacity: isRevealed ? 1 : 0.18, scale: isSelected ? 1.03 : 1 }
      }
      transition={{ duration: 0.35, ease: 'easeOut' }}
      aria-hidden={!isRevealed}
      className={`relative rounded-lg border ${
        isSelected
          ? 'border-primary shadow-[0_0_44px_-10px_hsl(var(--primary)/0.6)]'
          : visual.ring
      } bg-card/40 backdrop-blur-sm p-4 md:p-5`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : visual.icon}`} aria-hidden />
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
      <ConfidenceBar value={confidence} label={title} isSelected={isSelected} reducedMotion={reducedMotion} />
    </motion.div>
  );
}

function MetaControllerCard({
  record,
  reducedMotion,
}: {
  record: TaskRecord;
  reducedMotion: boolean;
}) {
  const meta = record.meta;
  // Was a flag-priority override what selected this agent?
  const isOverride = /override|flagged|boundary/i.test(meta.selection_reason);
  const DecisionIcon = isOverride ? ShieldCheck : CornerDownRight;

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
        <span
          className="rounded border border-primary/60 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest"
          aria-label={`Selected agent: ${meta.selected_style}${isOverride ? ' (via flag override)' : ''}`}
        >
          <span aria-hidden>→ </span>
          {meta.selected_style}
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
              <div className={`font-mono text-xs flex items-center gap-1 ${isSelected ? 'text-primary font-bold' : 'text-foreground/80'}`}>
                {isSelected && <DecisionIcon className="h-3 w-3" aria-hidden />}
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
                  initial={reducedMotion ? { width: `${pct}%` } : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
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
      <div className="rounded border border-border/40 bg-background/40 p-3 text-[11px] md:text-xs font-mono text-muted-foreground leading-relaxed flex items-start gap-2">
        <DecisionIcon
          className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isOverride ? 'text-primary' : 'text-accent'}`}
          aria-hidden
        />
        <span>
          <span className="text-foreground/90 font-bold">decision · </span>
          {meta.selection_reason}
        </span>
      </div>
    </motion.div>
  );
}

function JourneyPanel({ record, agentCount }: { record: TaskRecord; agentCount: number }) {
  const lat = record.latency;
  const saved = Math.min(99.9, lat.saved_pct);
  const perAgentMs = Math.round(lat.naive_total_ms / Math.max(1, agentCount));
  return (
    <div className="signal-panel-strong p-4 md:p-6 mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr] gap-4 md:gap-6 items-baseline">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          this task cost
        </div>
        <div className="font-mono text-xl md:text-2xl text-foreground font-bold leading-tight">
          {lat.actual_total_ms}ms
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {agentCount} structural agents in parallel + meta
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mb-1">
          4-LLM ensemble would cost
        </div>
        <div
          className="font-mono text-lg md:text-xl text-muted-foreground/70 line-through font-bold leading-tight"
          aria-label={`Naive 4-LLM ensemble cost: approximately ${lat.naive_total_ms} milliseconds, shown as crossed-out comparison`}
        >
          ~{lat.naive_total_ms}ms
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {agentCount} × ~{perAgentMs}ms LLM call
        </div>
      </div>
      {/* Saved % — emphasized as the proof claim, not flattened to a peer
          column. ~2× larger than the comparison numbers. */}
      <div className="md:border-l md:border-border/30 md:pl-6">
        <div className="text-[10px] uppercase tracking-widest text-primary/90 mb-1">
          saved
        </div>
        <div className="font-mono text-4xl md:text-5xl text-primary font-bold leading-none tracking-tight">
          {saved.toFixed(1)}%
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">
          no LLM, no API bill
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
  record: TaskRecord;
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
            What the orchestrator does with this
          </div>
          {record.aftermath && (
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-4">
              {record.aftermath}
            </p>
          )}
          {Object.values(record.meta.surfaced_flags).some((flags) => flags.length > 0) && (
            <div className="rounded border border-border/40 bg-background/40 p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/90">
                surfaced flags — recorded regardless of winner
              </div>
              {Object.entries(record.meta.surfaced_flags).map(([style, flags]) =>
                flags.length > 0 ? (
                  <div key={style} className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-mono text-muted-foreground/80 min-w-[100px]">{style}:</span>
                    <div className="flex flex-wrap gap-1">
                      {flags.map((f, i) => (
                        <FlagBadge key={`${f}-${i}`} tone={style === 'adversarial' ? 'risk' : 'info'}>
                          {f}
                        </FlagBadge>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CognitiveAgents({ data }: { data: SceneData }) {
  // useReducedMotion can return null pre-hydration. We snapshot to a
  // boolean here and treat null as "prefer reduced" to fail safe.
  const rawReducedMotion = useReducedMotion();
  const reducedMotion = rawReducedMotion ?? false;

  const entryIdx = useMemo(() => pickEntryIndex(data.records), [data.records]);
  const [activeIdx, setActiveIdx] = useState(entryIdx);
  const [beatIdx, setBeatIdx] = useState(0);
  // Initialize playing to false; flip to true after first paint if
  // motion is allowed. Avoids the SSR/hydration mismatch where
  // useReducedMotion returns null on first render then resolves.
  const [playing, setPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  useLayoutEffect(() => {
    if (rawReducedMotion === false) setPlaying(true);
  }, [rawReducedMotion]);

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

  // Roving-tabindex arrow-key handler for the task scrubber radiogroup.
  const handleScrubberKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (noRecords) return;
      let next: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (safeActiveIdx + 1) % data.records.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (safeActiveIdx - 1 + data.records.length) % data.records.length;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = data.records.length - 1;
      }
      if (next !== null) {
        e.preventDefault();
        selectRecord(next);
      }
    },
    [data.records.length, safeActiveIdx, selectRecord, noRecords],
  );

  const revealedAgents = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i <= beatIdx; i++) {
      const t = beats[i]?.target_agent;
      if (t) set.add(t);
    }
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

  // Polite live region — announces when a new agent reveals so screen
  // reader users hear "Adversarial agent revealed" rather than missing
  // the progressive disclosure entirely.
  const lastRevealedAgent = useMemo(() => {
    const target = activeBeat?.target_agent;
    if (!target || target === 'meta') return '';
    const verdict = record?.verdicts[target as keyof typeof record.verdicts];
    if (!verdict) return '';
    return `${target.replace('_', ' ')} agent revealed`;
  }, [activeBeat, record]);

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
      {/* Polite live region for progressive reveals. */}
      <div role="status" aria-live="polite" className="sr-only">
        {lastRevealedAgent}
      </div>

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
              Scenario {record.step_index + 1} of {data.records.length}
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

      {/* Narration */}
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
              <Typewriter text={activeBeat?.copy ?? ''} reducedMotion={reducedMotion} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Beat scrubber — radiogroup pattern, not tab pattern (no
            associated panels). Uses arrow keys for navigation. */}
        <div
          className="mt-4 flex gap-0.5 flex-wrap"
          role="radiogroup"
          aria-label="Beat selector"
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

      {/* 4-agent grid — each agent has its own visual register. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <AnalyticalCard
          verdict={record.verdicts.analytical}
          isSelected={selectedStyle === 'analytical' && metaRevealed}
          isRevealed={revealedAgents.has('analytical')}
          reducedMotion={reducedMotion}
        />
        <CreativeCard
          verdict={record.verdicts.creative}
          isSelected={selectedStyle === 'creative' && metaRevealed}
          isRevealed={revealedAgents.has('creative')}
          reducedMotion={reducedMotion}
        />
        <AdversarialCard
          verdict={record.verdicts.adversarial}
          isSelected={selectedStyle === 'adversarial' && metaRevealed}
          isRevealed={revealedAgents.has('adversarial')}
          reducedMotion={reducedMotion}
        />
        <DomainExpertCard
          verdict={record.verdicts.domain_expert}
          isSelected={selectedStyle === 'domain_expert' && metaRevealed}
          isRevealed={revealedAgents.has('domain_expert')}
          reducedMotion={reducedMotion}
        />
      </div>

      {metaRevealed && (
        <MetaControllerCard record={record} reducedMotion={reducedMotion} />
      )}

      <AftermathPanel
        key={`aftermath-${record.step_id}`}
        record={record}
        visible={metaRevealed}
        reducedMotion={reducedMotion}
      />

      <div className="mt-8 md:mt-10">
        <JourneyPanel record={record} agentCount={4} />
      </div>

      {/* Task scrubber — radiogroup with arrow-key roving tabindex. */}
      <div className="mt-6 md:mt-8">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Try a different task · {data.records.length} scenarios
        </div>
        <div
          role="radiogroup"
          aria-label="Task scenarios"
          className="grid grid-cols-2 md:grid-cols-5 gap-2"
          onKeyDown={handleScrubberKey}
        >
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
                  scenario {r.step_index + 1}
                </span>
                <span className="text-xs md:text-sm text-foreground/90 leading-tight line-clamp-2">
                  {r.task_description}
                </span>
                <span className="text-[10px] font-mono mt-1 flex items-center gap-1 text-primary">
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
