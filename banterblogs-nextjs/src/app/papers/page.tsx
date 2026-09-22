import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem, HEAD_ENTRANCE_GROUPS } from '@/components/motion/entrance';
import { ReportVisual } from '@/components/reports/ReportVisual';
import { Badge, PAPER_STATUS_TONE } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardLink } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Section';
import { StatRow } from '@/components/ui/StatRow';
import { cn } from '@/lib/cn';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

interface Paper {
  title: string;
  thesis: string;
  venue: string;
  status: keyof typeof PAPER_STATUS_TONE;
  trs: { label: string; slug: string }[];
  arxiv?: string;
  demo?: { label: string; href: string };
}

const PRESENTED: Paper[] = [
  {
    title: 'A Paired Testing Protocol for Batch-Conditioned Refusal Robustness in LLM Serving',
    thesis:
      'Phase 1 safety flips at ~0.58% vs capability ~0.14% under controlled batching. Refusal-to-compliance dominant direction. Reduced true-batching validation reaches ~99.4% agreement with synchronized dispatch.',
    venue: 'ICML 2026 Workshop on Hypothesis Testing',
    status: 'Presented',
    trs: [{ label: 'TR138', slug: 'technical-report-138' }],
    arxiv: 'https://arxiv.org/abs/2605.27763',
  },
];

const PUBLIC_PREPRINTS: Paper[] = [
  {
    title: 'Typical-Acceptance Invariance Screen for Speculative Decoding Safety',
    thesis:
      'No detectable safety divergence under speculative decoding at temperature zero: 60,849 matched samples, max |Cohen’s h| = 0.024, and 25 of 27 per-task TOST contrasts inside ±3pp. A strong null result, withdrawn from venue review and released as a public preprint.',
    venue: 'Public preprint',
    status: 'Preprint',
    trs: [{ label: 'TR144', slug: 'technical-report-144' }],
    arxiv: 'https://arxiv.org/abs/2606.25097',
  },
];

const UNDER_REVIEW_PAPERS: Paper[] = [
  {
    title: 'Quality Is Not a Safety Proxy Under Quantization',
    thesis:
      'Across a 51-row matrix (6 models, 4 families, a 7-level GGUF ladder + AWQ/GPTQ INT4), retained quality does not waive direct safety testing: 9 hidden-danger rows (plus 1 near-hidden) hold quality steady or better while refusal falls 12-68pp. A calibrated refusal-template-drift screen (RTSI) routes all 10 to direct safety testing; Claude Sonnet 4 relabels 11,470 items and agrees with the gemma3:12b judge on 89.9% of rows (κ = 0.873).',
    venue: 'Top ML venue (under review)',
    status: 'Submitted',
    trs: [
      { label: 'TR125', slug: 'technical-report-125' },
      { label: 'TR134', slug: 'technical-report-134' },
      { label: 'TR142', slug: 'technical-report-142' },
    ],
    arxiv: 'https://arxiv.org/abs/2606.10154',
    demo: { label: 'QuantSafe Certifier (HF Space)', href: 'https://huggingface.co/spaces/build-small-hackathon/quantsafe-certifier' },
  },
  {
    title: 'Many-Shot Jailbreak Under Quantization',
    thesis:
      'Q2_K is the recurring vulnerability threshold for many-shot and long-context attacks. Message-array vs faux-dialogue prompt formatting (92% vs 0% ASR) across 4 model families. Format mediates effect more strongly than quantization alone.',
    venue: 'Top ML venue (under review)',
    status: 'Submitted',
    trs: [{ label: 'TR140', slug: 'technical-report-140' }],
  },
  {
    title: 'Multi-Turn Jailbreak × Quantization',
    thesis:
      '8 attack strategies × 4 models × 6 quantization levels: 10,600 conversations, 37,825 judge labels. Threshold-specific shift in risk rather than universal multi-turn amplification.',
    venue: 'Top ML venue (under review)',
    status: 'Submitted',
    trs: [{ label: 'TR139', slug: 'technical-report-139' }],
  },
];

