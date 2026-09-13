import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LivePulse } from '@/components/motion/LivePulse';
import { classifyReportSlug, phaseNumber, type PhaseKey } from '@/lib/reports/phases';
import { NAV_FORWARD, ReportTitleTransition } from './ReportTransitions';
import { ReportVisual } from './ReportVisual';

export interface ReportCardProps {
  slug: string;
  title: string;
  description: string;
  /** a curated synthesis document (phase whitepaper, compendium) */
  synthesis?: boolean;
  /** the newest report: live dot in the meta line */
  latest?: boolean;
  /** ember accent in the visual at rest (the newest phase); defaults to latest */
  accent?: boolean;
}

// "TR164 V3: Cross-Backend ..." -> label "TR164 V3", heading "Cross-Backend ..."
const TR_TITLE_PREFIX = /^(TR\d+(?:\s[^:]+)?):\s*(.+)$/;
const PHASE_KEY = /^phase\d+$/;

/** The card heading and its meta line: the TR label moves out of the title. */
export function describeReport(slug: string, title: string): { heading: string; meta: string } {
  const prefix = TR_TITLE_PREFIX.exec(title);
  const heading = prefix ? prefix[2] : title;
  const category = classifyReportSlug(slug);
  if (category === 'compendium') return { heading, meta: 'Compendium' };
  const key = PHASE_KEY.test(category) ? category : (/phase(\d+)/.exec(slug.toLowerCase())?.[0] ?? null);
  const phase = key ? `Phase ${phaseNumber(key as PhaseKey)}` : null;
  const label = prefix ? prefix[1] : category === 'phase0' ? 'Baseline' : null;
  return { heading, meta: [label, phase].filter(Boolean).join(' · ') || 'Report' };
}

/**
 * An archive card: the report's visual in a fixed 16:9 frame, its title,
 * a two-line description and a 13px meta line. No border. The link takes the
 * pointer and its .card-lift child moves (the .card-depth rules in
 * globals.css), so a lifted card never slips out from under the cursor.
 */
export function ReportCard({ slug, title, description, synthesis = false, latest = false, accent = latest }: ReportCardProps) {
  const { heading, meta } = describeReport(slug, title);
  return (
    <Link href={`/reports/${slug}`} transitionTypes={[NAV_FORWARD]} className="card-depth group block rounded-xl">
      <div className="card-lift">
        <div className="card-visual aspect-video">
          <ReportVisual slug={slug} accent={accent} />
        </div>
        <ReportTitleTransition slug={slug}>
          <h3 className="mt-4 text-[1.25rem] font-semibold leading-snug tracking-[-0.015em] text-foreground">{heading}</h3>
        </ReportTitleTransition>
        {description && <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>}
        <div data-card-meta="" className="mt-3 flex items-center gap-2 text-[0.8125rem] leading-5 text-muted-foreground/80">
          {synthesis && <span className="card-badge">Synthesis</span>}
          {synthesis && ' '}
          {latest && <LivePulse label="Latest" />}
          {latest && ' '}
          <span>{meta}</span>
          <ArrowRight aria-hidden="true" className="card-arrow h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}
