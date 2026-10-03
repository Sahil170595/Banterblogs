'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// The projects head, shared by the hub and every collection page through
// their layout: the hub's line, intro and catalog counts on /projects, the
// collection's own title, description and count on /projects/<key>. The same
// elements stay mounted across a tab switch; only their words change.

const TITLE_LINES = ['Systems I Built,', 'Running Live'];

export interface HubHeadCollection {
  key: string;
  title: string;
  description: string;
  /** the projects it lists, cross-listed ones included */
  count: number;
}

interface HubHeadProps {
  collections: HubHeadCollection[];
  /** every project in the catalog */
  total: number;
  intro: ReactNode;
  /** the layout's entrance props for the title, the intro and the counts */
  titleProps?: HTMLAttributes<HTMLHeadingElement>;
  introProps?: HTMLAttributes<HTMLParagraphElement>;
  countsProps?: HTMLAttributes<HTMLUListElement>;
}

const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;

export function HubHead({ collections, total, intro, titleProps, introProps, countsProps }: HubHeadProps) {
  const pathname = usePathname();
  const collection = collections.find((c) => pathname === `/projects/${c.key}`);

  return (
    <>
      <h1 {...titleProps}>
        {collection
          ? collection.title
          : TITLE_LINES.map((line, index) => (
              <span key={line}>
                {index > 0 && ' '}
                <span className="inline-block">{line}</span>
              </span>
            ))}
      </h1>
      <p {...introProps}>{collection ? collection.description : intro}</p>
      <ul aria-label={collection ? 'This collection in numbers' : 'The projects in numbers'} {...countsProps}>
        {collection ? (
          <li>
            <span className="font-semibold tabular-nums text-foreground">{collection.count}</span> {plural(collection.count, 'project')} in this
            collection
          </li>
        ) : (
          <>
            <li>
              <span className="font-semibold tabular-nums text-foreground">{total}</span> {plural(total, 'project')}
            </li>
            <li>
              <span className="font-semibold tabular-nums text-foreground">{collections.length}</span> {plural(collections.length, 'collection')}
            </li>
          </>
        )}
        <li>Runs in your browser</li>
      </ul>
    </>
  );
}
