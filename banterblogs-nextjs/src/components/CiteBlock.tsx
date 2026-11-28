import { ChevronRight } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import type { Citation } from '@/lib/citation';
import { cn } from '@/lib/cn';

export interface CiteBlockProps {
  citation: Citation;
  /** what is cited, for the controls' names: "TR134", a paper's title */
  subject: string;
  /** the disclosure's visible label */
  label?: string;
  className?: string;
}

/**
 * A citation behind a closed disclosure (.more-details in globals.css): one
 * line of plain text, then the BibTeX in a mono block, each with the shared
 * copy button. A native <details> with both texts in the server HTML, so it
 * opens and its text selects without JavaScript. Positioned, so it stays
 * usable over an interactive card's stretched link. The BibTeX wraps where
 * the column is narrow; a copy is still the entry as written.
 */
export function CiteBlock({ citation, subject, label = 'Cite', className }: CiteBlockProps) {
  return (
    <details className={cn('more-details relative min-w-0', className)}>
      <summary>
        <ChevronRight aria-hidden="true" className="more-chevron h-3.5 w-3.5" />
        {label}
        <span className="sr-only">: {subject}</span>
      </summary>
      <div className="mt-3 space-y-3">
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 break-words text-copy-14 text-prose">{citation.text}</p>
          <CopyButton text={citation.text} label={`citation for ${subject}`} />
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
          <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-label-13 text-foreground">
            <code>{citation.bibtex}</code>
          </pre>
          <CopyButton text={citation.bibtex} label={`BibTeX for ${subject}`} />
        </div>
      </div>
    </details>
  );
}
