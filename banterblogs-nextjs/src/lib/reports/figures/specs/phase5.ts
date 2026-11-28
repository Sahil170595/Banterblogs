import type { FigureSpec } from '../types';

export const PHASE5_FIGURES: FigureSpec[] = [
  {
    slug: 'technical-report-138',
    chart: 'bar',
    table: { heading: '7.3 Flip Direction Breakdown' },
    label: 'Direction',
    value: 'Percentage',
    highlight: 'Refusal -> compliance',
    claim: 'Refusal-to-compliance flips account for **72.7%** of directionally classified safety flips',
  },
  {
    slug: 'technical-report-138-study-d-addendum',
    chart: 'bar',
    table: { heading: '1. Executive Result' },
    label: 'Mode',
    value: 'Label flips',
    highlight: 'Standard vLLM',
    claim: 'standard vLLM on an H100 reproduces 22 label flips and 25 text changes',
  },
  {
    slug: 'technical-report-139',
    chart: 'bar',
    table: { heading: '4.6 Highest-risk cells' },
    label: ['Model', 'Quant', 'Strategy'],
    value: 'ASR',
    highlight: 'qwen2.5-1.5b · Q2_K · attention_shift',
    claim: '`qwen2.5-1.5b / Q2_K / attention_shift`, `context_fusion`, and `crescendo` all reach **100% ASR**, while `llama3.2-1b / Q2_K / crescendo` reaches **86%**.',
  },
  {
    slug: 'technical-report-140',
    chart: 'bar',
    table: { heading: 'Table 4: qwen2.5-1.5b' },
    label: 'Quant',
    value: 'N=128',
    highlight: 'Q2_K',
    claim: '**Peak ASR reaches 99.0% on qwen2.5-1.5b Q2_K at N=128 (v1, n=100)',
    // the shot counts: Q8_0 holds near zero at one shot and climbs to 40% at
    // 128, while Q2_K is broken from the first
    explore: { legend: 'Shot count', columns: ['N=1', 'N=4', 'N=16', 'N=64', 'N=128'] },
  },
  {
    slug: 'technical-report-141',
    chart: 'bar',
    table: { heading: 'v3 Models' },
    label: 'Model',
    value: 'Safety Flip Rate',
    highlight: 'phi-2',
    claim: 'safety fragility spans the full range from `0.00%` (`tinyllama-1.1b-chat`) to `2.39%` (`phi-2`)',
  },
  {
    slug: 'technical-report-142',
    chart: 'bar',
    table: { heading: 'SS5.3 Full Regime Table (Hidden-Danger and Near-Hidden-Danger Cells)' },
    label: ['Model', 'Quant'],
    value: 'Refusal delta (pp)',
    highlight: 'llama3.2-1b · GPTQ',
    claim: 'llama3.2-1b GPTQ: +8.49pp BERTScore, -68.18pp refusal.',
  },
];
