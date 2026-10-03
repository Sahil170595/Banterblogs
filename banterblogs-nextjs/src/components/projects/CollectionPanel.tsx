'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ENTRANCE_ATTRIBUTE } from '@/components/motion/prePaint';

/**
 * A collection's grid under the hub's tab strip. Reached through a tab (a
 * client navigation, the first-load entrance over), it crossfades in like an
 * archive tab's grid ([data-tab-panel][data-switched], globals.css); on a
 * full load the entrance plays instead.
 */
export function CollectionPanel({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!document.documentElement.hasAttribute(ENTRANCE_ATTRIBUTE)) ref.current?.setAttribute('data-switched', '');
  }, []);
  return (
    <div ref={ref} data-tab-panel="" role="region" aria-label={label} className="pt-6 md:pt-8">
      {children}
    </div>
  );
}
