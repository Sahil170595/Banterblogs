export type Airport = 'SFO' | 'DEN' | 'ORD' | 'JFK';
export type Profile = 'clear' | 'balanced' | 'storm';
export type ScenarioId = 'west-east' | 'east-west';
export interface Flight { id: string; origin: Airport; dest: Airport; depart: number; arrive: number; }
export interface Outcome {
  id: string; cancelled: boolean; diverted: boolean; reached: boolean;
  depDelay: number | null; arrDelay: number | null; divDelay: number | null; divAirport: Airport | null;
}
export const FIXTURE_VERSION = 'synthetic-network-v1';
export const AIRPORTS: { code: Airport; x: number; y: number }[] = [
  { code: 'SFO', x: 65, y: 180 }, { code: 'DEN', x: 210, y: 135 },
  { code: 'ORD', x: 365, y: 95 }, { code: 'JFK', x: 520, y: 120 },
];

export function getScenario(id: ScenarioId) {
  if (id !== 'west-east' && id !== 'east-west') throw new Error('Choose a listed route.');
  const origin: Airport = id === 'west-east' ? 'SFO' : 'JFK';
  const destination: Airport = id === 'west-east' ? 'JFK' : 'SFO';
  const flights: Flight[] = [
    { id: 'F1', origin, dest: 'ORD', depart: 45, arrive: 160 },
    { id: 'F2', origin, dest: 'DEN', depart: 90, arrive: 200 },
    { id: 'F3', origin, dest: destination, depart: 150, arrive: 480 },
    { id: 'F4', origin, dest: destination, depart: 300, arrive: 600 },
    { id: 'F5', origin: 'DEN', dest: destination, depart: 260, arrive: 470 },
    { id: 'F6', origin: 'DEN', dest: destination, depart: 440, arrive: 650 },
  ];
  return { origin, destination, flights };
}

export function outcomePool(flight: Flight, profile: Profile): Outcome[] {
  if (!['clear', 'balanced', 'storm'].includes(profile)) throw new Error('Choose a listed disruption profile.');
  const ordinary = (i: number, delay = 0): Outcome => ({ id: `${flight.id}-donor-${i}`, cancelled: false, diverted: false, reached: false, depDelay: delay, arrDelay: delay, divDelay: null, divAirport: null });
  if (profile === 'clear') return Array.from({ length: 10 }, (_, i) => ordinary(i));
  const pool = Array.from({ length: 10 }, (_, i) => ordinary(i));
  pool[0] = { ...ordinary(0), cancelled: true, depDelay: null, arrDelay: null };
  pool[1] = ordinary(1, 180);
  // F4 exposes an unresolved diversion; the environment must not teleport to it.
  if (flight.id === 'F4') pool[1] = { ...ordinary(1), diverted: true, divDelay: 50, divAirport: 'DEN' };
  if (profile === 'storm') {
    pool[2] = { ...ordinary(2), cancelled: true, depDelay: null, arrDelay: null };
    pool[3] = { ...ordinary(3), diverted: true, reached: true, divDelay: 240 };
    pool[4] = ordinary(4, 120);
    pool[5] = ordinary(5, 60);
  }
  return pool;
}
