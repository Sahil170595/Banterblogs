'use client';

import { useState } from 'react';
import Link from 'next/link';

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

export function ReportTabs({ groups, featuredSlugs }: ReportTabsProps) {
  const [activeTab, setActiveTab] = useState(groups[0]?.key ?? '');
  const featuredSet = new Set(featuredSlugs);

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Report categories"
        className="flex gap-1 overflow-x-auto border-b border-border/40 mb-10 pb-px scrollbar-none"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          const idx = groups.findIndex((g) => g.key === activeTab);
          const next = e.key === 'ArrowRight' ? (idx + 1) % groups.length : (idx - 1 + groups.length) % groups.length;
          setActiveTab(groups[next].key);
          document.getElementById(`report-tab-${groups[next].key}`)?.focus();
        }}
      >
        {groups.map((group) => (
          <button
            key={group.key}
            id={`report-tab-${group.key}`}
            role="tab"
            aria-selected={activeTab === group.key}
            aria-controls={`report-panel-${group.key}`}
            tabIndex={activeTab === group.key ? 0 : -1}
            onClick={() => setActiveTab(group.key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-semibold transition-colors relative ${
              activeTab === group.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {group.label}
            <span className="ml-1.5 text-xs text-muted-foreground/70">
              {group.reports.filter((r) => !featuredSet.has(r.slug)).length}
            </span>
            {activeTab === group.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {groups.map((group) => {
        if (group.key !== activeTab) return null;
        const visibleReports = group.reports.filter((r) => !featuredSet.has(r.slug));

        return (
          <div
            key={group.key}
            id={`report-panel-${group.key}`}
            role="tabpanel"
            aria-labelledby={`report-tab-${group.key}`}
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
                    className="block group rounded-xl border border-border/50 bg-card/30 p-5 hover:bg-muted/20 hover:border-border transition-all"
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
