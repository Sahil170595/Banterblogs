import type { FigureSpec } from '../types';

export const PHASE9_FIGURES: FigureSpec[] = [
  {
    slug: 'technical-report-167',
    chart: 'bar',
    table: { heading: '9.2 The rlhf-only / holdout subset (n = 10 valid cells)' },
    label: 'holdout subset metric',
    value: 'value',
    rows: [
      'judge_sensitive = True',
      'judge_sensitive = False',
    ],
    highlight: 'judge_sensitive = True',
    claim: 'on the rlhf_only / holdout subset, all 10 valid cells return `judge_sensitive=True` (positives=10, negatives=0)',
  },
];
