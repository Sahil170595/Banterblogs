import { z } from 'zod';

export const ACTIONS = ['Hold', 'Adjust', 'Intensify'] as const;
export const CONTEXTS = ['Low load', 'Moderate load', 'High load'] as const;
export const HORIZON = 4;
export const RESAMPLES = 256;
export const LOW_SUPPORT = 0.05;
const PROBABILITY_TOLERANCE = 1e-8;
const probability = z.number().finite().min(0).max(1);
const distribution = z.tuple([probability, probability, probability]).refine(
  values => Math.abs(values.reduce((a, b) => a + b, 0) - 1) < PROBABILITY_TOLERANCE,
  'Action probabilities must sum to one.',
);
const configSchema = z.object({
  seed: z.number().int().min(0).max(0xffffffff),
  size: z.number().int().min(8).max(320),
  scenario: z.enum(['balanced', 'rare', 'gap']),
  intensity: probability,
  responsiveness: z.number().finite().min(-0.4).max(0.4),
  anchor: probability,
  gainWeight: z.number().finite().min(0).max(2),
  harmWeight: z.number().finite().min(0).max(3),
  gamma: probability,
  cap: z.number().finite().min(0.1).max(100),
}).strict();
export type Config = z.infer<typeof configSchema>;
export const DEFAULT_CONFIG: Config = {
  seed: 2026, size: 160, scenario: 'rare', intensity: 0.55,
  responsiveness: 0.2, anchor: 0.25, gainWeight: 1, harmWeight: 1.5, gamma: 0.95, cap: 5,
};
const stepSchema = z.object({
  context: z.number().int().min(0).max(2),
  action: z.number().int().min(0).max(2),
  behavior: distribution,
  gain: z.number().finite().min(-1).max(2),
  harm: z.number().int().min(0).max(1),
}).strict().refine(step => step.behavior[step.action] > 0, 'A logged action must have positive logging probability.');
const episodeSchema = z.object({
  id: z.string().min(1), steps: z.array(stepSchema).min(1).max(HORIZON),
}).strict();
export type Episode = z.infer<typeof episodeSchema>;
export type Method = 'pdis' | 'clipped' | 'normalized';
export const METHODS: { key: Method; label: string }[] = [
  { key: 'pdis', label: 'Raw per-decision IS' },
  { key: 'clipped', label: 'Capped per-decision IS' },
  { key: 'normalized', label: 'Capped self-normalized IS' },
];
export type Interval = [number, number] | null;

export function validateConfig(input: unknown): Config {
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return parsed.data;
}

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function loggingPolicy(context: number, scenario: Config['scenario']): [number, number, number] {
  if (scenario === 'balanced') return [0.45 - context * 0.1, 0.35, 0.2 + context * 0.1];
  if (scenario === 'gap' && context === 0) return [0.8, 0.2, 0];
  return [0.8 - context * 0.2, 0.18 + context * 0.12, 0.02 + context * 0.08];
}

export function targetPolicy(context: number, behavior: number[], config: Config): number[] {
  const intensity = Math.min(1, Math.max(0, config.intensity + config.responsiveness * (context - 1)));
  const proposed = [1 - intensity, intensity * 0.35, intensity * 0.65];
  return proposed.map((p, a) => (1 - config.anchor) * p + config.anchor * behavior[a]);
}

export function generateCohort(input: unknown): Episode[] {
  const config = validateConfig(input);
  const random = rng(config.seed);
  return Array.from({ length: config.size }, (_, index) => {
    const latent = random();
    let context = Math.floor(random() * CONTEXTS.length);
    const steps = Array.from({ length: HORIZON }, () => {
      const behavior = loggingPolicy(context, config.scenario);
      const draw = random();
      const action = draw < behavior[0] ? 0 : draw < behavior[0] + behavior[1] ? 1 : 2;
      // Only factual logged outcomes are generated. Target controls never enter this generator.
      const gain = Math.tanh((action * 0.65 - context * 0.25 + (random() - 0.5) * 0.8 + latent * 0.2));
      const harm = random() < 0.04 + action * 0.13 + context * 0.04 + latent * 0.04 ? 1 : 0;
      const step = { context, action, behavior, gain, harm };
      const drift = random();
      context = Math.min(2, Math.max(0, context + (drift < 0.25 ? -1 : drift > 0.75 ? 1 : 0)));
      return step;
    });
    return { id: `trajectory-${index + 1}`, steps };
  });
}

