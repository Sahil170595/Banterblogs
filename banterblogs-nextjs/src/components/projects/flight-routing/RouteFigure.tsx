import { AIRPORTS, getScenario } from '@/lib/projects/flight-routing/fixtures';
import { candidates, type Episode } from '@/lib/projects/flight-routing/engine';
import styles from './lab.module.css';

export function RouteFigure({ state, selectedId }: { state: Episode; selectedId?: string }) {
  const scenario = getScenario(state.config.scenario);
  const available = candidates(state);
  return <figure className={styles.routeFigure}>
    <figcaption><h2>Route network</h2><span>Schematic, not geographic distance</span></figcaption>
    <svg viewBox="0 0 600 290" role="img" aria-label={`Routing network. Passenger at ${state.airport}; destination ${scenario.destination}. ${state.legs.length} flight outcomes observed.`}>
      <defs><marker id="flight-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
      {scenario.flights.map((f, i) => {
        const a = AIRPORTS.find(n => n.code === f.origin)!;
        const b = AIRPORTS.find(n => n.code === f.dest)!;
        const leg = state.legs.find(l => l.flight.id === f.id);
        const failed = leg?.outcome.cancelled || (leg?.outcome.diverted && !leg.outcome.reached);
        const legal = available.some(l => l.id === f.id);
        const bend = f.id === 'F4' ? 105 : f.id === 'F6' ? 45 : -20;
        return <g key={f.id} className={failed ? styles.failedEdge : leg ? styles.observedEdge : f.id === selectedId ? styles.selectedEdge : legal ? styles.legalEdge : styles.inactiveEdge}>
          <path d={`M ${a.x} ${a.y} Q ${(a.x+b.x)/2} ${(a.y+b.y)/2+bend} ${b.x} ${b.y}`} fill="none" stroke="currentColor" strokeWidth={leg || f.id === selectedId ? 3 : 1.5} strokeDasharray={leg ? undefined : '5 5'} markerEnd="url(#flight-arrow)" />
          <text x={(a.x+b.x)/2} y={(a.y+b.y)/2+bend/2 + (i === 0 ? -8 : 12)} textAnchor="middle" fill="currentColor" fontSize="13">{f.id}</text>
        </g>;
      })}
      {AIRPORTS.map(n => <g key={n.code}>
        {n.code === state.airport && <circle cx={n.x} cy={n.y} r="18" className={styles.currentRing} />}
        <circle cx={n.x} cy={n.y} r="7" className={n.code === scenario.destination ? styles.destinationNode : styles.airportNode} />
        <text x={n.x} y={n.y + 34} textAnchor="middle" className={styles.airportLabel}>{n.code}</text>
      </g>)}
    </svg>
    <div className={styles.legend}><span className={styles.blue}>Available / selected</span><span className={styles.green}>Observed</span><span className={styles.red}>Failed attempt</span><span>Ring: passenger</span></div>
  </figure>;
}
