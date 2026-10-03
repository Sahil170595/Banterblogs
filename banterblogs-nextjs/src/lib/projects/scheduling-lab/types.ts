import { z } from 'zod';

export const MAX_EVENTS = 48;
export const MAX_TRACE_BYTES = 250_000;
export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const MINUTE_MS = 60_000;
export const configSchema = z.object({
  seed: z.number().int().min(0).max(4294967295),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/).refine(value => {
    const time = Date.parse(value);
    return Number.isFinite(time) && new Date(time).toISOString() === value.replace('Z', '.000Z');
  }, 'Use a real UTC date and time.'),
  durationMinutes: z.number().finite().min(1).max(4320),
  wpmMean: z.number().finite().min(30).max(80),
  wpmStd: z.number().finite().min(0).max(30),
  pauseProbability: z.number().finite().min(0).max(1),
  jitterStd: z.number().finite().min(0).max(90),
  clusterShare: z.number().finite().min(0).max(0.6),
  distribution: z.enum(['mixed', 'uniform']),
  businessStart: z.number().int().min(0).max(23),
  businessEnd: z.number().int().min(1).max(24),
  burstLimit: z.number().int().min(1).max(8),
  burstWindowSeconds: z.number().int().min(15).max(300),
  boundsPolicy: z.enum(['forward', 'clamp-audit']),
}).strict().refine(config => config.businessStart < config.businessEnd, 'Opening hour must precede closing hour.');
export const sessionSchema = z.object({
  config: configSchema,
  events: z.array(z.object({
    id: z.string().regex(/^E[0-9]{2}$/),
    text: z.string().max(400).refine(text => text.trim().length > 0, 'Event text cannot be empty.'),
  }).strict()).min(1).max(MAX_EVENTS),
  processed: z.number().int().min(0).max(MAX_EVENTS),
}).strict();
export type Config = z.infer<typeof configSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Preset = 'baseline' | 'tight' | 'after-hours';
export type Violation = { eventId: string; code: 'bounds' | 'preparation' | 'order' | 'business-hours' | 'burst'; detail: string };
export type ScheduledEvent = {
  id: string; text: string; wordCount: number; sampledWpm: number;
  previousAt: number; typingMs: number; pauseMs: number; preparedAt: number;
  anchorAt: number | null; plannedAt: number; proposalAt: number;
  clusterShiftMs: number; intervalJitterMs: number; burstDelayMs: number;
  scheduledAt: number | null; deferral: string | null;
  stages: { name: string; at: number }[];
};
export type Result = {
  start: number; end: number; events: ScheduledEvent[]; violations: Violation[];
  metrics: { admitted: number; deferred: number; pauseCount: number; meanGapSeconds: number | null; gapCv: number | null; violationCount: number; businessAdherence: number | null };
  simulation: { delivery: 'simulated-only'; processedIds: string[]; clock: number };
};
