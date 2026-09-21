import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

type CardTag = 'div' | 'article' | 'li';

export interface CardProps {
  /** plain: a quiet surface. interactive: R1's hover depth (lift, ember ring, arrow). */
  variant?: 'plain' | 'interactive';
  /** an interactive card with an href is one link; without, it holds a CardLink and other links */
  href?: string;
  as?: CardTag;
  className?: string;
  children: ReactNode;
}

// The surface: padding, a card-coloured plate with an inset hairline, no
// border (.card-surface in globals.css, shared with the archive card visual).
const SURFACE = 'card-surface p-5 md:p-6';

/**
 * A card. An interactive card is R1's recipe: the outer element (.card-depth)
 * takes the pointer and its .card-lift child moves, so a lifted card never
 * slips out from under the cursor; the glow and the arrow (.card-arrow)
 * answer the same hover.
 */
export function Card({ variant = 'plain', href, as: Tag = 'div', className, children }: CardProps) {
  if (variant === 'plain') return <Tag className={cn(SURFACE, className)}>{children}</Tag>;
  const lift = <div className={cn('card-lift', SURFACE, className)}>{children}</div>;
  if (href) {
    return (
      <Link href={href} className="card-depth group block rounded-xl">
        {lift}
      </Link>
    );
  }
  return <Tag className="card-depth group relative rounded-xl">{lift}</Tag>;
}

export interface CardLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

/**
 * The link of an interactive card that holds other links: its ::after
 * stretches over the whole card, and the card's other links (ButtonLink)
 * sit above it.
 */
export function CardLink({ href, className, children }: CardLinkProps) {
  const external = /^https?:\/\//.test(href);
  return (
    <Link href={href} className={cn('card-link', className)} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </Link>
  );
}