type Trace = { id: string; rewards: number[]; rawWeights: number[]; cappedWeights: number[] };
export type Estimate = {
  pdis: number | null; clipped: number | null; normalized: number | null; logged: number;
  unsupportedMass: number; lowSupportMass: number; clippedFraction: number;
  bounds: [number, number]; traces: Trace[];
  horizons: { rawEss: number; cappedEss: number; maxRawWeight: number; maxShare: number }[];
};

function ess(weights: number[]) {
  const max = Math.max(...weights);
  if (max === 0) return 0;
  const scaled = weights.map(w => w / max);
  const sum = scaled.reduce((a, b) => a + b, 0);
  const squares = scaled.reduce((a, b) => a + b * b, 0);
  return squares === 0 ? 0 : sum * sum / squares;
}

// Recompute ratio denominators for every bootstrap draw; do not average normalized episode scores.
function aggregate(traces: Trace[], config: Config, indices: number[]) {
  const horizon = traces[0].rewards.length;
  let pdis = 0, clipped = 0, normalized = 0, logged = 0;
  let hasNormalized = true;
  for (let t = 0; t < horizon; t++) {
    const discount = config.gamma ** t;
    if (discount === 0) continue;
    let rawNumerator = 0, cappedNumerator = 0, denominator = 0, factual = 0;
    for (const index of indices) {
      const trace = traces[index];
      rawNumerator += trace.rawWeights[t] * trace.rewards[t];
      cappedNumerator += trace.cappedWeights[t] * trace.rewards[t];
      denominator += trace.cappedWeights[t];
      factual += trace.rewards[t];
    }
    pdis += discount * rawNumerator / indices.length;
    clipped += discount * cappedNumerator / indices.length;
    logged += discount * factual / indices.length;
    if (denominator === 0) hasNormalized = false;
    else normalized += discount * cappedNumerator / denominator;
  }
  if (![pdis, clipped, normalized, logged].every(Number.isFinite)) throw new Error('Estimator overflowed. Increase logging support or reduce the target intensity.');
  return { pdis, clipped, normalized: hasNormalized ? normalized : null, logged };
}

export function estimate(input: unknown, controls: unknown): Estimate {
  const config = validateConfig(controls);
  const parsed = z.array(episodeSchema).min(1).max(320).safeParse(input);
  if (!parsed.success) throw new Error(`Invalid logged trajectories: ${parsed.error.issues.map(i => i.message).join('; ')}`);
  const cohort = parsed.data;
  const horizon = cohort[0].steps.length;
  if (new Set(cohort.map(e => e.id)).size !== cohort.length) throw new Error('Trajectory IDs must be unique.');
  if (cohort.some(e => e.steps.length !== horizon)) throw new Error('Every trajectory must have the same complete horizon.');
  let unsupportedMass = 0, lowSupportMass = 0, clippedCount = 0;
  const traces = cohort.map(episode => {
    let cumulative = 1;
    const trace: Trace = { id: episode.id, rewards: [], rawWeights: [], cappedWeights: [] };
    for (const [t, step] of episode.steps.entries()) {
      const target = targetPolicy(step.context, step.behavior, config);
      target.forEach((p, a) => {
        if (config.gamma ** t > 0) {
          if (step.behavior[a] === 0) unsupportedMass += p;
          if (step.behavior[a] < LOW_SUPPORT) lowSupportMass += p;
        }
      });
      cumulative *= target[step.action] / step.behavior[step.action];
      if (!Number.isFinite(cumulative)) throw new Error('Importance weights overflowed. Use a less extreme target policy.');
      if (cumulative > config.cap) clippedCount++;
      trace.rawWeights.push(cumulative);
      trace.cappedWeights.push(Math.min(config.cap, cumulative));
      trace.rewards.push(config.gainWeight * step.gain - config.harmWeight * step.harm);
    }
    return trace;
  });
  const indices = traces.map((_, i) => i);
  const values = aggregate(traces, config, indices);
  const discountSum = Array.from({ length: horizon }, (_, t) => config.gamma ** t).reduce((a, b) => a + b, 0);
  const blocked = unsupportedMass > 0;
  const contributingHorizons = config.gamma === 0 ? 1 : horizon;
  return {
    ...values,
    pdis: blocked ? null : values.pdis,
    clipped: blocked ? null : values.clipped,
    normalized: blocked ? null : values.normalized,
    unsupportedMass: unsupportedMass / (cohort.length * contributingHorizons),
    lowSupportMass: lowSupportMass / (cohort.length * contributingHorizons),
    clippedFraction: clippedCount / (cohort.length * horizon),
    bounds: [(-config.gainWeight - config.harmWeight) * discountSum, 2 * config.gainWeight * discountSum],
    traces,
    horizons: Array.from({ length: horizon }, (_, t) => {
      const raw = traces.map(e => e.rawWeights[t]);
      const capped = traces.map(e => e.cappedWeights[t]);
      const max = Math.max(...raw);
      const scaledSum = max === 0 ? 0 : raw.reduce((a, b) => a + b / max, 0);
      return { rawEss: ess(raw), cappedEss: ess(capped), maxRawWeight: max, maxShare: scaledSum === 0 ? 0 : 1 / scaledSum };
    }),
  };
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position), high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

