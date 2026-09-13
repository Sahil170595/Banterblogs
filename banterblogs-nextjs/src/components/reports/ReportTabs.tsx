'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Reveal } from '@/components/motion/Reveal';
import { ENTRANCE_ATTRIBUTE, MOTION_ATTRIBUTE } from '@/components/motion/prePaint';
import { ReportCard } from './ReportCard';

export interface ReportTabEntry {
  slug: string;
  title: string;
  description: string;
}

export interface ReportTabGroup {
  key: string;
  label: string;
  description: string;
  reports: ReportTabEntry[];
}

interface ReportTabsProps {
  groups: ReportTabGroup[];
  /** curated synthesis documents: the All tab opens on them, badged */
  synthesis: ReportTabEntry[];
  /** the newest technical report, marked live */
  latestSlug?: string;
  /** the newest phase, whose visuals carry the ember accent at rest */
  accentGroupKey?: string;
}

// The default tab lists every report; any other tab lives in ?phase=<key>.
export const ALL_TAB_KEY = 'all';
export const PHASE_PARAM = 'phase';
/** cards that join the first-load entrance: the first two rows at three columns */
export const ENTRANCE_CARDS = 6;
/** entrance cards stagger across the first row; later ones start with its last */
export const ENTRANCE_CARD_STEPS = 3;
/** the head's entrance group the tabs join, after the title and the intro */
export const TABS_ENTRANCE_GROUP = 2;

type SwitchedBy = 'pointer' | 'keyboard';

const tabId = (key: string) => `report-tab-${key}`;
// the real tabs and their highlighted copies share one box, so the clip lines
// up with the tab beneath it
const TAB_BOX = 'relative shrink-0 px-3 pb-3 pt-2 text-sm font-medium';

export function ReportTabs({ groups, synthesis, latestSlug, accentGroupKey }: ReportTabsProps) {
  const synthesisSlugs = new Set(synthesis.map((report) => report.slug));
  const technical = (reports: ReportTabEntry[]) => reports.filter((report) => !synthesisSlugs.has(report.slug));
  const tabs: ReportTabGroup[] = [
    { key: ALL_TAB_KEY, label: 'All', description: '', reports: [...synthesis, ...technical(groups.flatMap((group) => group.reports))] },
    ...groups.map((group) => ({ ...group, reports: technical(group.reports) })),
  ];
  const accentSlugs = new Set(groups.find((group) => group.key === accentGroupKey)?.reports.map((report) => report.slug));

  const router = useRouter();
  const pathname = usePathname();
  // The URL is the truth. The grid renders outside the Suspense boundary that
  // reads it, so the prerendered All tab is hydrated in place, never swapped
  // out; `picked` leads the URL while a router.replace is in flight.
  const [urlParams, setUrlParams] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // how the visitor last changed tab: only a pointer change crossfades the grid
  const [switched, setSwitched] = useState<SwitchedBy | null>(null);
  const onUrlChange = useCallback((params: string) => {
    setUrlParams(params);
    setPicked(null);
  }, []);

  const requested = new URLSearchParams(urlParams ?? '').get(PHASE_PARAM);
  const fromUrl = tabs.find((tab) => tab.key === requested)?.key;
  const activeKey = picked ?? fromUrl ?? ALL_TAB_KEY;

  const select = (key: string, via: SwitchedBy) => {
    const params = new URLSearchParams(urlParams ?? '');
    if (key === ALL_TAB_KEY) params.delete(PHASE_PARAM);
    else params.set(PHASE_PARAM, key);
    const query = params.toString();
    setPicked(key);
    setSwitched(via);
    // the first-load entrance is over once the visitor acts
    document.documentElement.removeAttribute(ENTRANCE_ATTRIBUTE);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // leaving the archive closes the entrance window, so coming back through a
  // client navigation never replays it
  useEffect(() => () => document.documentElement.removeAttribute(ENTRANCE_ATTRIBUTE), []);

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsSync onChange={onUrlChange} />
      </Suspense>
      <TabbedReports
        tabs={tabs}
        activeKey={activeKey}
        switched={switched}
        onSelect={select}
        synthesisSlugs={synthesisSlugs}
        latestSlug={latestSlug}
        accentSlugs={accentSlugs}
      />
    </>
  );
}

// Reading the URL opts only this empty boundary out of the static prerender.
function SearchParamsSync({ onChange }: { onChange: (params: string) => void }) {
  const params = useSearchParams().toString();
  useEffect(() => onChange(params), [params, onChange]);
  return null;
}