const IN_PREP: Paper[] = [
  {
    title: 'Inference Optimization Is Not Safety-Neutral',
    thesis:
      'Synthesis paper. Quantization drives 57% of total safety cost, backend choice 41%, concurrency 2%. Chat template divergence can induce larger safety shifts than numerical precision.',
    venue: 'TBD',
    status: 'Synthesis',
    trs: [
      { label: 'TR134', slug: 'technical-report-134' },
      { label: 'TR135', slug: 'technical-report-135' },
      { label: 'TR136', slug: 'technical-report-136' },
      { label: 'TR137', slug: 'technical-report-137' },
    ],
  },
  {
    title: 'Empirical Capacity Planning for Local LLM Inference',
    thesis:
      'Capacity planning as a fitted systems problem. Backend choice, context length, and memory pressure all materially change the feasible operating regime. Planner quality should be judged by validation against explicit targets, not analytic elegance.',
    venue: 'Systems venue',
    status: 'Synthesis',
    trs: [
      { label: 'TR123', slug: 'technical-report-123' },
      { label: 'TR127', slug: 'technical-report-127' },
      { label: 'TR133', slug: 'technical-report-133' },
    ],
  },
  {
    title: 'Multi-Agent Runtime Architecture',
    thesis:
      'Recasts "which language wins" as "which system design preserves throughput." Python and Rust near-parity on throughput; architecture and concurrency strategy drive larger differences. Dual Ollama achieves 99.4% multi-agent efficiency.',
    venue: 'Systems venue',
    status: 'Synthesis',
    trs: [
      { label: 'TR112', slug: 'technical-report-112' },
      { label: 'TR114', slug: 'technical-report-114' },
      { label: 'TR115', slug: 'technical-report-115' },
    ],
  },
  {
    title: 'KV-Cache Quantization and Safety',
    thesis:
      'KV-cache quantization is a serving-layer perturbation that touches retained attention state. 5-phase paired study on FP16 vs FP8 across 24K records, 3 models. Headline result is a null: no Holm-significant safety effect detectable at α=0.05, 80% power. Operational rule: workload-specific paired eval, not pre-approval.',
    venue: 'Workshop submission',
    status: 'In preparation',
    trs: [{ label: 'TR145', slug: 'technical-report-145' }],
  },
  {
    title: 'Serving-Stack Physics: When Continuous Batching Stops Amortizing',
    thesis:
      'A predictive bandwidth prior for the static-batch knee: η(B)=(1+r)/(1+Br) with r=Ck/W (context × KV-bytes-per-token over weight bytes). The parameter-free Ck/W value orders the amortization knee at Spearman ρ=0.84 across three 7-8B models and two datacenter GPUs, validated cross-backend (vLLM/SGLang) and against a served SGLang knee. Revising for resubmission.',
    venue: 'Systems venue',
    status: 'In preparation',
    trs: [
      { label: 'TR164', slug: 'technical-report-164' },
      { label: 'TR130', slug: 'technical-report-130' },
      { label: 'TR132', slug: 'technical-report-132' },
    ],
  },
  {
    title: 'Compile-Stack Attribution',
    thesis:
      'Independent upstream bugs in PyTorch and Triton jointly produce the torch.compile decode crash. Triton minor-version ablation on the same GPU flips the conclusion. Benchmark identity is a 5-tuple (GPU, Triton, PyTorch, cache, compile mode). Companion to upstream PR #175562 (merged to PyTorch main). Withdrawn from venue review.',
    venue: 'Revising for resubmission',
    status: 'In preparation',
    trs: [
      { label: 'TR126', slug: 'technical-report-126' },
      { label: 'TR147', slug: 'technical-report-147' },
    ],
  },
];

// Counts are derived so the stat row and the metadata cannot drift from the
// arrays the page actually renders.
// Workshop submissions still in double-blind review; their titles stay off
// public pages until decisions land.
const WITHHELD_WORKSHOP_SUBMISSIONS = 5;
const UNDER_REVIEW_COUNT = UNDER_REVIEW_PAPERS.length + WITHHELD_WORKSHOP_SUBMISSIONS;
const IN_PREP_COUNT = IN_PREP.length;
const TOTAL_PAPERS = PRESENTED.length + PUBLIC_PREPRINTS.length + UNDER_REVIEW_COUNT + IN_PREP_COUNT;

