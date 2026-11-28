import type { FigureSpec } from '../types';

export const PHASE8_FIGURES: FigureSpec[] = [
  {
    slug: 'technical-report-164',
    chart: 'line',
    table: { heading: 'SS4. Parallel Efficiency Collapse — The Headline Result' },
    label: 'N',
    series: ['median'],
    highlight: '2',
    claim: 'At N=2, the median across all 72 cells in the N=2 group is 0.547 — already below the H1 breakdown threshold of 0.65.',
  },
  {
    slug: 'technical-report-164-v3',
    chart: 'slope',
    table: { heading: '3.1 The headline: gradual decline, not collapse' },
    label: 'Model',
    from: 'vLLM eff. @ N=32',
    to: 'SGLang eff. @ N=32',
    highlight: 'mistral-7b',
    claim: 'both backends retain **0.47–0.62 parallel efficiency at N=32**',
  },
  {
    slug: 'technical-report-164-v5',
    chart: 'dot',
    table: { heading: '3.1 Predictor baselines — the full ladder' },
    label: 'Predictor',
    value: 'Spearman (finite)',
    interval: 'Spearman CI95 (finite)',
    rows: [
      'Ck/W + per-GPU alpha',
      'Ck/W closed-form (zero-param)',
      'ratio only -r',
      'context only 1/C',
      'VRAM ceiling n_max',
      'KV traffic only 1/(Ck)',
    ],
    highlight: 'Ck/W + per-GPU alpha',
    claim: 'Ck/W plus a per-GPU alpha is the best static-grid predictor (finite-only Spearman 0.8779; censored-as-128 Spearman 0.8462)',
  },
  {
    slug: 'technical-report-165',
    chart: 'bar',
    table: { heading: '16.2 Two-axis triangulation: backend axis and interpreter axis' },
    label: 'Experiment',
    value: 'Mean Delta parallel efficiency vs V1',
    // the table's third row, the same-session control, measures against GIL-on in the same build, not V1
    rows: ['TR164 V2', 'TR165'],
    highlight: 'TR165',
    claim: 'The substrate observed +17.91 pp mean recovery, 79.2% of combinations clearing threshold, and 2/6 hangs resolved.',
  },
];
