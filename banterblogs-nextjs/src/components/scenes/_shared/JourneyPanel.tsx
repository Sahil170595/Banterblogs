'use client';

/**
 * Three-column "actual vs naive vs saved" cost panel.
 *
 * Used by scenes to surface the production-cost-vs-naive-baseline
 * payoff claim. The third column ("saved %") is visually weighted as
 * the dominant element — that's the proof claim of every scene.
 *
 * `naive_aria_label` is required for accessibility — screen readers
 * don't convey strikethrough, so we explicitly describe the value as
 * "shown as crossed-out comparison."
 *
 * Caps displayed saved% at 99.9% (playbook §6.3 — 100% saved reads as
 * a gamed metric).
 */
export function JourneyPanel({
  actualLabel,
  actualValue,
  actualSublabel,
  naiveLabel,
  naiveValue,
  naiveSublabel,
  naive_aria_label,
  savedPct,
  savedLabel = 'saved',
  savedSublabel,
}: {
  actualLabel: string;
  actualValue: string;
  actualSublabel: string;
  naiveLabel: string;
  naiveValue: string;
  naiveSublabel: string;
  naive_aria_label: string;
  savedPct: number;
  savedLabel?: string;
  savedSublabel: string;
}) {
  const saved = Math.min(99.9, savedPct);
  return (
    <div className="signal-panel-strong p-5 md:p-7 mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.6fr] gap-4 md:gap-6 items-baseline">
      <div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">
          {actualLabel}
        </div>
        <div className="font-mono text-2xl md:text-3xl text-foreground font-bold leading-tight">
          {actualValue}
        </div>
        <div className="text-[10px] text-muted-foreground/80 mt-1.5">{actualSublabel}</div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">
          {naiveLabel}
        </div>
        <div
          className="font-mono text-xl md:text-2xl text-muted-foreground/70 line-through font-bold leading-tight"
          aria-label={naive_aria_label}
        >
          {naiveValue}
        </div>
        <div className="text-[10px] text-muted-foreground/80 mt-1.5">{naiveSublabel}</div>
      </div>
      <div className="md:border-l md:border-border/30 md:pl-6">
        <div className="text-[10px] uppercase tracking-widest text-primary/90 mb-1.5">
          {savedLabel}
        </div>
        <div className="font-mono text-5xl md:text-6xl text-primary font-bold leading-none tracking-tight">
          {saved.toFixed(1)}%
        </div>
        <div className="text-[10px] text-muted-foreground/80 mt-2">{savedSublabel}</div>
      </div>
    </div>
  );
}
