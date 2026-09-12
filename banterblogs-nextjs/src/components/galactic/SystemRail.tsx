'use client';

import type { MouseEvent } from 'react';
import { TrackingTicker } from './TrackingTicker';
import { STAR_SYSTEMS, type StarSystemDef } from './systems';

interface SystemRailProps {
  activeSystem: StarSystemDef | null;
  onPreview: (name: string, hovering: boolean) => void;
  onSelect: (system: StarSystemDef, trigger: HTMLAnchorElement) => void;
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

// Focus that lands within this window of a pointer press is treated as
// pointer-driven, not keyboard navigation.
const POINTER_FOCUS_WINDOW_MS = 400;
let lastPointerDownAt = -Infinity;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    () => {
      lastPointerDownAt = performance.now();
    },
    { capture: true, passive: true },
  );
}

/**
 * True when focus arrived by keyboard rather than a pointer press.
 *
 * Closing a selection card restores focus to the rail anchor that opened it.
 * On the mouse path that restored focus previously fired onPreview and pinned
 * the ticker's pause flag forever — no blur ever follows, so the nine-system
 * tour froze for the rest of the visit. Keyboard focus SHOULD still hold the
 * tour, so this distinguishes the two rather than dropping the pause.
 *
 * :focus-visible would be the natural test, but jsdom reports false for it,
 * which would silently disable the keyboard path in tests.
 */
function isKeyboardFocus(): boolean {
  return performance.now() - lastPointerDownAt > POINTER_FOCUS_WINDOW_MS;
}

export function SystemRail({ activeSystem, onPreview, onSelect }: SystemRailProps) {
  const activeIndex = activeSystem ? STAR_SYSTEMS.indexOf(activeSystem) : -1;

  return (
    <nav
      aria-label="Systems orbiting the Chimera core"
      className="galactic-system-rail pointer-events-auto absolute bottom-24 left-4 right-[4.5rem] z-30 sm:left-8 sm:right-[4.5rem]"
    >
      <div className="grid items-end gap-3 border-t border-white/15 pt-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-8 xl:pt-4">
        <div className="min-h-[78px] min-w-0">
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
                  aria-current={active ? 'step' : undefined}
                  className={`galactic-rail-link group relative block h-11 border-t pt-2 font-mono text-[8px] tracking-[0.08em] transition-colors sm:text-[9px] ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-white/15 text-foreground/35 hover:border-white/55 hover:text-foreground'
                  }`}
                  onMouseEnter={() => onPreview(system.name, true)}
                  onMouseLeave={() => onPreview(system.name, false)}
                  onFocus={() => {
                    // Only KEYBOARD focus should hold the tour. Closing a card
                    // restores focus to this anchor programmatically; on the
                    // mouse path that is not :focus-visible, and pausing there
                    // froze the auto-tour permanently (no blur ever follows).
                    if (isKeyboardFocus()) {
                      onPreview(system.name, true);
                    }
                  }}
                  onBlur={() => onPreview(system.name, false)}
                  onClick={(event) => {
                    if (isModifiedClick(event)) return;
                    event.preventDefault();
                    onSelect(system, event.currentTarget);
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span className="sr-only">
                    {system.name}. {system.blurb}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute -top-[3px] left-0 h-[5px] w-[5px] rounded-full transition-[background-color,box-shadow] ${
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
