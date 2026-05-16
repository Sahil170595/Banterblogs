'use client';

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
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
    is_flag_override: boolean;
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

// Per-agent visual register. `ring` / `icon` are the IDLE tints; when
// SELECTED the agent flips to ember (primary). Adversarial's rose idle
// state would visually merge with the ember selected state (warm-on-
// warm), so Adversarial gets a special-case neutral icon when selected
// — handled in AgentCard via the `isSelected` branch.
const AGENT_VISUAL: Record<AgentId, { Icon: typeof Brain; ring: string; icon: string }> = {
  analytical: {
    Icon: Brain,
    ring: 'border-slate-400/30',
    icon: 'text-slate-300/90',
  },
  creative: {
    Icon: Lightbulb,
    ring: 'border-amber-400/30',
    icon: 'text-amber-300/90',
  },
  adversarial: {
    Icon: ShieldAlert,
    ring: 'border-rose-400/30',
    icon: 'text-rose-300/90',
  },
  domain_expert: {
    Icon: Compass,
    ring: 'border-cyan-400/30',
    icon: 'text-cyan-300/90',
  },
  meta: {
    Icon: Scale,
    ring: 'border-primary/40',
    icon: 'text-primary',
  },
};

// Char-by-char typewriter. Pace ~9ms/char (halved from v2's 18ms — TikTok-
// conditioned attention bounces at ~3 seconds otherwise). Single
// in-flight timer handle. Respects prefers-reduced-motion.
function Typewriter({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  const [shown, setShown] = useState('');
  // D2 fix: single handle, not an unbounded array. Only one timer is
  // ever pending at a time per tick().
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
      const delay = ch === '.' || ch === '?' || ch === '!' ? 110 : ch === ',' || ch === ';' ? 55 : 9;
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

  // C6 fix: the sr-only live region used to live HERE (inside the
  // Typewriter, which is wrapped in AnimatePresence in the parent). On
  // every beat the motion.div unmounted and remounted the live region,
  // so announcements stopped firing after beat 1. The live region is
  // now hoisted up to the main component body where it persists.
  return (
    <span aria-hidden>
      {shown}
      {!reducedMotion && shown.length < text.length && (
        <span className="inline-block w-[0.5ch] -mb-0.5 ml-0.5 bg-primary animate-pulse">&nbsp;</span>
      )}
    </span>
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

function FlagBadge({ children, tone = 'risk' }: { children: ReactNode; tone?: 'risk' | 'info' }) {
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
  children: ReactNode;
}) {
  const visual = AGENT_VISUAL[agentId];
  const Icon = visual.Icon;
  // C8 fix: when Adversarial is the selected agent, suppress its rose
  // tint on the icon so the ember selected-state doesn't visually merge
  // with the warm-red idle tint. The other three agents have cool tints
  // (slate/amber/cyan) that contrast cleanly with ember.
  const iconClass = isSelected ? 'text-primary' : visual.icon;
  return (
    <motion.div
      animate={
        reducedMotion
          ? { opacity: isRevealed ? 1 : 0.5 }
          : { opacity: isRevealed ? 1 : 0.18, scale: isSelected ? 1.03 : 1 }
      }
      transition={{ duration: 0.35, ease: 'easeOut' }}
      aria-hidden={!isRevealed}
      // D19 fix: announce the selection state to screen readers.
      aria-label={isSelected ? `${title} agent, selected by the meta-controller` : undefined}
      className={`relative rounded-lg border ${
        isSelected
          ? 'border-primary shadow-[0_0_44px_-10px_hsl(var(--primary)/0.6)]'
          : visual.ring
      } bg-card/40 backdrop-blur-sm p-4 md:p-5`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden />
            <div className={`font-bold tracking-tight text-[15px] ${isSelected ? 'text-primary' : 'text-foreground'}`}>
              {title}
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">{plain}</div>
        </div>
        {isSelected && (
          // D11 fix: badge bumped from text-[9px] to text-[11px].
          <span className="rounded border border-primary/60 bg-primary/15 text-primary px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-widest">
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
  // D6 fix: use the typed boolean from the JSON, not a regex on free text.
  const isOverride = meta.is_flag_override === true;
  const DecisionIcon = isOverride ? ShieldCheck : CornerDownRight;

  return (
    <motion.div
      initial={false}
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
  // D4 fix: use the precomputed per-agent value from the data, not
  // a derived guess.
  const perAgentMs = Math.round(lat.naive_total_ms / Math.max(1, agentCount));
  return (
    <div className="signal-panel-strong p-5 md:p-7 mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.6fr] gap-4 md:gap-6 items-baseline">
      <div>
        {/* D12 fix: smaller, lighter sub-labels so the dominant number
            in each column is the actual content, not the label. */}
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">
          this task cost
        </div>
        <div className="font-mono text-2xl md:text-3xl text-foreground font-bold leading-tight">
          {lat.actual_total_ms}ms
        </div>
        <div className="text-[10px] text-muted-foreground/80 mt-1.5">
          {agentCount} structural agents in parallel + meta
        </div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">
          {agentCount}-LLM ensemble would cost
        </div>
        <div
          className="font-mono text-xl md:text-2xl text-muted-foreground/70 line-through font-bold leading-tight"
          aria-label={`${agentCount}-LLM ensemble running in parallel would cost approximately ${lat.naive_total_ms} milliseconds wall-clock, shown as crossed-out comparison`}
        >
          ~{lat.naive_total_ms}ms
        </div>
        <div className="text-[10px] text-muted-foreground/80 mt-1.5">
          parallel LLM calls, ~{perAgentMs}ms each
        </div>
      </div>
      <div className="md:border-l md:border-border/30 md:pl-6">
        <div className="text-[10px] uppercase tracking-widest text-primary/90 mb-1.5">
          saved
        </div>
        <div className="font-mono text-5xl md:text-6xl text-primary font-bold leading-none tracking-tight">
          {saved.toFixed(1)}%
        </div>
        <div className="text-[10px] text-muted-foreground/80 mt-2">
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
          initial={false}
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
  // SSR-safe useReducedMotion bridge — matches scenes 03/04/05.
  // useReducedMotion() returns null on the server and the actual
  // matchMedia value synchronously on the client, so reading it
  // directly produces different `reducedMotion` values between
  // SSR and client first paint → React #418 hydration mismatch on
  // every motion.* prop downstream. Bridge through useState so
  // both renders start with `true` (motion OFF), then flip via
  // useEffect after mount when the client value is known. Server
  // renders without initial style attrs; client re-renders with
  // motion enabled post-hydration.
  const rawReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    setReducedMotion(rawReducedMotion ?? false);
  }, [rawReducedMotion]);

  // D5 fix: lazy-initialize via useState callback. useMemo here was
  // overkill for a one-shot computation on stable input.
  const [activeIdx, setActiveIdx] = useState(() => pickEntryIndex(data.records));
  const [beatIdx, setBeatIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  useLayoutEffect(() => {
    if (rawReducedMotion === false) setPlaying(true);
  }, [rawReducedMotion]);

  const noRecords = data.records.length === 0;
  const safeActiveIdx = noRecords ? 0 : Math.min(Math.max(0, activeIdx), data.records.length - 1);
  const record: TaskRecord | null = noRecords ? null : data.records[safeActiveIdx];
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

  // Roving-tabindex arrow-key handler factory.
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

  // C5 fix: beat scrubber gets arrow-key navigation too.
  const handleBeatKey = useMemo(
    () =>
      handleArrowKeys(beatIdx, beats.length, (idx) => {
        setBeatIdx(idx);
        setHasInteracted(true);
      }),
    [handleArrowKeys, beatIdx, beats.length],
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

  // D25 fix: dedupe agent-reveal announcements. Only fire when an
  // agent FIRST appears in the revealed set on this beat — not on
  // every beat that targets the same agent.
  const lastRevealedAgentRef = useRef<string>('');
  const [revealAnnouncement, setRevealAnnouncement] = useState('');
  useEffect(() => {
    const target = activeBeat?.target_agent;
    if (!target || target === 'meta') return;
    if (lastRevealedAgentRef.current === target) return;
    lastRevealedAgentRef.current = target;
    setRevealAnnouncement(`${target.replace('_', ' ')} agent revealed`);
  }, [activeBeat]);

  // D22 fix: announce aftermath panel reveal once.
  const [aftermathAnnouncement, setAftermathAnnouncement] = useState('');
  useEffect(() => {
    if (metaRevealed) {
      setAftermathAnnouncement(`Verdict and aftermath available: ${record?.meta.selected_style ?? ''}`);
    } else {
      setAftermathAnnouncement('');
    }
  }, [metaRevealed, record]);

  // Reset reveal-tracking when record switches.
  useEffect(() => {
    lastRevealedAgentRef.current = '';
    setRevealAnnouncement('');
    setAftermathAnnouncement('');
  }, [safeActiveIdx]);

  if (noRecords || !record) {
    return (
      <div className="signal-panel-strong p-5 text-sm text-muted-foreground">
        No scenarios available.
      </div>
    );
  }

  const selectedStyle = record.meta.selected_style;
  return (
    <div className="relative" id="demo">
      {/* C6 fix: persistent sr-only live regions OUTSIDE AnimatePresence.
          Updated via state so they survive every beat transition. */}
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {activeBeat?.copy ?? ''}
      </span>
      <span aria-live="polite" className="sr-only">
        {revealAnnouncement}
      </span>
      <span aria-live="polite" className="sr-only">
        {aftermathAnnouncement}
      </span>

      {/* Task content + summary */}
      <motion.div
        key={`content-${record.step_id}`}
        initial={false}
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
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <Typewriter text={activeBeat?.copy ?? ''} reducedMotion={reducedMotion} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* C5 fix: beat scrubber gets arrow-key handler too. */}
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
        {/* D3 fix: agentCount derived from data instead of hardcoded. */}
        <JourneyPanel record={record} agentCount={data.agents.filter((a) => a.id !== 'meta').length} />
      </div>

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
                aria-label={`Scenario ${r.step_index + 1}: ${r.task_description.slice(0, 80)}${r.task_description.length > 80 ? '…' : ''} (selected by ${sel})`}
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
