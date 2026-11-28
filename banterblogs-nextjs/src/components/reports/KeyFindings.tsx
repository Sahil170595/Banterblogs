import { Reveal } from '@/components/motion/Reveal';
import { IntentLink } from '@/components/ui/IntentLink';
import { reportFigure } from '@/lib/reports/figures';
import { ReportFigure } from './ReportFigure';
import { NAV_FORWARD } from './ReportTransitions';

// The archive's key findings: the owner's own tiles, as written. A tile whose
// report has a figure (lib/reports/figures) opens on that figure's marks; the
// tile's number and sentence are the owner's, not read off the chart.

export interface KeyFinding {
  number: string;
  finding: string;
  source: { label: string; slug: string }[];
}

export const KEY_FINDINGS: KeyFinding[] = [
  {
    number: '100% ASR',
    finding: 'Q2_K collapses refusals on the worst-affected model — 100% attack success on qwen2.5-1.5b. Not uniform: effects vary by model.',
    source: [{ label: 'TR139', slug: 'technical-report-139' }],
  },
  {
    number: 'p = 0.942',
    finding: 'Alignment type does not predict batch-induced safety fragility (RLHF, SFT, DPO, distilled — none differ).',
    source: [{ label: 'TR141', slug: 'technical-report-141' }],
  },
  {
    number: '25pp',
    finding: 'Backend migration moved safety 7–25pp, peaking at 23–25pp on Llama 3.2 1B. Chat template divergence, not the framework.',
    source: [{ label: 'TR136', slug: 'technical-report-136' }],
  },
  {
    number: '13.9×',
    finding: 'Quality metrics are not safety proxies. Safety degraded 13.9× faster than quality on llama3.2-1b at Q3_K_S.',
    source: [{ label: 'TR142', slug: 'technical-report-142' }],
  },
  {
    number: '99.4%',
    finding: 'Dual Ollama reached 99.4% coordination efficiency on the best config, and cut contention to near zero. Architectural fix, not code fix.',
    source: [{ label: 'TR114', slug: 'technical-report-114' }],
  },
  {
    number: '+74%',
    finding: 'GPU memory bandwidth is the multi-agent bottleneck — not the serving stack. Overturned the TR130 conclusion.',
    source: [{ label: 'TR131', slug: 'technical-report-131' }],
  },
  {
    number: '2.25×',
    finding: 'Continuous batching delivers 2.25× throughput at N=8 via 77-80% kernel reduction.',
    source: [{ label: 'TR132', slug: 'technical-report-132' }],
  },
  {
    number: 'Q4_K_M',
    finding: 'The safe GGUF default — established across 5 models, extended to 7 in v2. 30-67% cost savings.',
    source: [{ label: 'TR125', slug: 'technical-report-125' }],
  },
  {
    number: 'NULL',
    finding: 'FP8 KV-cache produces no Holm-significant safety effect across 24K paired records on 3 models. Not pre-approved, not pre-banned — workload-specific paired eval required.',
    source: [{ label: 'TR145', slug: 'technical-report-145' }],
  },
  {
    number: 'κ = 0.69',
    finding: 'Cross-LLM judge agreement is "triangulate" — single-judge labels are insufficient for safety classification. 68K judge rows over the TR145 safety subset. Plus: safety-specialist judges measure a different axis than general LLMs.',
    source: [{ label: 'TR148', slug: 'technical-report-148' }],
  },
];

export function KeyFindings() {
  return (
    <section aria-labelledby="findings-heading" className="archive-section mt-28">
      <div className="max-w-2xl">
        <h2 id="findings-heading" className="text-heading-24">
          Key findings
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Concrete results pulled from the published reports. Numbers, not narrative.
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {KEY_FINDINGS.map((f) => {
          const figure = reportFigure(f.source[0].slug);
          return (
            <Reveal as="article" key={f.number} className="flex flex-col rounded-xl bg-card/70 p-5">
              {figure && (
                <div className="mb-4">
                  <ReportFigure figure={figure} variant="mini" describe={false} />
                </div>
              )}
              <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">{f.number}</div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{f.finding}</p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                {f.source.map((s) => (
                  <IntentLink
                    key={s.slug}
                    href={`/reports/${s.slug}`}
                    transitionTypes={[NAV_FORWARD]}
                    className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-muted-foreground transition-colors duration-fast ease-standard hover:bg-primary/15 hover:text-primary"
                  >
                    {s.label}
                  </IntentLink>
                ))}
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
