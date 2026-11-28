import type { PAPER_STATUS_TONE } from '@/components/ui/Badge';

// The publicly available papers: the data /papers renders, shared so the
// research archive can point at the reports behind them (reports/startHere.ts).
// A page file may only export what Next knows, so the arrays live here.

export interface Paper {
  title: string;
  thesis: string;
  venue: string;
  status: keyof typeof PAPER_STATUS_TONE;
  trs: { label: string; slug: string }[];
  arxiv?: string;
  demo?: { label: string; href: string };
}

export const ACCEPTED: Paper[] = [
  {
    title: 'A Paired Testing Protocol for Batch-Conditioned Refusal Robustness in LLM Serving',
    thesis:
      'Phase 1 safety flips at ~0.58% vs capability ~0.14% under controlled batching. Refusal-to-compliance dominant direction. Reduced true-batching validation reaches ~99.4% agreement with synchronized dispatch.',
    venue: 'ICML 2026 Workshop on Hypothesis Testing',
    status: 'Presented',
    trs: [{ label: 'TR138', slug: 'technical-report-138' }],
    arxiv: 'https://arxiv.org/abs/2605.27763',
  },
  {
    title: 'A Safe Prototype Is Not a Safety Direction: Reference Dependence and Prompt Confounds in Response-Safety Embeddings',
    thesis:
      'The first paper on Chimera’s own thesis, from Banterpacks. In tested prompt-controlled settings, raw safe centroids discriminate weakly or inversely; safe-minus-unsafe directions reach ROC-AUC 0.588–0.793.',
    venue: 'NeurIPS 2026 Workshop on Foundations of Language Model Security',
    status: 'Accepted',
    trs: [],
    arxiv: 'https://arxiv.org/abs/2610.01801',
  },
];

export const PUBLIC_PREPRINTS: Paper[] = [
  {
    title: 'Speculative Decoding at Temperature Zero: A Scoped Safety-Invariance Screen with a 48,072-Sample Expansion',
    thesis: 'Examines output differences and refusal behavior under temperature-zero speculative decoding.',
    venue: 'Public preprint',
    status: 'Preprint',
    trs: [{ label: 'TR144', slug: 'technical-report-144' }],
    arxiv: 'https://arxiv.org/abs/2606.25097',
  },
  {
    title: 'Quality Is Not a Safety Proxy Under Quantization',
    thesis:
      'Across a 51-row matrix (6 models, 4 families, a 7-level GGUF ladder + AWQ/GPTQ INT4), retained quality does not waive direct safety testing: 10 hidden-danger rows (plus 1 near-hidden) hold quality steady or better while refusal falls 10-68pp. A calibrated refusal-template-drift screen (RTSI) routes 10 of the 11 under blocked validation; Claude Sonnet 4 relabels 11,470 items and agrees with the gemma3:12b judge on 89.9% of rows (κ = 0.873).',
    venue: 'Public preprint',
    status: 'Preprint',
    trs: [
      { label: 'TR125', slug: 'technical-report-125' },
      { label: 'TR134', slug: 'technical-report-134' },
      { label: 'TR142', slug: 'technical-report-142' },
    ],
    arxiv: 'https://arxiv.org/abs/2606.10154',
    demo: { label: 'QuantSafe Certifier (HF Space)', href: 'https://huggingface.co/spaces/build-small-hackathon/quantsafe-certifier' },
  },
];
