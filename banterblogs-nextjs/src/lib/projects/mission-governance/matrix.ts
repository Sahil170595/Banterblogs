import { LONG_MISSION } from './contract';
import { FAULTS, fly, type Fault, type Flight } from './engine';

// Every fault, present at the pre-flight check or starting mid-flight, on the
// sample route flown twice: what the validator says and how the flight ends.

/** a mid-flight fault starts after this many waypoints */
export const MID_FLIGHT_AFTER = 2;

export interface MatrixRow {
  fault: Fault;
  atCheck: Flight;
  midFlight: Flight;
}

export function faultMatrix(): MatrixRow[] {
  return FAULTS.map((fault) => ({
    fault,
    atCheck: fly(LONG_MISSION, { fault, when: 'validation', afterPolls: 0, stall: false }),
    midFlight: fly(LONG_MISSION, { fault, when: 'flight', afterPolls: MID_FLIGHT_AFTER, stall: false }),
  }));
}

/** a flight that finished its route while the guard was reporting a telemetry problem */
export const flewBlind = (flight: Flight) => flight.state === 'completed' && flight.logged.length > 0;
