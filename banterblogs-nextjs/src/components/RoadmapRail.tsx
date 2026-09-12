import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { PHASE_DEFINITIONS, phaseRangeLabel } from '@/lib/reports/phases';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

// Derived from the single PHASE_DEFINITIONS source so phase renames and additions
// land on the homepage without a second edit. Brief label drops the TR range
// (which is shown separately as the `range` field) for a cleaner card heading.
// Filter to phases with a conclusive whitepaper — Phase 0 baselines predate TR
// numbering, and the in-flight phases (7 Mitigation Turn, 8 Serving-Stack Isolation)
// have no synthesis yet; all live in the /reports archive, not the homepage lane.
const highlights = PHASE_DEFINITIONS.filter((p) => p.minTR !== undefined && p.hasWhitepaper).map((p) => ({
  label: p.label.split(' (')[0], // "Phase 1 — Foundation"
  range: phaseRangeLabel(p.key),
  summary: p.featuredSummary,
}));

export function RoadmapRail() {
  return (
    <section className="container pb-20 pt-10 md:pb-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80 font-semibold">
          Research Program
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight display">
          {MEASUREMENTS.DISPLAY} measurements across {REPORTS.DISPLAY} technical reports
        </h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed mx-auto">
          Independent ML research with CUDA event timing and controlled safety evaluations.
          Every claim is backed by data, every optimization is measured.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {highlights.map((phase) => (
          <div key={phase.label} className="rounded-xl border border-border/40 bg-card/40 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {phase.range}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{phase.label}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{phase.summary}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold text-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard hover:border-primary/60 hover:text-primary motion-safe:active:scale-[0.98]"
        >
          Browse the research archive
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
