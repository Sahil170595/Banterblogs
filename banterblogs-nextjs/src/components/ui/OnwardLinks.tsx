import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export interface OnwardLink {
  href: string;
  title: string;
  /** one line on why to go there */
  blurb: ReactNode;
}

const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * The quiet close of a page: where to go next as plain links, each with its
 * one-line reason, side by side over a hairline from md (.list-row), in place
 * of a row of link cards. The links turn ember only under the pointer
 * (.row-link in globals.css).
 */
export function OnwardLinks({ links, label = 'Onward', className = 'page-section' }: { links: OnwardLink[]; label?: string; className?: string }) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="grid gap-x-8 md:grid-cols-3">
        {links.map((link) => {
          const external = isExternal(link.href);
          const Arrow = external ? ArrowUpRight : ArrowRight;
          return (
            <li key={link.href} className="list-row py-5">
              <Link href={link.href} className="row-link text-copy-16 font-medium text-foreground" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {link.title}{' '}
                <Arrow aria-hidden="true" {...(external ? {} : { 'data-direction': 'forward' })} className="row-arrow h-4 w-4 text-muted-foreground" />
              </Link>
              <p className="mt-1.5 text-copy-14 text-muted-foreground">{link.blurb}</p>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
