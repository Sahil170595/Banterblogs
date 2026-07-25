'use client';

import type { MouseEvent } from 'react';
import { TrackingTicker } from './TrackingTicker';
import { STAR_SYSTEMS, type StarSystemDef } from './systems';

interface SystemRailProps {
  activeSystem: StarSystemDef | null;
  onPreview: (name: string, hovering: boolean) => void;
  onSelect: (system: StarSystemDef) => void;
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function SystemRail({ activeSystem, onPreview, onSelect }: SystemRailProps) {
  const activeIndex = activeSystem ? STAR_SYSTEMS.indexOf(activeSystem) : -1;

  return (
    <nav
      aria-label="Systems orbiting the Chimera core"
      className="galactic-system-rail pointer-events-auto absolute bottom-4 left-4 right-[4.5rem] z-30 mx-auto max-w-[1440px] sm:inset-x-8 sm:bottom-7"
    >
      <div className="grid items-end gap-4 border-t border-white/15 pt-3 md:grid-cols-[minmax(250px,0.75fr)_minmax(420px,1.25fr)] md:gap-8 md:pt-4">
        <div className="min-h-[66px]">
          {activeSystem ? (
            <TrackingTicker
              system={activeSystem}
              position={activeIndex + 1}
              total={STAR_SYSTEMS.length}
            />
          ) : (
            <div
              aria-hidden="true"
              className="pointer-events-none font-mono uppercase tracking-[0.12em]"
            >
              <p className="text-[9px] text-primary/80">Observatory / cold open</p>
              <p className="mt-2 text-[11px] text-foreground/70">Acquiring nine-system atlas</p>
            </div>
          )}
        </div>

        <ol className="grid grid-cols-9 gap-1.5 sm:gap-2" aria-label="System index">
          {STAR_SYSTEMS.map((system, index) => {
            const active = system === activeSystem;
            return (
              <li key={system.name}>
                <a
                  href={system.href}
                  aria-label={`${String(index + 1).padStart(2, '0')} — ${system.name}`}
                  aria-current={active ? 'true' : undefined}
                  className={`galactic-rail-link group relative block h-11 border-t pt-2 font-mono text-[8px] tracking-[0.08em] transition-colors sm:text-[9px] ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-white/15 text-foreground/35 hover:border-white/55 hover:text-foreground'
                  }`}
                  onMouseEnter={() => onPreview(system.name, true)}
                  onMouseLeave={() => onPreview(system.name, false)}
                  onFocus={() => onPreview(system.name, true)}
                  onBlur={() => onPreview(system.name, false)}
                  onClick={(event) => {
                    if (isModifiedClick(event)) return;
                    event.preventDefault();
                    onSelect(system);
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span className="sr-only">
                    {system.name}. {system.blurb}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute -top-[3px] left-0 h-[5px] w-[5px] rounded-full transition-all ${
                      active
                        ? 'bg-primary shadow-[0_0_12px_hsl(var(--primary))]'
                        : 'bg-white/25 group-hover:bg-white/70'
                    }`}
                  />
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
