'use client';

import { useEffect, useId, useState } from 'react';
import { ChevronRight, Hash, Eye, EyeOff, BookOpen } from 'lucide-react';
import type { TocEntry } from '@/lib/episodes';

// Sticky table-of-contents rail for episode pages. The page gives it its own
// grid column beside the article (xl and up), so it can never cover the text.
//
// Receives the headings (with the real rehype-slug ids) from the server page
// instead of the full article HTML — the previous version parsed a detached
// DOM copy and invented `heading-N` ids that never existed in the rendered
// document, so clicking a TOC entry did nothing.
//
// Rendered with the article, not faded in after load. Collapsing animates the
// list's grid row from 1fr to 0fr in CSS; the collapsed list is inert.

interface TableOfContentsProps {
  headings: TocEntry[];
  className?: string;
}

export function TableOfContents({ headings, className = '' }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);
  const listId = useId();

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px', threshold: 0 },
    );

    headings.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 2:
        return 'text-primary';
      case 3:
        return 'text-accent';
      default:
        return 'text-muted-foreground';
    }
  };

  if (headings.length === 0) return null;

  const activeIndex = headings.findIndex((item) => item.id === activeId);
  const progressPct = Math.round(((activeIndex + 1) / headings.length) * 100);

  return (
    <div className={`sticky top-24 ${className}`}>
      <nav
        aria-label="Table of contents"
        className="bg-background/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">Contents</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls={listId}
            aria-label={isExpanded ? 'Collapse table of contents' : 'Expand table of contents'}
            className="p-1 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors duration-fast ease-standard"
          >
            {isExpanded ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

        {/* Content */}
        <div
          id={listId}
          inert={isExpanded ? undefined : true}
          className={`grid transition-[grid-template-rows,opacity] duration-base ease-standard ${
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {headings.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToHeading(item.id)}
                    aria-current={activeId === item.id ? 'location' : undefined}
                    className={`w-full text-left p-2 rounded-lg transition-colors duration-fast ease-standard ${
                      activeId === item.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                    style={{ paddingLeft: `${(item.level - 2) * 0.75 + 0.5}rem` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={getLevelColor(item.level)} aria-hidden="true">
                        {item.level <= 3 ? <Hash className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </div>
                      <span className="text-sm font-medium truncate">{item.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Reading Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </nav>
    </div>
  );
}
