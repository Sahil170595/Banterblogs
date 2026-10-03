'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// The projects head, shared by the hub and every collection page through
// their layout: the hub's line and intro on /projects, the collection's own
// title and description on /projects/<key>. The same h1 and p stay mounted
// across a tab switch; only their words change.

const TITLE_LINES = ['Systems I Built,', 'Running Live'];

export interface HubHeadCollection {
  key: string;
  title: string;
  description: string;
}

interface HubHeadProps {
  collections: HubHeadCollection[];
  intro: ReactNode;
  /** the layout's entrance props for the title and the intro */
  titleProps?: HTMLAttributes<HTMLHeadingElement>;
  introProps?: HTMLAttributes<HTMLParagraphElement>;
}

export function HubHead({ collections, intro, titleProps, introProps }: HubHeadProps) {
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
    </>
  );
}