const METADATA_DESCRIPTION = `${PRESENTED.length} paper presented at the ICML 2026 Workshop on Hypothesis Testing · ${PUBLIC_PREPRINTS.length} public preprint · ${UNDER_REVIEW_COUNT} under peer review · ${IN_PREP_COUNT} in preparation · Independent research on inference optimization, constitutional AI, and safety evaluation.`;

export const metadata: Metadata = {
  alternates: { canonical: '/papers' },
  title: 'Papers',
  description: METADATA_DESCRIPTION,
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Papers | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/papers',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Papers | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

const ARXIV_ABS = /^https?:\/\/arxiv\.org\/abs\//;

// The first papers join the head's entrance, after its three groups. The
// first section's heading and description do not: that description is the
// page's largest text, its LCP element, and a fade from 0 that starts late is
// only credited to LCP when it ends.
const FIRST_PAPERS_AFTER = HEAD_ENTRANCE_GROUPS;

const CROSS_LINKS = [
  {
    href: '/reports',
    title: 'Research Archive',
    blurb: `${REPORTS.DISPLAY} technical reports with ${MEASUREMENTS.DISPLAY} measurements — the evidence layer behind these papers.`,
    cta: 'Browse reports',
  },
  { href: '/work', title: 'Work', blurb: 'Experience, education, and the engineering that surrounds the research.', cta: 'Read more' },
  { href: '/platform', title: 'Platform Architecture', blurb: 'The constitutional AI ecosystem these findings are built into.', cta: 'Explore' },
];

/**
 * A paper: status and venue, the title, the thesis, then its links. A paper
 * with a public preprint is an interactive card whose title leads there; the
 * published ones lead with their evidence report's picture.
 */
function PaperCard({ paper, figure = false }: { paper: Paper; figure?: boolean }) {
  return (
    <Card as="article" variant={paper.arxiv ? 'interactive' : 'plain'} className="flex h-full flex-col">
      {/* the evidence report's archive picture, inset on the card without a
          frame of its own */}
      {figure && paper.trs[0] && (
        <div className="mb-5 h-28 overflow-hidden rounded-lg bg-background/60 md:h-32">
          <ReportVisual slug={paper.trs[0].slug} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone={PAPER_STATUS_TONE[paper.status]}>{paper.status}</Badge>
        <span className="text-label-13 text-muted-foreground">
          <span className="sr-only">Target: </span>
          {paper.venue}
        </span>
      </div>
      <h3 className="mt-3 text-heading-20 text-foreground">
        {paper.arxiv ? <CardLink href={paper.arxiv}>{paper.title}</CardLink> : paper.title}
        {paper.arxiv && <ArrowUpRight aria-hidden="true" className="card-arrow ml-1 inline-block h-4 w-4 align-baseline" />}
      </h3>
      <p className="mt-2 flex-1 text-copy-14 text-muted-foreground">{paper.thesis}</p>
      {/* the paper's own links, then its evidence reports, one row each */}
      {(paper.arxiv || paper.demo) && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {paper.arxiv && (
            <ButtonLink href={paper.arxiv} size="sm" iconEnd={<ArrowUpRight className="h-3.5 w-3.5" />}>
              arXiv {paper.arxiv.replace(ARXIV_ABS, '')}
            </ButtonLink>
          )}
          {paper.demo && (
            <ButtonLink href={paper.demo.href} size="sm" iconEnd={<ArrowUpRight className="h-3.5 w-3.5" />}>
              <span className="text-muted-foreground">Demo</span> {paper.demo.label}
            </ButtonLink>
          )}
        </div>
      )}
      {paper.trs.length > 0 && (
        <div className={cn('flex flex-wrap items-center gap-x-1 gap-y-2', paper.arxiv || paper.demo ? 'mt-3' : 'mt-5')}>
          <span className="mr-2 text-label-12-mono text-muted-foreground/80">Evidence</span>
          {paper.trs.map((tr) => (
            <ButtonLink key={tr.slug} href={`/reports/${tr.slug}`} variant="ghost" size="sm" className="px-2">
              {tr.label}
            </ButtonLink>
          ))}
        </div>
      )}
    </Card>
  );
}

const PAPER_GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2';

export default function PapersPage() {
  return (
    <div className="container pb-24">
      <PageHeader
        title="Papers"
        lede="Independent research on inference optimization, constitutional AI architectures, and empirical safety evaluation."
        meta={
          <>
            <StatRow
              label="The papers in numbers"
              items={[
                { value: PRESENTED.length, label: 'presented' },
                { value: PUBLIC_PREPRINTS.length, label: 'public preprint' },
                { value: UNDER_REVIEW_COUNT, label: 'under peer review' },
                { value: TOTAL_PAPERS, label: 'papers total' },
                { value: MEASUREMENTS.SHORT, label: 'measurements' },
              ]}
            />
            <p className="text-label-13 text-muted-foreground">
              Author: <span className="font-medium text-foreground">Sahil Kadadekar</span> · Independent research
            </p>
          </>
        }
      />

      <div className="mt-8 md:mt-14">
        <Section
          id="published"
          title="Published & public"
          description="The ICML 2026 workshop paper was accepted 2026-05-22 and presented at the workshop — the first peer-reviewed paper from the program. The speculative-decoding null result is a public arXiv preprint."
          aside
        >
          <ul className={PAPER_GRID}>
            {[...PRESENTED, ...PUBLIC_PREPRINTS].map((paper, index) => (
              <Reveal as="li" key={paper.title} {...entranceItem(index, FIRST_PAPERS_AFTER)}>
                <PaperCard paper={paper} figure />
              </Reveal>
            ))}
          </ul>
        </Section>

        <Section
          id="under-review"
          title="Under peer review"
          description={`${UNDER_REVIEW_COUNT} papers submitted with PDFs, artifact manifests, and venue checklists complete. Now under blind review at top ML venues and workshops.`}
          aside
        >
          <ul className={PAPER_GRID}>
            {UNDER_REVIEW_PAPERS.map((paper) => (
              <Reveal as="li" key={paper.title}>
                <PaperCard paper={paper} />
              </Reveal>
            ))}
            {/* counted, never titled */}
            <Reveal as="li">
              <Card className="flex h-full flex-col items-start justify-center gap-3">
                <Badge tone={PAPER_STATUS_TONE.Submitted}>Submitted</Badge>
                <p className="text-copy-14 text-muted-foreground">
                  Plus {WITHHELD_WORKSHOP_SUBMISSIONS} workshop submissions under double-blind review. Their titles are withheld until
                  decisions land.
                </p>
              </Card>
            </Reveal>
          </ul>
        </Section>

        <Section
          id="in-preparation"
          title="In preparation"
          description="Synthesis papers and methodology work derived from the published technical report archive, plus papers withdrawn from review and being revised for resubmission."
          aside
        >
          <ul className={PAPER_GRID}>
            {IN_PREP.map((paper) => (
              <Reveal as="li" key={paper.title}>
                <PaperCard paper={paper} />
              </Reveal>
            ))}
          </ul>
        </Section>

        {/* the program behind the papers, then where to go next */}
        <div className="page-section">
          <p className="max-w-[60ch] text-copy-17 text-prose">
            The first paper was presented at the ICML 2026 Workshop on Hypothesis Testing, and the speculative-decoding null result is
            public on arXiv; {UNDER_REVIEW_COUNT} more are under blind review at top ML venues and workshops, with {IN_PREP_COUNT} in
            preparation. Each is backed by reproducible technical reports and artifact-level provenance from a {MEASUREMENTS.DISPLAY}{' '}
            measurement program.
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {CROSS_LINKS.map((link) => (
              <Reveal as="li" key={link.href}>
                <Card variant="interactive" href={link.href} className="flex h-full flex-col">
                  <h3 className="text-heading-20 text-foreground">{link.title}</h3>
                  <p className="mt-2 flex-1 text-copy-14 text-muted-foreground">{link.blurb}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-label-13 font-medium text-primary">
                    {link.cta} <ArrowRight aria-hidden="true" className="card-arrow h-3.5 w-3.5" />
                  </span>
                </Card>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
