import type { ReactNode } from 'react';
import { entranceGroup } from '@/components/motion/entrance';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  /** one paragraph, at most 60ch */
  lede?: ReactNode;
  /** an inline meta or stat row (StatRow) */
  meta?: ReactNode;
  /** buttons after the meta row */
  actions?: ReactNode;
  /** the first-load entrance; on unless a page opts out */
  entrance?: boolean;
  className?: string;
}

/**
 * The unboxed page head at the R1/R2 sizes: an optional eyebrow, the title
 * (28px on phones to 48px on desktop), a 17px lede in the prose colour, then
 * the meta row and actions. On a full page load it rises in three entrance
 * groups; the title's group starts on the first frame, so the LCP heading is
 * never held back. A page joins its first cards or rows to the sequence with
 * entranceItem(i, HEAD_ENTRANCE_GROUPS). Keep the page's largest text block
 * (its LCP element, when the title is short) out of any delayed group or
 * item: Chrome credits a late fade from 0 to LCP only when it ends.
 */
export function PageHeader({ title, eyebrow, lede, meta, actions, entrance = true, className }: PageHeaderProps) {
  // an entrance group's class and --group, merged with the element's own classes
  const group = (index: number, classes?: string) => {
    const props = entrance ? entranceGroup(index) : undefined;
    return { className: cn(props?.className, classes) || undefined, style: props?.style };
  };
  return (
    <header className={cn('pt-6 md:pt-10', className)}>
      <div {...group(0)}>
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h1 className="text-heading-48 text-foreground">{title}</h1>
      </div>
      {lede && <p {...group(1, 'mt-4 max-w-[60ch] text-copy-17 text-prose')}>{lede}</p>}
      {(meta || actions) && (
        <div {...group(2, 'mt-5 flex flex-wrap items-center gap-x-6 gap-y-3')}>
          {meta}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
    </header>
  );
}
