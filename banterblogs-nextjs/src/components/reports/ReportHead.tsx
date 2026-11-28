import { ChevronRight } from 'lucide-react';
import type { ReportFrontMatter } from '@/lib/reports/content';
import type { ResolvedFigure } from '@/lib/reports/figures/types';
import { toExplorable } from './exploreView';
import { ReportExploreLazy } from './ReportExploreLazy';
import { ReportFigure } from './ReportFigure';
import { ReportFigureTransition } from './ReportTransitions';
import { ReportVisual } from './ReportVisual';

// The report page's head, below its breadcrumb, title and dek (page.tsx):
// the meta row, the details panel that holds the rest of the report's own
// title block, and the hero figure.

// dates stated in a report read the same in every time zone
const STATED_DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "Mar 15, 2026" for a stated yyyy-mm-dd date */
export function formatStatedDate(isoDate: string): string {
  return STATED_DATE.format(new Date(`${isoDate}T00:00:00Z`));
}

export interface ReportMetaProps {
  label: string | null;
  phaseNumber: string | null;
  readingMinutes: number;
  date: string | null;
}

/** TR number · phase · read time · date, each only where the report has one. */
export function ReportMeta({ label, phaseNumber, readingMinutes, date }: ReportMetaProps) {
  return (
    <ul className="report-meta" aria-label="About this report">
      {label && (
        <li>
          <strong>{label}</strong>
        </li>
      )}
      {phaseNumber && <li>Phase {phaseNumber}</li>}
      <li>{readingMinutes} min read</li>
      {date && (
        <li>
          <time dateTime={date}>{formatStatedDate(date)}</time>
        </li>
      )}
    </ul>
  );
}

/**
 * Everything the report's own title block said that the head does not show:
 * its full title and subtitles and every metadata field, behind one closed
 * disclosure. Nothing folded out of the body is lost.
 */
export function ReportDetails({ frontMatter }: { frontMatter: ReportFrontMatter }) {
  return (
    <details className="report-details">
      <summary>
        <ChevronRight aria-hidden="true" className="report-details-chevron h-3.5 w-3.5" />
        Report details
      </summary>
      <div className="report-details-panel">
        <p className="report-details-title" dangerouslySetInnerHTML={{ __html: frontMatter.title.html }} />
        {frontMatter.subtitles.map((subtitle, index) => (
          <p key={index} dangerouslySetInnerHTML={{ __html: subtitle.html }} />
        ))}
        {frontMatter.fields.length > 0 && (
          <dl>
            {frontMatter.fields.map((field, index) => (
              <div key={index} className="contents">
                <dt>{field.label}</dt>
                <dd dangerouslySetInnerHTML={{ __html: field.html }} />
              </div>
            ))}
          </dl>
        )}
      </div>
    </details>
  );
}

/**
 * The report's figure on a plate at banner proportions, captioned with the
 * report's own sentence and the heading of the table it was drawn from; a
 * report without one shows its seeded card visual, ember accent lit. Either
 * plate is the far end of the card-to-report figure morph. A figure whose
 * spec offers choices puts them over the plate (ReportExplore).
 */
export function ReportHero({ slug, figure = null }: { slug: string; figure?: ResolvedFigure | null }) {
  const plate = (
    <ReportFigureTransition slug={slug}>
      <div className="report-hero">{figure ? <ReportFigure figure={figure} /> : <ReportVisual slug={slug} accent />}</div>
    </ReportFigureTransition>
  );
  if (!figure) return plate;
  const explorable = toExplorable(figure);
  return (
    <figure className="report-figure">
      {/* keyed by report, so a choice never carries over to another report's figure */}
      {explorable ? <ReportExploreLazy key={slug} figure={explorable} /> : plate}
      <figcaption>
        <p>{figure.claim}</p>
        <p className="report-figure-source">
          Drawn from {figure.anchor ? <a href={`#${figure.anchor}`}>{figure.title}</a> : figure.title}
        </p>
      </figcaption>
    </figure>
  );
}
