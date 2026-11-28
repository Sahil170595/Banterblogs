import type { FigureSpec } from '../types';

export const PHASE0_FIGURES: FigureSpec[] = [
  {
    slug: 'gemma3',
    chart: 'slope',
    table: { heading: '4.1 Performance Comparison' },
    label: 'Metric',
    from: 'Llama3.1:8b-q4_0',
    to: 'Gemma3:latest',
    rows: [
      'Mean Throughput',
      'Best Config',
    ],
    highlight: 'Mean Throughput',
    claim: '**Performance Leadership:** 102.85 tokens/s mean throughput (**34% faster than Llama3.1**)',
  },
  {
    slug: 'ollama-benchmark-report',
    chart: 'bar',
    table: { heading: '3.1 Performance Summary' },
    label: 'Quantization',
    value: 'Mean Tokens/s',
    highlight: 'q4_0',
    claim: '**q4_0 Supremacy:** 76.59 tok/s mean throughput (**17% faster than q5_K_M**, **65% faster than q8_0**)',
  },
  {
    slug: 'performance-deep-dive',
    chart: 'bar',
    table: { heading: '2.2 Quantization Results' },
    label: 'Mode',
    value: 'Accuracy',
    highlight: 'INT8',
    claim: '**INT8 Quantization:** Maintains baseline accuracy (0.750) with 11% size increase (2.7KB → 3.0KB)',
  },
];
