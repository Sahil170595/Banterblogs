'use client';

import type { PolicyWorlds } from '@/lib/projects/flight-routing/worlds';
import { ReplayLab } from './ReplayLab';
import { useFlightDemo } from './useFlightDemo';
import { WorldGrid } from './WorldGrid';
import styles from './demo.module.css';

/**
 * The flight routing page's live demo: four policies over the same 64 seeded
 * worlds, then any one world replayed decision by decision. The server
 * computes the opening grid, so it is on screen at first paint.
 */
export function FlightRoutingDemo({ initialWorlds }: { initialWorlds: PolicyWorlds[] }) {
  const demo = useFlightDemo(initialWorlds);
  return (
    <div className={styles.demo}>
      <WorldGrid config={demo.config} worlds={demo.worlds} selection={demo.selection} onSelect={demo.select} onConfigure={demo.configure} />
      <ReplayLab demo={demo} />
    </div>
  );
}
