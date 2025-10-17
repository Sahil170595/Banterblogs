export const REPORT_SERIES_COLORS = [
  'var(--rp-series-1)',
  'var(--rp-series-2)',
  'var(--rp-series-3)',
  'var(--rp-series-4)',
  'var(--rp-series-5)',
  'var(--rp-series-6)',
];

export function getSeriesColor(index: number) {
  return REPORT_SERIES_COLORS[index % REPORT_SERIES_COLORS.length];
}
