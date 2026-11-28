import { CiteBlock } from '@/components/CiteBlock';
import { reportCitation, type ReportCitationInput } from '@/lib/citation';

/**
 * The report's own citation, at the end of its page: after the body, before
 * the pager, at the reading measure. Named by the catalog title, the one name
 * every report has.
 */
export function ReportCite({ slug, title, date }: ReportCitationInput) {
  return <CiteBlock citation={reportCitation({ slug, title, date })} subject={title} label="Cite this report" className="mt-10 max-w-2xl" />;
}
