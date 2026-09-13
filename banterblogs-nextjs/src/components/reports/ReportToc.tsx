import { MIN_TOC_HEADINGS, type TocEntry } from '@/lib/episodes';
import { ReportTocSpy } from './ReportTocSpy';

interface ReportTocProps {
  headings: TocEntry[];
}

// Sidebar labels past this length cut at a word boundary; the full text rides in `title`.
const TOC_LABEL_MAX_CHARS = 48;
// nested headings step in by this much per level below h2
const INDENT_PER_LEVEL_PX = 12;

function truncateLabel(text: string): string {
  if (text.length <= TOC_LABEL_MAX_CHARS) return text;
  const cut = text.slice(0, TOC_LABEL_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function TocList({ headings, truncate = false }: { headings: TocEntry[]; truncate?: boolean }) {
  return (
    <ul className="report-toc-list">
      {headings.map((h, i) => {
        const label = truncate ? truncateLabel(h.text) : h.text;
        return (
          <li key={`${i}-${h.id}`} style={{ paddingLeft: `${(h.level - 2) * INDENT_PER_LEVEL_PX}px` }}>
            <a href={`#${h.id}`} title={label === h.text ? undefined : h.text}>
              {label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function ReportTocMobile({ headings }: ReportTocProps) {
  if (headings.length < MIN_TOC_HEADINGS) return null;

  return (
    <details className="report-toc-mobile lg:hidden">
      <summary>Contents</summary>
      <TocList headings={headings} />
    </details>
  );
}

/** The sticky contents beside the body, following the section being read. */
export function ReportTocSidebar({ headings }: ReportTocProps) {
  if (headings.length < MIN_TOC_HEADINGS) return null;

  return (
    <nav className="report-toc hidden lg:block" aria-label="Table of contents">
      <div className="report-toc-scroller" data-toc-scroller="">
        <p className="report-toc-label">On this page</p>
        <ReportTocSpy ids={headings.map((h) => h.id)}>
          <TocList headings={headings} truncate />
        </ReportTocSpy>
      </div>
    </nav>
  );
}
