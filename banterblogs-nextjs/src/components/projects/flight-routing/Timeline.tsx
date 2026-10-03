import type { CSSProperties } from 'react';
import { candidates, formatTime, type Episode } from '@/lib/projects/flight-routing/engine';
import { getScenario } from '@/lib/projects/flight-routing/fixtures';
import { along, span } from '../geometry';
import styles from './demo.module.css';

// Every flight on one clock from 00:00 to the horizon: its schedule as a thin
// bar, what actually happened as a thick one, with the deadline and the
// passenger's clock as rules across all lanes.

const pct = (minutes: number, horizon: number) => along(minutes, 0, horizon);

export function Timeline({ state }: { state: Episode }) {
  const { horizon, deadline } = state.config;
  const legal = new Set(candidates(state).map((f) => f.id));
  return (
    <figure className={styles.timeline} aria-label={`Flight timeline, 00:00 to ${formatTime(horizon)}`}>
      <p className={styles.timelineTitle}>
        Flight schedule: thin bars are the timetable, thick bars what actually flew. The dashed line is the deadline, the solid one the
        passenger&apos;s clock.
      </p>
      <div className={styles.lanes} style={{ '--deadline': pct(deadline, horizon), '--clock': pct(state.clock, horizon) } as CSSProperties}>
        <span className={styles.deadlineRule} title={`Deadline ${formatTime(deadline)}`} />
        <span className={styles.clockRule} title={`Passenger clock ${formatTime(state.clock)}`} />
        {getScenario(state.config.scenario).flights.map((flight) => {
          const leg = state.legs.find((l) => l.flight.id === flight.id);
          const failed = leg && (leg.outcome.cancelled || (leg.outcome.diverted && !leg.outcome.reached));
          return (
            <div key={flight.id} className={styles.lane}>
              <span className={styles.laneLabel}>{flight.id}</span>
              <div className={styles.track}>
                <span
                  className={styles.scheduled}
                  data-legal={legal.has(flight.id) || undefined}
                  style={span(flight.depart, flight.arrive, 0, horizon)}
                  title={`${flight.origin} to ${flight.dest}, scheduled ${formatTime(flight.depart)}–${formatTime(flight.arrive)}`}
                />
                {leg && leg.departure !== null && leg.arrival !== null && (
                  <span
                    className={styles.actual}
                    data-failed={failed || undefined}
                    style={span(leg.departure, leg.arrival, 0, horizon)}
                    title={`Flew ${formatTime(leg.departure)}–${formatTime(leg.arrival)}`}
                  />
                )}
                {leg?.outcome.cancelled && (
                  <span className={styles.cancelled} style={{ left: pct(flight.depart, horizon) }} title="Cancelled">
                    ×
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className={styles.axis}>
        <span>00:00</span>
        <span className={styles.deadlineKey}>Deadline {formatTime(deadline)}</span>
        <span>{formatTime(horizon)}</span>
      </figcaption>
    </figure>
  );
}