interface TabbedReportsProps {
  tabs: ReportTabGroup[];
  activeKey: string;
  switched: SwitchedBy | null;
  onSelect: (key: string, via: SwitchedBy) => void;
  synthesisSlugs: Set<string>;
  latestSlug?: string;
  accentSlugs: Set<string>;
}

function TabbedReports({ tabs, activeKey, switched, onSelect, synthesisSlugs, latestSlug, accentSlugs }: TabbedReportsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const count = (group: ReportTabGroup) => group.reports.filter((report) => !synthesisSlugs.has(report.slug)).length;

  // Clips the highlighted copy of the row to the active tab (Emil Kowalski's
  // clip-path technique); globals.css transitions the clip. The first
  // placement lands without a transition, later ones move. Without motion
  // nothing is placed and the active tab keeps its own style and underline.
  useLayoutEffect(() => {
    const list = listRef.current;
    const highlight = highlightRef.current;
    if (!list || !highlight || document.documentElement.getAttribute(MOTION_ATTRIBUTE) !== 'on') return undefined;
    const place = () => {
      const tab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!tab) return;
      highlight.style.setProperty('--highlight-left', `${tab.offsetLeft}px`);
      highlight.style.setProperty('--highlight-right', `${highlight.offsetWidth - tab.offsetLeft - tab.offsetWidth}px`);
      if (list.hasAttribute('data-highlight')) return;
      list.setAttribute('data-highlight', 'placed');
      requestAnimationFrame(() => list.setAttribute('data-highlight', 'live'));
    };
    place();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeKey]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // step from the focused tab, which leads the URL while a replace is in flight
    const focused = tabs.findIndex((tab) => tabId(tab.key) === (e.target as HTMLElement).id);
    const current = focused >= 0 ? focused : tabs.findIndex((tab) => tab.key === activeKey);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onSelect(tabs[next].key, 'keyboard');
    document.getElementById(tabId(tabs[next].key))?.focus();
  };

  return (
    <div>
      <div className="entrance-group" style={{ '--group': TABS_ENTRANCE_GROUP } as CSSProperties}>
        <div
          ref={listRef}
          role="tablist"
          aria-label="Report categories"
          className="relative -mx-4 flex gap-1 overflow-x-auto px-4 pt-1 shadow-[inset_0_-1px_0_hsl(var(--border)/0.8)] scrollbar-none sm:mx-0 sm:px-0"
          onKeyDown={onKeyDown}
        >
          {tabs.map((group) => {
            const active = activeKey === group.key;
            return (
              <button
                key={group.key}
                id={tabId(group.key)}
                role="tab"
                aria-selected={active}
                aria-controls={`report-panel-${group.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onSelect(group.key, 'pointer')}
                className={`${TAB_BOX} transition-colors duration-fast ease-standard ${
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {group.label}
                <span className="ml-1.5 text-xs tabular-nums text-muted-foreground/70">{count(group)}</span>
                {active && <span aria-hidden="true" className="tab-underline absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
              </button>
            );
          })}
          {/* the row again in the active style, clipped to the active tab */}
          <div
            ref={highlightRef}
            aria-hidden="true"
            data-tab-highlight=""
            className="pointer-events-none absolute left-0 top-0 flex gap-1 px-4 pt-1 sm:px-0"
          >
            {tabs.map((group) => (
              <span key={group.key} className={`${TAB_BOX} text-foreground shadow-[inset_0_-2px_0_hsl(var(--primary))]`}>
                {group.label}
                <span className="ml-1.5 text-xs tabular-nums text-muted-foreground/70">{count(group)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {tabs.map((group) => {
        if (group.key !== activeKey) return null;
        return (
          <div
            key={group.key}
            id={`report-panel-${group.key}`}
            role="tabpanel"
            aria-labelledby={tabId(group.key)}
            data-tab-panel=""
            data-switched={switched === 'pointer' ? '' : undefined}
            className="pt-6 md:pt-8"
          >
            {group.description && <p className="mb-10 max-w-2xl text-sm leading-relaxed text-muted-foreground">{group.description}</p>}
            {group.reports.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No reports in this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
                {group.reports.map((report, index) => (
                  <Reveal
                    key={report.slug}
                    {...(index < ENTRANCE_CARDS
                      ? {
                          'data-entrance-card': '',
                          style: { '--entrance-i': Math.min(index, ENTRANCE_CARD_STEPS - 1) } as CSSProperties,
                        }
                      : {})}
                  >
                    <ReportCard
                      slug={report.slug}
                      title={report.title}
                      description={report.description}
                      synthesis={synthesisSlugs.has(report.slug)}
                      latest={report.slug === latestSlug}
                      accent={accentSlugs.has(report.slug)}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
