import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { discoverReportsUnique, toHumanTitle } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';
import { Reveal } from '@/components/motion/Reveal';
import { ReportTabs, TABS_ENTRANCE_GROUP, type ReportTabEntry, type ReportTabGroup } from '@/components/reports/ReportTabs';
import { DirectionalPage, NAV_FORWARD, ReportTitleTransition } from '@/components/reports/ReportTransitions';
import { PHASE_DEFINITIONS, classifyReportSlug, extractTRNumber, phaseWhitepaperSlug } from '@/lib/reports/phases';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

const METADATA_DESCRIPTION = `Independent LLM safety research · ${REPORTS.DISPLAY} technical reports · ${MEASUREMENTS.DISPLAY} empirical measurements · papers under peer review and a paper presented at the ICML 2026 Workshop on Hypothesis Testing.`;

export const metadata: Metadata = {
  alternates: { canonical: '/reports' },
  title: 'Research Archive',
  description: METADATA_DESCRIPTION,
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Research Archive | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/reports',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Research Archive | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

export const runtime = 'nodejs';

interface ReportEntry {
  slug: string;
  title: string;
  description: string;
  source: string;
}

// PHASE_META derived from the single PHASE_DEFINITIONS source. Module-level so
// it allocates once at parse time, not per ReportsIndex render. Newest phase
// first (order 0); the tab list itself opens on an All tab (ReportTabs).
const PHASE_META: Record<string, { label: string; description: string; order: number }> = (() => {
  const meta: Record<string, { label: string; description: string; order: number }> = {};
  const reversed = [...PHASE_DEFINITIONS].reverse();
  reversed.forEach((p, i) => {
    meta[p.key] = { label: p.label, description: p.description, order: i };
  });
  meta.other = {
    label: 'Additional Reports',
    description: 'Model-specific analyses and supplementary research.',
    order: reversed.length,
  };
  return meta;
})();

// The curated synthesis set that opens the All tab: the program compendium,
// then each phase's decision whitepaper. Phases without a whitepaper (the
// Phase 0 baselines, the in-flight phases) have no entry; phaseWhitepaperSlug()
// owns the URL convention.
const COMPENDIUM_SLUG = 'compendium';
const PHASE_WHITEPAPERS = PHASE_DEFINITIONS.filter((p) => p.hasWhitepaper).map((p) => ({
  slug: phaseWhitepaperSlug(p.key),
  label: `Phase ${p.number} Whitepaper`,
  summary: p.featuredSummary,
}));

const KEY_FINDINGS: { number: string; finding: string; source: { label: string; slug: string }[] }[] = [
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

// The title's two phrases are inline blocks, so each wraps inside itself on
// a phone.
const TITLE_LINES = ['Edge LLM Inference', 'Under Real-World Constraints'];

// First-load entrance groups (globals.css): the title first, so the LCP
// heading starts on the first frame, then the intro, then the stats with the
// tabs (TABS_ENTRANCE_GROUP in ReportTabs).
const HEAD_ENTRANCE_GROUP = { title: 0, intro: 1, stats: TABS_ENTRANCE_GROUP } as const;

// a wrapping phone title never breaks "Real-World" at its hyphen
function keepHyphenatedWhole(line: string) {
  return line.split(/(\S+-\S+)/).map((part, index) =>
    index % 2 ? (
      <span key={part} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export default async function ReportsIndex() {
  const reportsEnabled = process.env.REPORTS_ENABLED !== 'false';
  if (!reportsEnabled) {
    notFound();
  }

  const reports: ReportEntry[] = discoverReportsUnique().map((entry) => {
    const meta = readReportMeta(entry.slug);
    return {
      slug: entry.slug,
      title: meta?.title ?? toHumanTitle(entry.label),
      description: meta?.description ?? '',
      source: entry.source,
    };
  });

  // Build the top-level tabs using the shared slug classifier from phases.ts.
  const conclusive: ReportEntry[] = [];
  const technicalByPhase = new Map<string, ReportEntry[]>();

  for (const report of reports) {
    const cat = classifyReportSlug(report.slug);
    // Phase whitepapers lead the All tab as synthesis cards — skipping them
    // here keeps them out of the phase tabs and off a second, duplicate list.
    if (cat === 'whitepaper') continue;
    if (cat === 'conclusive' || cat === 'appendix') {
      conclusive.push(report);
    } else {
      if (!technicalByPhase.has(cat)) technicalByPhase.set(cat, []);
      technicalByPhase.get(cat)!.push(report);
    }
  }

  // Build tab groups for the technical reports section
  const technicalGroups: ReportTabGroup[] = Array.from(technicalByPhase.entries())
    .map(([key, items]) => ({
      key,
      label: PHASE_META[key]?.label ?? key,
      description: PHASE_META[key]?.description ?? '',
      reports: items.map((r) => ({ slug: r.slug, title: r.title, description: r.description })),
      _order: PHASE_META[key]?.order ?? 99,
    }))
    .sort((a, b) => a._order - b._order)
    .map(({ _order, ...rest }) => rest);

  const compendium = readReportMeta(COMPENDIUM_SLUG);
  const synthesis: ReportTabEntry[] = [
    { slug: COMPENDIUM_SLUG, title: compendium?.title ?? toHumanTitle(COMPENDIUM_SLUG), description: compendium?.description ?? '' },
    ...PHASE_WHITEPAPERS.map((w) => ({ slug: w.slug, title: readReportMeta(w.slug)?.title ?? w.label, description: w.summary })),
  ];

  // the newest technical report: the highest TR number on disk
  let latestSlug: string | undefined;
  let latestTR = -1;
  for (const report of technicalGroups.flatMap((group) => group.reports)) {
    const tr = extractTRNumber(report.slug);
    if (tr !== null && tr > latestTR) {
      latestTR = tr;
      latestSlug = report.slug;
    }
  }

  return (
    <DirectionalPage className="container pb-24 pt-6 md:pt-10">
      {/* ── Head: title, one-line intro, the program in three numbers ── */}
      <div>
        <h1
          className="entrance-group text-heading-48"
          style={{ '--group': HEAD_ENTRANCE_GROUP.title } as CSSProperties}
        >
          {TITLE_LINES.map((line, index) => (
            <span key={line}>
              {index > 0 && ' '}
              <span className="inline-block">{keepHyphenatedWhole(line)}</span>
            </span>
          ))}
        </h1>
        <p
          className="entrance-group mt-3 max-w-4xl text-[0.9375rem] leading-relaxed text-muted-foreground md:mt-4 md:text-[1.0625rem]"
          style={{ '--group': HEAD_ENTRANCE_GROUP.intro } as CSSProperties}
        >
          How fast local inference can get, and how safe it stays at the edge. Independent research by{' '}
          <span className="text-foreground">Sahil Kadadekar</span>.
        </p>
        <ul
          aria-label="The research program in numbers"
          className="entrance-group mt-3 flex flex-wrap gap-x-5 gap-y-1 text-label-13 text-muted-foreground"
          style={{ '--group': HEAD_ENTRANCE_GROUP.stats } as CSSProperties}
        >
          <li>
            <span className="font-semibold tabular-nums text-foreground">{MEASUREMENTS.SHORT}</span> measurements
          </li>
          {/* the qualifiers drop on a phone so the row stays one line */}
          <li>
            <span className="font-semibold tabular-nums text-foreground">{REPORTS.DISPLAY}</span>{' '}
            <span className="hidden sm:inline">technical </span>reports
          </li>
          <li>
            <span className="font-semibold tabular-nums text-foreground">{PHASE_WHITEPAPERS.length}</span>{' '}
            <span className="hidden sm:inline">synthesis </span>whitepapers
          </li>
          {/* 47 distinct TR numbers + 3 pre-series baselines + 5 revised
              versions filed as their own reports (TR117 multi-agent, TR138
              Study D, TR164 V3/V4/V5) */}
          <li className="hidden text-muted-foreground/70 md:block">47 TR numbers · 3 baselines · versions counted</li>
        </ul>
      </div>

      {/* ── Synthesis and technical reports, tabbed by phase ── */}
      <section aria-labelledby="archive-heading" className="mt-6 md:mt-8">
        <h2 id="archive-heading" className="sr-only">
          Synthesis and technical reports
        </h2>
        <ReportTabs groups={technicalGroups} synthesis={synthesis} latestSlug={latestSlug} accentGroupKey={technicalGroups[0]?.key} />
      </section>

      {/* ── Key Findings ── */}
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
          {KEY_FINDINGS.map((f) => (
            <Reveal as="article" key={f.number} className="flex flex-col rounded-xl bg-card/70 p-5">
              <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">{f.number}</div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{f.finding}</p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                {f.source.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/reports/${s.slug}`}
                    transitionTypes={[NAV_FORWARD]}
                    className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-muted-foreground transition-colors duration-fast ease-standard hover:bg-primary/15 hover:text-primary"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Conclusive Reports ── */}
      {conclusive.length > 0 && (
        <section aria-labelledby="conclusive-heading" className="archive-section mt-24">
          <div className="max-w-2xl">
            <h2 id="conclusive-heading" className="text-heading-24">
              Conclusive reports and appendices
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
              Dissertation-style synthesis documents consolidating findings across multiple technical reports.
            </p>
          </div>
          <ul className="mt-8 grid gap-x-8 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
            {conclusive.map((r) => (
              <Reveal as="li" key={r.slug}>
                <Link
                  href={`/reports/${r.slug}`}
                  transitionTypes={[NAV_FORWARD]}
                  className="-mx-3 block rounded-lg px-3 py-3 transition-colors duration-fast ease-standard hover:bg-card/70"
                >
                  <ReportTitleTransition slug={r.slug}>
                    <div className="text-[0.9375rem] font-medium leading-snug text-foreground">{r.title}</div>
                  </ReportTitleTransition>
                  {r.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{r.description}</p>}
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}
    </DirectionalPage>
  );
}
