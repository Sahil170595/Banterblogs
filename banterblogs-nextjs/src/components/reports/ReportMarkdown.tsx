import type { ReportSection } from '@/lib/reports/content';

interface ReportMarkdownProps {
  sections: ReportSection[];
}

export function ReportMarkdown({ sections }: ReportMarkdownProps) {
  if (!sections.length) return null;

  return (
    <div className="mt-12 space-y-12">
      {sections.map((section) => (
        <article
          key={section.originKey}
          className="signal-panel p-6 md:p-8"
          id={section.id}
        >
          <header className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80 font-semibold">
              Source - {section.sourceLabel}
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold text-foreground">{section.title}</h2>
          </header>
          <div
            className="prose prose-invert max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        </article>
      ))}
    </div>
  );
}
