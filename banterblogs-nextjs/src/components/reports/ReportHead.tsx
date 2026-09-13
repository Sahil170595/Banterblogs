import { ChevronRight } from 'lucide-react';
import type { ReportFrontMatter } from '@/lib/reports/content';
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

/** The report's archive-card visual on a plate at banner proportions, with its ember accent lit. */
export function ReportHero({ slug }: { slug: string }) {
  return (
    <div className="report-hero">
      <ReportVisual slug={slug} accent />
    </div>
  );
}
