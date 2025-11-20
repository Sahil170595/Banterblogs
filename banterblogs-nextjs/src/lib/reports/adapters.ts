import { TimeseriesSchema, DistributionSchema, CorrelationSchema, KpiSchema } from './schemas';

export function asTimeseries(input: unknown) {
  const parsed = TimeseriesSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid timeseries input');
  return parsed.data;
}

export function asDistribution(input: unknown) {
  const parsed = DistributionSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid distribution input');
  return parsed.data;
}

export function asCorrelation(input: unknown) {
  const parsed = CorrelationSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid correlation input');
  return parsed.data;
}

export function asKPI(input: unknown) {
  const parsed = KpiSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid KPI input');
  return parsed.data;
}



