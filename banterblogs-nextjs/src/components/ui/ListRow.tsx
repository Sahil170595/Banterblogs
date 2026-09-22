import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IntentLink } from './IntentLink';

export interface ListRowProps {
  title: ReactNode;
  href?: string;
  /** a leading mono index ("01") */
  index?: ReactNode;
  description?: ReactNode;
  /** a mono meta line under the description */
  meta?: ReactNode;
  titleAs?: 'h2' | 'h3' | 'h4';
  className?: string;
}

/**
 * The /show row: index, title, description, mono meta and a trailing arrow
 * over a hairline (.list-row in globals.css). As a link, the hairline and the
 * title turn ember and the arrow nudges; no lift, as befits a dense list.
 */
export function ListRow({ title, href, index, description, meta, titleAs: Title = 'h3', className }: ListRowProps) {
  const body = (
    <>
      {index !== undefined && <span className="font-mono text-label-13 text-muted-foreground transition-colors duration-fast ease-standard group-hover:text-primary">{index}</span>}
      <div className="min-w-0 space-y-2">
        <Title className="text-heading-20 text-foreground transition-colors duration-fast ease-standard group-hover:text-primary">{title}</Title>
        {description && <p className="max-w-2xl text-copy-16 text-muted-foreground">{description}</p>}
        {meta && <p className="pt-1 text-label-12-mono text-muted-foreground/80">{meta}</p>}
      </div>
      {href && <ArrowRight aria-hidden="true" className="row-arrow h-5 w-5 text-muted-foreground" />}
    </>
  );
  const layout = cn(
    'list-row grid items-baseline gap-x-6 py-6 md:py-8',
    index !== undefined ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]',
    className,
  );
  if (!href) return <div className={layout}>{body}</div>;
  return (
    <IntentLink href={href} className={cn('group', layout)}>
      {body}
    </IntentLink>
  );
}
