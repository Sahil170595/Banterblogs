import 'highlight.js/styles/github-dark.css';
import type { ReportSection } from '@/lib/reports/content';

interface ReportMarkdownProps {
  sections: ReportSection[];
}

export function ReportMarkdown({ sections }: ReportMarkdownProps) {
  if (!sections.length) return null;

  return (
    <div className="space-y-0">
      {sections.map((section) => (
        <article
          key={section.originKey}
          id={section.id}
        >
          <div
            className="report-prose prose prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border/30
            prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-10 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/20
            prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-8
            prose-h4:text-base prose-h4:mb-2 prose-h4:mt-6 prose-h4:font-semibold
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4 prose-p:text-[0.9375rem]
            prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-border hover:prose-a:decoration-primary hover:prose-a:text-primary
            prose-strong:text-foreground prose-strong:font-semibold
            prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal
            prose-pre:bg-muted/80 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg prose-pre:text-sm
            prose-blockquote:border-l-2 prose-blockquote:border-border/60 prose-blockquote:bg-muted/30 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-blockquote:text-sm
            prose-ul:list-disc prose-ol:list-decimal
            prose-li:text-muted-foreground prose-li:mb-1 prose-li:text-[0.9375rem]
            prose-img:rounded-lg prose-img:border prose-img:border-border/50
            prose-table:border-collapse prose-table:w-full prose-table:text-sm
            prose-th:bg-muted/60 prose-th:font-semibold prose-th:text-foreground prose-th:text-left prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-border/50
            prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border/40 prose-td:text-muted-foreground
            prose-tr:even:bg-muted/20
            prose-hr:border-border/30 prose-hr:my-8"
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        </article>
      ))}
    </div>
  );
}
