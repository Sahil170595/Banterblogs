import { MIN_TOC_HEADINGS, type TocEntry } from '@/lib/episodes';

interface ReportTocProps {
  headings: TocEntry[];
}

// Sidebar labels past this length cut at a word boundary; the full text rides in `title`.
const TOC_LABEL_MAX_CHARS = 48;

function truncateLabel(text: string): string {
  if (text.length <= TOC_LABEL_MAX_CHARS) return text;
  const cut = text.slice(0, TOC_LABEL_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function TocList({ headings, truncate = false }: { headings: TocEntry[]; truncate?: boolean }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {headings.map((h, i) => {
        const label = truncate ? truncateLabel(h.text) : h.text;
        return (
          <li key={`${i}-${h.id}`} style={{ paddingLeft: `${(h.level - 2) * 12}px` }}>
            <a
              href={`#${h.id}`}
              title={label === h.text ? undefined : h.text}
              className="block text-muted-foreground hover:text-primary transition-colors leading-snug py-0.5"
            >
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
    <details className="lg:hidden rounded-xl border border-border/50 bg-card/50 p-4 mb-8">
      <summary className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
        Table of Contents
      </summary>
      <div className="mt-3">
        <TocList headings={headings} />
      </div>
    </details>
  );
}

export function ReportTocSidebar({ headings }: ReportTocProps) {
  if (headings.length < MIN_TOC_HEADINGS) return null;

  return (
    <nav className="hidden lg:block" aria-label="Table of contents">
      <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          On this page
        </h3>
        <TocList headings={headings} truncate />
      </div>
    </nav>
  );
}
