import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionProps {
  /** the section's id; its heading is `${id}-heading` */
  id: string;
  title: ReactNode;
  /** one line under the heading */
  description?: ReactNode;
  /** on wide screens, the heading sits in a sticky column beside the content */
  aside?: boolean;
  /** props for the heading block, e.g. entranceGroup(n) for the first section */
  headingProps?: { className?: string; style?: CSSProperties };
  className?: string;
  children: ReactNode;
}

/**
 * A page section: a 24px h2 and an optional one-line description, in one
 * rhythm (.page-section in globals.css: 96px apart on desktop, 64 on phones).
 */
export function Section({ id, title, description, aside = false, headingProps, className, children }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      id={id}
      className={cn('page-section', aside && 'lg:grid lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-x-12', className)}
    >
      <div className={cn(aside && 'lg:sticky lg:top-24 lg:self-start', headingProps?.className)} style={headingProps?.style}>
        <h2 id={headingId} className="text-heading-24 text-foreground">
          {title}
        </h2>
        {description && <p className="mt-2 max-w-2xl text-copy-16 text-muted-foreground">{description}</p>}
      </div>
      <div className={cn('mt-6 md:mt-8', aside && 'lg:mt-0')}>{children}</div>
    </section>
  );
}
