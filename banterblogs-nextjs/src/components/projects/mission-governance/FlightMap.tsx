import type { Mission } from '@/lib/projects/mission-governance/contract';
import { legsLeavingFence, type Flight } from '@/lib/projects/mission-governance/engine';
import { along } from '../geometry';
import styles from './mission.module.css';

// The fence, the route and how far the flight got, drawn over the fence's
// own longitude and latitude (scaled for the latitude). Flown legs are
// solid; the rest dashed; a return to launch is a ring at the last waypoint
// reached; a leg that leaves the fence is marked where it crosses. Waypoint
// numbers sit over the drawing as text, so they keep their size at any width.

const W = 320;
const H = 220;
const PAD = 18;
// frame the route alone when it spans less than this share of the fence
const ROUTE_ZOOM_BELOW = 0.2;
const ROUTE_MARGIN = 0.4;
// a route of one point still gets a frame of about 20 metres
const MIN_SPAN_DEG = 0.0002;

export function FlightMap({ mission, flight }: { mission: Mission; flight: Flight }) {
  const fenceLons = mission.geofence.map(([lon]) => lon);
  const fenceLats = mission.geofence.map(([, lat]) => lat);
  const routeLons = mission.waypoints.map((w) => w.lon);
  const routeLats = mission.waypoints.map((w) => w.lat);
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  // a route small against its fence is framed on its own, padded; else the fence is
  const zoom = Math.max(span(routeLons) / span(fenceLons), span(routeLats) / span(fenceLats)) < ROUTE_ZOOM_BELOW;
  const pad = (values: number[]) => {
    const margin = Math.max(span(values), MIN_SPAN_DEG) * ROUTE_MARGIN;
    return [Math.min(...values) - margin, Math.max(...values) + margin];
  };
  const [minLon, maxLon] = zoom ? pad(routeLons) : [Math.min(...fenceLons), Math.max(...fenceLons)];
  const [minLat, maxLat] = zoom ? pad(routeLats) : [Math.min(...fenceLats), Math.max(...fenceLats)];
  const squash = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLon - minLon) * squash;
  const spanY = maxLat - minLat;
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const ox = (W - spanX * scale) / 2;
  const oy = (H - spanY * scale) / 2;
  const x = (lon: number) => ox + (lon - minLon) * squash * scale;
  const y = (lat: number) => H - oy - (lat - minLat) * scale;
  const fence = mission.geofence.map(([lon, lat]) => `${x(lon).toFixed(1)},${y(lat).toFixed(1)}`).join(' ');
  const points = mission.waypoints.map((w) => [x(w.lon), y(w.lat)] as const);
  const flown = points.slice(0, flight.flown ? flight.progress : 0);
  const path = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('');
  const exits = legsLeavingFence(mission);
  const last = flown.at(-1);
  // a route flown twice visits each place twice: one label per place, "1 · 4"
  const places = new Map<string, { at: readonly [number, number]; seqs: number[] }>();
  mission.waypoints.forEach((w, i) => {
    const key = `${w.lon},${w.lat}`;
    const place = places.get(key) ?? { at: points[i], seqs: [] };
    place.seqs.push(w.seq);
    places.set(key, place);
  });
  // each label sits on the side of its point away from the route's middle, off the legs
  const middle = [...places.values()].reduce(([sx, sy], { at: [px, py] }) => [sx + px / places.size, sy + py / places.size], [0, 0]);
  const caption = flight.flown ? `${flight.progress} of ${points.length} waypoints flown` : 'not flown: stopped before take-off';
  return (
    <figure className={styles.mapFigure}>
      <div className={styles.mapFrame}>
        <svg className={styles.map} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Fence and route: ${caption}`}>
          <polygon className={styles.fence} points={fence} />
          <path className={styles.planned} d={path(points)} />
          {flown.length > 1 && <path className={styles.flown} d={path(flown)} />}
          {points.map(([px, py], i) => (
            <circle key={i} className={i < flown.length ? styles.reached : styles.waypoint} cx={px} cy={py} r={3.5} />
          ))}
          {flight.state === 'rtl' && last && <circle className={styles.rtl} cx={last[0]} cy={last[1]} r={8} />}
          {exits.map((leg, i) => (
            <circle key={i} className={styles.exit} cx={x(leg.exit.lon)} cy={y(leg.exit.lat)} r={5} />
          ))}
        </svg>
        {[...places.values()].map(({ at: [px, py], seqs }) => (
          <span
            key={seqs.join()}
            className={styles.waypointLabel}
            data-x={px < middle[0] ? 'left' : 'right'}
            data-y={py < middle[1] ? 'above' : 'below'}
            style={{ left: along(px, 0, W), top: along(py, 0, H) }}
            aria-hidden="true"
          >
            {seqs.join(' · ')}
          </span>
        ))}
      </div>
      <figcaption className={styles.mapCaption}>
        <strong>Fence and route: {caption}</strong>
        <span className={styles.mapLegend}>
          <span>
            <i className={styles.keyFlown} /> flown
          </span>
          <span>
            <i className={styles.keyPlanned} /> not flown yet
          </span>
          {!zoom && (
            <span>
              <i className={styles.keyFence} /> fence
            </span>
          )}
          {flight.state === 'rtl' && (
            <span>
              <i className={styles.keyRtl} /> where it turned for home
            </span>
          )}
          {exits.length > 0 && (
            <span>
              <i className={styles.keyExit} /> where a leg leaves the fence
            </span>
          )}
        </span>
        {zoom && <span>Zoomed to the route; the fence is far outside this view.</span>}
      </figcaption>
    </figure>
  );
}
