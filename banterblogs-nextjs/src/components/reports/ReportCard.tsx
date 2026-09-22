import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LivePulse } from '@/components/motion/LivePulse';
import { describeReport } from './reportIdentity';
import { NAV_FORWARD, ReportFigureTransition } from './ReportTransitions';
import { ReportVisual } from './ReportVisual';

export { describeReport };

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
        <ReportFigureTransition slug={slug}>
          <div className="card-visual aspect-video">
            <ReportVisual slug={slug} accent={accent} />
          </div>
        </ReportFigureTransition>
        <h3 className="mt-4 text-heading-20 text-foreground">{heading}</h3>
        {description && <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>}
        <div data-card-meta="" className="mt-3 flex items-center gap-2 text-label-13 text-muted-foreground/80">
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
