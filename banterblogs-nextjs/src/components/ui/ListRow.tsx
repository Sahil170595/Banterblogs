import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ListRowProps {
  title: ReactNode;
  href?: string;
  /** a row that holds other links: its title alone leads here (.row-link), and the row is not one link */
  titleHref?: string;
  /** a leading mono index ("01") */
  index?: ReactNode;
  description?: ReactNode;
  /** a mono meta line under the description */
  meta?: ReactNode;
  /** more of the body under the description, e.g. the row's own buttons */
  children?: ReactNode;
  /** a meta column: on the right from md, under the body on a phone */
  aside?: ReactNode;
  titleAs?: 'h2' | 'h3' | 'h4';
  /** the element of a row that is not a link */
  as?: 'div' | 'article';
  className?: string;
}

const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * The /show row: index, title, description, mono meta and a trailing arrow
 * over a hairline (.list-row in globals.css). As a link, the hairline and the
 * title turn ember and the arrow nudges; no lift, as befits a dense list. A
 * row that holds several links leads from its title instead (titleHref), and
 * may carry a meta column (aside).
 */
export function ListRow({ title, href, titleHref, index, description, meta, children, aside, titleAs: Title = 'h3', as: Tag = 'div', className }: ListRowProps) {
  const external = titleHref !== undefined && isExternal(titleHref);
  const TitleArrow = external ? ArrowUpRight : ArrowRight;
  const body = (
    <>
      {index !== undefined && <span className="font-mono text-label-13 text-muted-foreground transition-colors duration-fast ease-standard group-hover:text-primary">{index}</span>}
      <div className="min-w-0 space-y-2">
        <Title className="text-heading-20 text-foreground transition-colors duration-fast ease-standard group-hover:text-primary">
          {titleHref ? (
            <Link href={titleHref} className="row-link" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {title}{' '}
              <TitleArrow aria-hidden="true" {...(external ? {} : { 'data-direction': 'forward' })} className="row-arrow h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            title
          )}
        </Title>
        {description && <p className="max-w-2xl text-copy-16 text-muted-foreground">{description}</p>}
        {meta && <p className="pt-1 text-label-12-mono text-muted-foreground/80">{meta}</p>}
        {children}
      </div>
      {aside && <div className={cn('min-w-0 md:row-start-1', index !== undefined ? 'col-start-2 md:col-start-3' : 'md:col-start-2')}>{aside}</div>}
      {href && <ArrowRight aria-hidden="true" className="row-arrow h-5 w-5 text-muted-foreground" />}
    </>
  );
  const layout = cn(
    'list-row grid items-baseline gap-x-6 py-6 md:py-8',
    aside
      ? cn('gap-y-4', index !== undefined ? 'grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_minmax(0,13rem)]' : 'grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,13rem)]')
      : index !== undefined
        ? 'grid-cols-[auto_minmax(0,1fr)_auto]'
        : 'grid-cols-[minmax(0,1fr)_auto]',
    className,
  );
  if (!href) return <Tag className={layout}>{body}</Tag>;
  return (
    <Link href={href} className={cn('group', layout)}>
      {body}
    </Link>
  );
}
