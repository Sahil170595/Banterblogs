import type { Preset, Session } from './types';
import { MAX_EVENTS } from './types';

export const presetTitles: Record<Preset, string> = {
  baseline: 'Review workload', tight: 'Closing-time capacity conflict', 'after-hours': 'No open window',
};
export function syntheticEvents(count: number): Session['events'] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_EVENTS) throw new Error(`Use 1 to ${MAX_EVENTS} synthetic events.`);
  return Array.from({ length: count }, (_, index) => ({
    id: `E${String(index + 1).padStart(2, '0')}`,
    text: `Work item ${index + 1}: prepare the synthetic status summary for the next scheduled review.`,
  }));
}
export function makeSession(preset: Preset = 'baseline'): Session {
  const session: Session = {
    config: {
      seed: 41, start: '2026-01-12T10:00:00Z', durationMinutes: 90,
      wpmMean: 50, wpmStd: 15, pauseProbability: 0.4, jitterStd: 20,
      clusterShare: 0.2, distribution: 'mixed', businessStart: 9, businessEnd: 17,
      burstLimit: 3, burstWindowSeconds: 90, boundsPolicy: 'forward',
    },
    events: syntheticEvents(12), processed: 0,
  };
  if (preset === 'tight') Object.assign(session.config, { start: '2026-01-12T16:59:00Z', durationMinutes: 2, wpmMean: 30, wpmStd: 0, pauseProbability: 1 });
  if (preset === 'after-hours') Object.assign(session.config, { start: '2026-01-12T18:00:00Z', durationMinutes: 30 });
  return session;
}
