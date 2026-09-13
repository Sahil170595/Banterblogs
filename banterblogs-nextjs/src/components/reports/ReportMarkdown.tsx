import 'highlight.js/styles/github-dark.css';
import { RevealScope } from '@/components/motion/RevealScope';
import type { ReportSection } from '@/lib/reports/content';

// Each section's body is the pipeline's HTML, set as one string, so React
// hydrates its container and nothing inside it. RevealScope arms the tables,
// code blocks and figures the pipeline marked; prose, lists and headings
// never move.
export function ReportMarkdown({ sections }: { sections: ReportSection[] }) {
  if (!sections.length) return null;

  return (
    <div className="min-w-0">
      {sections.map((section) => (
        <article key={section.originKey} id={section.id}>
          <RevealScope className="report-prose prose prose-invert" html={section.html} />
        </article>
      ))}
    </div>
  );
}
