import { z } from 'zod';

export const PointSchema = z.object({ t: z.number(), y: z.number() });

export const SeriesSchema = z.object({
  name: z.string(),
  color: z.string().optional(),
  points: z.array(PointSchema).min(1),
});

export const TimeseriesSchema = z.object({
  series: z.array(SeriesSchema).min(1),
  yLabel: z.string().optional(),
  yScale: z.enum(['linear', 'log']).optional(),
  annotations: z
    .array(
      z.object({
        t: z.number().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        label: z.string(),
      }),
    )
    .optional(),
});

export const KpiSchema = z.object({
  label: z.string(),
  value: z.number(),
  delta: z.number().optional(),
  window: z.string().optional(),
  trend: z.array(z.number()).optional(),
});

export const BucketSchema = z.object({ x0: z.number(), x1: z.number(), count: z.number() });

export const DistributionSchema = z.object({
  buckets: z.array(BucketSchema),
  summary: z.object({ p50: z.number().optional(), p90: z.number().optional() }).optional(),
});

export const CorrelationSchema = z.object({
  variables: z.array(z.string()),
  matrix: z.array(z.array(z.number())),
});

export type Timeseries = z.infer<typeof TimeseriesSchema>;
export type KPI = z.infer<typeof KpiSchema>;
export type Distribution = z.infer<typeof DistributionSchema>;
export type Correlation = z.infer<typeof CorrelationSchema>;



