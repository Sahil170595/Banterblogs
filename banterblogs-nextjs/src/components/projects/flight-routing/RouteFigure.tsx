import { AIRPORTS, getScenario, type Airport } from '@/lib/projects/flight-routing/fixtures';
import { candidates, type Episode } from '@/lib/projects/flight-routing/engine';
import { along } from '../geometry';
import styles from './demo.module.css';

// The network as a schematic: airports placed for legibility, not distance.
// Flown legs are solid, a failed attempt red, the legal next flights dashed
// and the chosen one ember. Labels are HTML over the drawing, so they keep
// their size when the drawing scales down on a phone.

const VIEW = { width: 600, height: 280 };
// a layout for reading, west to east with the hub below and the dead end above
const PLACES: Record<Airport, { x: number; y: number }> = {
  SFO: { x: 50, y: 150 },
  DEN: { x: 250, y: 225 },
  ORD: { x: 330, y: 40 },
  JFK: { x: 550, y: 140 },
};
// how far each flight's curve bows from the straight line, so the two nonstops and the two Denver legs stay apart
const BEND: Record<string, number> = { F3: -110, F4: 20, F5: -30, F6: 70 };
const NODE_RADIUS = 6;
const RING_RADIUS = 14;
const NAME_OFFSET = 22;
const AIRPORT_CODES = AIRPORTS.map((n) => n.code);
// the codes stay on the drawing, where a city name would crowd the edges; the key names them
const CITIES: Record<Airport, string> = { SFO: 'San Francisco', DEN: 'Denver', ORD: 'Chicago', JFK: 'New York' };

const at = (x: number, y: number) => ({ left: along(x, 0, VIEW.width), top: along(y, 0, VIEW.height) });

export function RouteFigure({ state, chosenId }: { state: Episode; chosenId?: string }) {
  const scenario = getScenario(state.config.scenario);
  const legal = new Set(candidates(state).map((f) => f.id));
  const edges = scenario.flights.map((flight) => {
    const a = PLACES[flight.origin];
    const b = PLACES[flight.dest];
    const leg = state.legs.find((l) => l.flight.id === flight.id);
    const failed = leg && (leg.outcome.cancelled || (leg.outcome.diverted && !leg.outcome.reached));
    const kind = failed ? 'failed' : leg ? 'flown' : flight.id === chosenId ? 'chosen' : legal.has(flight.id) ? 'legal' : 'idle';
    const bend = BEND[flight.id] ?? 0;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    // a quadratic curve's midpoint sits half the bend from the chord
    return { id: flight.id, kind, d: `M ${a.x} ${a.y} Q ${mx} ${my + bend} ${b.x} ${b.y}`, label: at(mx, my + bend / 2) };
  });
  return (
    <figure className={styles.routeFigure}>
      <div className={styles.routeCanvas}>
        <svg
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          role="img"
          aria-label={`Route network. Passenger at ${state.airport}, bound for ${scenario.destination}. ${state.legs.length} of ${state.config.maxAttempts} flight attempts used.`}
        >
          {edges.map((edge) => (
            <path key={edge.id} className={styles.edge} data-kind={edge.kind} d={edge.d} />
          ))}
          {AIRPORT_CODES.map((code) => (
            <g key={code} className={styles.node} data-destination={code === scenario.destination || undefined}>
              {code === state.airport && <circle cx={PLACES[code].x} cy={PLACES[code].y} r={RING_RADIUS} className={styles.ring} />}
              <circle cx={PLACES[code].x} cy={PLACES[code].y} r={NODE_RADIUS} className={styles.dot} />
            </g>
          ))}
        </svg>
        {edges.map((edge) => (
          <span key={edge.id} aria-hidden="true" className={styles.edgeLabel} data-kind={edge.kind} style={edge.label}>
            {edge.id}
          </span>
        ))}
        {AIRPORT_CODES.map((code) => (
          <span key={code} aria-hidden="true" className={styles.airportLabel} style={at(PLACES[code].x, PLACES[code].y + NAME_OFFSET)}>
            {code}
          </span>
        ))}
      </div>
      <figcaption className={styles.edgeKey}>
        <span data-kind="flown">Flown</span>
        <span data-kind="failed">Failed</span>
        <span data-kind="chosen">Next choice</span>
        <span data-kind="legal">Bookable</span>
        <span>Ring: where the passenger is</span>
        <span className={styles.cityKey}>{AIRPORT_CODES.map((code) => `${code} ${CITIES[code]}`).join(' · ')}</span>
      </figcaption>
    </figure>
  );
}
