import type { ReactNode } from 'react';
import { entranceGroup } from '@/components/motion/entrance';
import { cn } from '@/lib/cn';
import { Eyebrow } from './Eyebrow';

export interface ProfileSection {
  id: string;
  label: string;
}

export interface ProfileLayoutProps {
  eyebrow: ReactNode;
  title: ReactNode;
  /** the page's opening paragraph, at the reading size */
  lede: ReactNode;
  /** in the rail: links, a byline, stats */
  identity?: ReactNode;
  /** the page's sections, indexed in the rail on wide screens */
  sections: ProfileSection[];
  children: ReactNode;
}

/** a page's first rows start after the title and identity groups (entranceItem's `after`) */
export const PROFILE_ITEMS_AFTER = 2;

// merges an entrance group's class and --group with the element's own classes
const group = (index: number, classes?: string) => {
  const props = entranceGroup(index);
  return { className: cn(props.className, classes), style: props.style };
};

/**
 * The profile template (/work, /about): the eyebrow and the title across the
 * page at the one page-title size, then the identity in a rail on the left
 * and the page beside it. The rail sticks while the page scrolls
 * (.profile-rail in globals.css), wherever the screen is tall enough to hold
 * it. The title rises on the first frame, the links and the index after it.
 * The lede, the page's largest text and so its LCP element, stays out of the
 * entrance: Chrome credits a fade from 0 to LCP only when it ends.
 */
export function ProfileLayout({ eyebrow, title, lede, identity, sections, children }: ProfileLayoutProps) {
  return (
    <div className="container pb-24 pt-6 md:pt-10">
      <header {...group(0)}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 text-heading-48 text-foreground">{title}</h1>
      </header>
      <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-x-16 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:gap-x-24">
        <div className="profile-rail">
          {identity && <div {...group(1)}>{identity}</div>}
          <nav aria-label="On this page" {...group(2, 'mt-12 hidden lg:block')}>
            <ol className="space-y-1">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="rail-link text-label-12-mono">
                    <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                    <span aria-hidden="true" className="rail-line" />
                    <span>{section.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <div className="mt-10 min-w-0 lg:mt-0">
          <p className="max-w-[60ch] text-copy-18 text-prose">{lede}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
