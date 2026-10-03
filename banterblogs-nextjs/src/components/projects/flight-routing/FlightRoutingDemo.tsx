'use client';

import { useRef } from 'react';
import type { PolicyWorlds } from '@/lib/projects/flight-routing/worlds';
import { revealResult } from '../reveal';
import { ReplayLab } from './ReplayLab';
import { useFlightDemo, type Selection } from './useFlightDemo';
import { WorldGrid } from './WorldGrid';
import styles from './demo.module.css';

/**
 * The flight routing page's live demo: four strategies over the same 64
 * seeded scenarios, then any one scenario replayed decision by decision. The
 * server computes the opening grid, so it is on screen at first paint.
 */
export function FlightRoutingDemo({ initialWorlds }: { initialWorlds: PolicyWorlds[] }) {
  const demo = useFlightDemo(initialWorlds);
  const replayRef = useRef<HTMLElement>(null);
  // the replay sits below the grid; a square's click brings it into view, and
  // from the keyboard focus follows it there, so the focus ring stays on screen
  const select = (selection: Selection, fromKeyboard: boolean) => {
    demo.select(selection);
    revealResult(replayRef.current);
    if (fromKeyboard) replayRef.current?.querySelector<HTMLElement>('h3[tabindex="-1"]')?.focus({ preventScroll: true });
  };
  return (
    <div className={styles.demo}>
      <WorldGrid config={demo.config} worlds={demo.worlds} selection={demo.selection} onSelect={select} onConfigure={demo.configure} />
      <ReplayLab demo={demo} ref={replayRef} />
    </div>
  );
}