function bootstrap(result: Estimate, config: Config, draws: number[][]) {
  const samples = draws.map(indices => aggregate(result.traces, config, indices));
  const intervals = {} as Record<Method, Interval>;
  const differences = {} as Record<Method, Interval>;
  const unavailableDraws = {} as Record<Method, number>;
  for (const { key } of METHODS) {
    unavailableDraws[key] = samples.filter(s => s[key] === null).length;
    // Do not drop zero-denominator bootstrap draws and present a selectively narrow interval.
    if (result[key] === null || unavailableDraws[key] > 0) {
      intervals[key] = null;
      differences[key] = null;
    } else {
      const values = samples.map(s => s[key] as number);
      const gaps = samples.map(s => (s[key] as number) - s.logged);
      intervals[key] = [percentile(values, 0.025), percentile(values, 0.975)];
      differences[key] = [percentile(gaps, 0.025), percentile(gaps, 0.975)];
    }
  }
  return { intervals, differences, unavailableDraws };
}

export function evaluate(input: unknown) {
  const config = validateConfig(input);
  const cohort = generateCohort(config);
  const random = rng(config.seed ^ 0x9e3779b9);
  const draws = Array.from({ length: RESAMPLES }, () => Array.from({ length: config.size }, () => Math.floor(random() * config.size)));
  const candidates = [
    { name: 'State-responsive target', controls: config },
    { name: 'Constant target control', controls: { ...config, responsiveness: 0 } },
    { name: 'Logging policy identity', controls: { ...config, anchor: 1 } },
  ];
  const comparisons = candidates.map(({ name, controls }) => {
    const result = estimate(cohort, controls);
    return { name, controls, result, ...bootstrap(result, controls, draws) };
  });
  const sensitivity = [
    { name: 'Current reward', controls: config },
    { name: 'Gain ablated', controls: { ...config, gainWeight: 0 } },
    { name: 'Harm emphasized', controls: { ...config, harmWeight: 3 } },
  ].map(({ name, controls }) => ({ name, result: estimate(cohort, controls) }));
  const support = CONTEXTS.map((name, context) => {
    const behavior = loggingPolicy(context, config.scenario);
    const target = targetPolicy(context, behavior, config);
    const counts = ACTIONS.map((_, action) => cohort.reduce((n, e) => n + e.steps.filter(s => s.context === context && s.action === action).length, 0));
    return { name, context, behavior, target, counts };
  });
  return { schema: 'offline-policy-evaluation/v1' as const, config, horizon: HORIZON, resamples: RESAMPLES, cohort, comparisons, sensitivity, support };
}
export type Evaluation = ReturnType<typeof evaluate>;
export function exportEvaluation(result: Evaluation) { return JSON.stringify(result, null, 2); }

export function formatNumber(value: number | null, digits = 2) { return value === null ? 'Unavailable' : value.toFixed(digits); }
