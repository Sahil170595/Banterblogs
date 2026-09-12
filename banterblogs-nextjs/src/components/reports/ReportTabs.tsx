'use client';

import { Suspense, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NAV_FORWARD } from './ReportTransitions';

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
  featuredSlugs: string[];
}

// The default tab lists every report; any other tab lives in ?phase=<key>.
export const ALL_TAB_KEY = 'all';
export const PHASE_PARAM = 'phase';

export function ReportTabs({ groups, featuredSlugs }: ReportTabsProps) {
  const tabs: ReportTabGroup[] = [
    {
      key: ALL_TAB_KEY,
      label: 'All',
      description: 'Every technical report, newest phase first.',
      reports: groups.flatMap((group) => group.reports),
    },
    ...groups,
  ];

  // Reading the URL opts this subtree out of the static prerender; the
  // fallback is what the prerendered HTML carries — the All tab, the same
  // default a URL without ?phase= resolves to.
  return (
    <Suspense fallback={<TabbedReports tabs={tabs} featuredSlugs={featuredSlugs} activeKey={ALL_TAB_KEY} />}>
      <UrlSyncedTabs tabs={tabs} featuredSlugs={featuredSlugs} />
    </Suspense>
  );
}

function UrlSyncedTabs({ tabs, featuredSlugs }: { tabs: ReportTabGroup[]; featuredSlugs: string[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = searchParams.get(PHASE_PARAM);
  const activeKey = tabs.find((tab) => tab.key === requested)?.key ?? ALL_TAB_KEY;

  const select = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === ALL_TAB_KEY) params.delete(PHASE_PARAM);
    else params.set(PHASE_PARAM, key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return <TabbedReports tabs={tabs} featuredSlugs={featuredSlugs} activeKey={activeKey} onSelect={select} />;
}

interface TabbedReportsProps {
  tabs: ReportTabGroup[];
  featuredSlugs: string[];
  activeKey: string;
  /** absent in the prerendered fallback, which hydration replaces */
  onSelect?: (key: string) => void;
}

const tabId = (key: string) => `report-tab-${key}`;

function TabbedReports({ tabs, featuredSlugs, activeKey, onSelect }: TabbedReportsProps) {
  const featuredSet = new Set(featuredSlugs);

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
    onSelect?.(tabs[next].key);
    document.getElementById(tabId(tabs[next].key))?.focus();
  };

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Report categories"
        className="flex gap-1 overflow-x-auto border-b border-border/40 mb-10 pb-px scrollbar-none"
        onKeyDown={onKeyDown}
      >
        {tabs.map((group) => (
          <button
            key={group.key}
            id={tabId(group.key)}
            role="tab"
            aria-selected={activeKey === group.key}
            aria-controls={`report-panel-${group.key}`}
            tabIndex={activeKey === group.key ? 0 : -1}
            onClick={() => onSelect?.(group.key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-semibold transition-colors relative ${
              activeKey === group.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {group.label}
            <span className="ml-1.5 text-xs text-muted-foreground/70">
              {group.reports.filter((r) => !featuredSet.has(r.slug)).length}
            </span>
            {activeKey === group.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {tabs.map((group) => {
        if (group.key !== activeKey) return null;
        const visibleReports = group.reports.filter((r) => !featuredSet.has(r.slug));

        return (
          <div
            key={group.key}
            id={`report-panel-${group.key}`}
            role="tabpanel"
            aria-labelledby={tabId(group.key)}
          >
            {group.description && (
              <p className="text-sm text-muted-foreground/70 mb-8 max-w-2xl">{group.description}</p>
            )}
            {visibleReports.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 italic">
                All reports in this category are featured above.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibleReports.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/reports/${r.slug}`}
                    transitionTypes={[NAV_FORWARD]}
                    className="block group rounded-xl border border-border/50 bg-card/30 p-5 hover:bg-muted/20 hover:border-border transition-colors"
                  >
                    <div className="mb-3">
                      <div className="text-base font-semibold group-hover:text-primary transition-colors leading-snug">
                        {r.title}
                      </div>
                    </div>
                    {r.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                        {r.description}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      View Report <span>&rarr;</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
