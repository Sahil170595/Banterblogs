import type { FigureSpec } from '../types';

export const PHASE7_FIGURES: FigureSpec[] = [
  {
    slug: 'technical-report-163',
    chart: 'line',
    table: { heading: '29. Appendix D. Full Pareto Operating Points' },
    label: 'Fraction routed',
    series: ['Recovered (% of gap)'],
    rows: [
      '6.67%',
      '20.00%',
      '26.67%',
      '48.89%',
    ],
    highlight: '26.67%',
    claim: 'a clear utility knee at threshold 0.2754 (26.67 percent routed, 80.27 percent recovered)',
  },
];
