'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { entranceGroup } from '@/components/motion/entrance';
import { IntentLink } from '@/components/ui/IntentLink';
import { useActiveTabInView, useTabHighlight } from '@/components/ui/tabStrip';
import { HUB_ENTRANCE_GROUP } from './hubEntrance';

export interface CollectionTab {
  key: string;
  label: string;
  href: string;
  count: number;
}

// the real links and their highlighted copies share one box, so the clip
// lines up with the link beneath it (ReportTabs' TAB_BOX)
const TAB_BOX = 'relative shrink-0 px-3 pb-3 pt-2 text-sm font-medium';
const ACTIVE_TAB = '[data-tab][aria-current="page"]';

/**
 * The projects hub's collections as the archive's tab strip, but links: each
 * collection is a real page a résumé can point at. The strip lives in the
 * hub's layout, so it stays mounted from one collection to the next and its
 * highlight slides between them.
 */
export function CollectionTabs({ tabs }: { tabs: CollectionTab[] }) {
  const pathname = usePathname();
  const active = tabs.find((tab) => tab.href === pathname) ?? tabs[0];
  const listRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  useTabHighlight(listRef, highlightRef, active.key, ACTIVE_TAB);
  useActiveTabInView(listRef, active.key, ACTIVE_TAB);

  return (
    <nav aria-label="Project collections" {...entranceGroup(HUB_ENTRANCE_GROUP.tabs)}>
      <div ref={listRef} className="tab-strip tab-strip-rule relative -mx-4 flex gap-1 overflow-x-auto px-4 pt-1 sm:mx-0 sm:px-0">
        {tabs.map((tab) => {
          const current = tab.key === active.key;
          return (
            <IntentLink
              key={tab.key}
              href={tab.href}
              scroll={false}
              data-tab=""
              aria-current={current ? 'page' : undefined}
              className={`${TAB_BOX} transition-colors duration-fast ease-standard ${
                current ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground/70">{tab.count}</span>
              {current && <span aria-hidden="true" className="tab-underline absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            </IntentLink>
          );
        })}
        {/* the row again in the active style, clipped to the active link */}
        <div
          ref={highlightRef}
          aria-hidden="true"
          data-tab-highlight=""
          className="pointer-events-none absolute left-0 top-0 flex gap-1 px-4 pt-1 sm:px-0"
        >
          {tabs.map((tab) => (
            <span key={tab.key} className={`${TAB_BOX} tab-active-rule text-foreground`}>
              {tab.label}
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground/70">{tab.count}</span>
            </span>
          ))}
        </div>
      </div>
    </nav>
  );
}
