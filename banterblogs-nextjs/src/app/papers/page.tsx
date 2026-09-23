import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem, HEAD_ENTRANCE_GROUPS } from '@/components/motion/entrance';
import { ReportVisual } from '@/components/reports/ReportVisual';
import { Badge, PAPER_STATUS_TONE } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardLink } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { OnwardLinks, type OnwardLink } from '@/components/ui/OnwardLinks';
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
    title: 'Speculative Decoding at Temperature Zero: A Scoped Safety-Invariance Screen with a 48,072-Sample Expansion',
    thesis: 'Examines output differences and refusal behavior under temperature-zero speculative decoding.',
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
      'Across a 51-row matrix (6 models, 4 families, a 7-level GGUF ladder + AWQ/GPTQ INT4), retained quality does not waive direct safety testing: 10 hidden-danger rows (plus 1 near-hidden) hold quality steady or better while refusal falls 10-68pp. A calibrated refusal-template-drift screen (RTSI) routes 10 of the 11 under blocked validation; Claude Sonnet 4 relabels 11,470 items and agrees with the gemma3:12b judge on 89.9% of rows (κ = 0.873).',
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
      'Synthesis paper. Across two shared anchor models, quantization, backend, and concurrency account for 57%, 41%, and 2% of normalized safety-score changes: descriptive shares, not a causal decomposition. Chat template divergence can induce larger safety shifts than numerical precision.',
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

const CROSS_LINKS: OnwardLink[] = [
  {
    href: '/reports',
    title: 'Research Archive',
    blurb: `${REPORTS.DISPLAY} technical reports with ${MEASUREMENTS.DISPLAY} measurements — the evidence layer behind these papers.`,
  },
  { href: '/work', title: 'Work', blurb: 'Experience, education, and the engineering that surrounds the research.' },
  { href: '/platform', title: 'Platform Architecture', blurb: 'The constitutional AI ecosystem these findings are built into.' },
];

const ordinal = (index: number) => String(index + 1).padStart(2, '0');

/** status and venue on one line */
function StatusLine({ paper }: { paper: Paper }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Badge tone={PAPER_STATUS_TONE[paper.status]}>{paper.status}</Badge>
      <span className="text-label-13 text-muted-foreground">
        <span className="sr-only">Target: </span>
        {paper.venue}
      </span>
    </div>
  );
}

/** the paper's own links: its preprint and its demo */
function PaperLinks({ paper, className }: { paper: Paper; className?: string }) {
  if (!paper.arxiv && !paper.demo) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
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
  );
}

/**
 * The evidence reports: on one line after their label on a card, and under
 * it in a row's narrow meta column, the links' text in line with the label.
 */
function Evidence({ paper, stacked = false, className }: { paper: Paper; stacked?: boolean; className?: string }) {
  if (paper.trs.length === 0) return null;
  const links = paper.trs.map((tr) => (
    <ButtonLink key={tr.slug} href={`/reports/${tr.slug}`} variant="ghost" size="sm" className="px-2">
      {tr.label}
    </ButtonLink>
  ));
  if (stacked) {
    return (
      <div className={className}>
        <span className="block text-label-13 text-muted-foreground/80">Evidence</span>
        <div className="-ml-2 mt-1 flex flex-wrap items-center gap-1">{links}</div>
      </div>
    );
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-x-1 gap-y-1', className)}>
      <span className="mr-2 text-label-13 text-muted-foreground/80">Evidence</span>
      {links}
    </div>
  );
}

/**
 * A public paper: its evidence report's picture, status and venue, the title
 * leading to the preprint, the thesis, then its links. The only papers set as
 * cards, because they have a picture.
 */
