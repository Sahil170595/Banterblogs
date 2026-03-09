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
      <div className="flex gap-1 overflow-x-auto border-b border-border/40 mb-10 pb-px scrollbar-none">
        {groups.map((group) => (
          <button
            key={group.key}
            onClick={() => setActiveTab(group.key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-semibold transition-colors relative ${
              activeTab === group.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {group.label}
            <span className="ml-1.5 text-xs text-muted-foreground/60">
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
          <div key={group.key}>
            {group.description && (
              <p className="text-sm text-muted-foreground/70 mb-8 max-w-2xl">{group.description}</p>
            )}
            {visibleReports.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 italic">
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