function PaperCard({ paper }: { paper: Paper }) {
  return (
    <Card as="article" variant="interactive" className="flex h-full flex-col">
      {/* the evidence report's archive picture, inset on the card without a
          frame of its own */}
      {paper.trs[0] && (
        <div className="mb-5 h-28 overflow-hidden rounded-lg bg-background/60 md:h-32">
          <ReportVisual slug={paper.trs[0].slug} />
        </div>
      )}
      <StatusLine paper={paper} />
      <h3 className="mt-3 text-heading-20 text-foreground">
        {paper.arxiv ? <CardLink href={paper.arxiv}>{paper.title}</CardLink> : paper.title}
        {paper.arxiv && <ArrowUpRight aria-hidden="true" className="card-arrow ml-1 inline-block h-4 w-4 align-baseline" />}
      </h3>
      <p className="mt-2 flex-1 text-copy-14 text-muted-foreground">{paper.thesis}</p>
      <PaperLinks paper={paper} className="mt-5" />
      <Evidence paper={paper} className={paper.arxiv || paper.demo ? 'mt-3' : 'mt-5'} />
    </Card>
  );
}

/**
 * A paper without a picture: the /show row, numbered, its title leading to
 * the preprint where there is one, the thesis and its links in the body, and
 * status, venue and evidence in the meta column.
 */
function PaperRow({ paper, index }: { paper: Paper; index: number }) {
  return (
    <ListRow
      as="article"
      index={ordinal(index)}
      title={paper.title}
      titleHref={paper.arxiv}
      description={paper.thesis}
      aside={
        <div className="space-y-3">
          <StatusLine paper={paper} />
          <Evidence paper={paper} stacked />
        </div>
      }
    >
      <PaperLinks paper={paper} className="pt-2" />
    </ListRow>
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
          description="The ICML 2026 workshop paper was accepted 2026-05-22 and presented at the workshop — the first peer-reviewed paper from the program. The speculative-decoding study is a public arXiv preprint."
          aside
        >
          <ul className={PAPER_GRID}>
            {[...PRESENTED, ...PUBLIC_PREPRINTS].map((paper, index) => (
              <Reveal as="li" key={paper.title} {...entranceItem(index, FIRST_PAPERS_AFTER)}>
                <PaperCard paper={paper} />
              </Reveal>
            ))}
          </ul>
        </Section>

        <Section
          id="under-review"
          title="Under peer review"
          // the withheld submissions are counted here, never titled
          description={`${UNDER_REVIEW_COUNT} papers submitted with PDFs, artifact manifests, and venue checklists complete. Now under blind review at top ML venues and workshops. Plus ${WITHHELD_WORKSHOP_SUBMISSIONS} workshop submissions under double-blind review. Their titles are withheld until decisions land.`}
          aside
        >
          <ol>
            {UNDER_REVIEW_PAPERS.map((paper, index) => (
              <Reveal as="li" key={paper.title}>
                <PaperRow paper={paper} index={index} />
              </Reveal>
            ))}
          </ol>
        </Section>

        <Section
          id="in-preparation"
          title="In preparation"
          description="Synthesis papers and methodology work derived from the published technical report archive, plus papers withdrawn from review and being revised for resubmission."
          aside
        >
          <ol>
            {IN_PREP.map((paper, index) => (
              <Reveal as="li" key={paper.title}>
                <PaperRow paper={paper} index={index} />
              </Reveal>
            ))}
          </ol>
        </Section>

        {/* the program behind the papers, then where to go next */}
        <div className="page-section">
          <p className="max-w-[60ch] text-copy-17 text-prose">
            The first paper was presented at the ICML 2026 Workshop on Hypothesis Testing, and the speculative-decoding study is
            public on arXiv; {UNDER_REVIEW_COUNT} more are under blind review at top ML venues and workshops, with {IN_PREP_COUNT} in
            preparation. Each is backed by reproducible technical reports and artifact-level provenance from a {MEASUREMENTS.DISPLAY}{' '}
            measurement program.
          </p>
          <OnwardLinks links={CROSS_LINKS} className="mt-10" />
        </div>
      </div>
    </div>
  );
}
