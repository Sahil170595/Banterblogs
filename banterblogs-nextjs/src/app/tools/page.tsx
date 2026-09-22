import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem } from '@/components/motion/entrance';
import { ReportVisual } from '@/components/reports/ReportVisual';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardLink } from '@/components/ui/Card';
import { CommandChip } from '@/components/ui/CommandChip';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';
import { TOOLS, type ToolDef } from '@/lib/tools';

const METADATA_DESCRIPTION =
  'Two shipped command-line tools from the Chimera research program — Chimeraforge, an LLM deployment planner, and quantfit, a quantization CLI that measures whether quantization broke refusals.';

export const metadata: Metadata = {
  alternates: { canonical: '/tools' },
  title: 'Tools',
  description: METADATA_DESCRIPTION,
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Tools | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/tools',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tools | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

// The lede is the largest text in the fold, so it paints at once (a fade from
// 0 is credited to LCP only when it ends: 992 ms measured); the cards follow
// the title, the head's one staged group, into the entrance.
const CARDS_AFTER = 1;

/**
 * A CLI as an interactive card: its drawing (the archive's generator, seeded
 * by the tool's name), its facts, the install chip, and its links. The title
 * stretches over the card to the tool's page; the chip and the buttons sit
 * above that link.
 */
function ToolCard({ tool }: { tool: ToolDef }) {
  return (
    <Card as="article" variant="interactive" className="flex h-full flex-col">
      <div className="mb-6 h-36 overflow-hidden rounded-lg bg-background/60 md:h-44">
        <ReportVisual slug={tool.name} />
      </div>
      <p className="text-label-12-mono text-muted-foreground">
        v{tool.version}
        <span aria-hidden="true"> · </span>
        {tool.license}
        {!tool.ecosystem && (
          <>
            <span aria-hidden="true"> · </span>
            Standalone
          </>
        )}
      </p>
      <h2 className="mt-3 text-heading-32 text-foreground">
        <CardLink href={`/tools/${tool.slug}`}>{tool.name}</CardLink>
        <ArrowRight aria-hidden="true" className="card-arrow ml-2 inline-block h-5 w-5 align-baseline" />
      </h2>
      <p className="mt-1 text-copy-16 font-medium text-foreground/90">{tool.tagline}</p>
      <p className="mt-3 flex-1 text-copy-14 text-muted-foreground">{tool.summary}</p>
      <CommandChip command={tool.install} label={`${tool.name} install command`} className="mt-6 self-start" />
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ButtonLink href={`/tools/${tool.slug}`} size="sm" variant="primary" iconEnd={<ArrowRight className="h-3.5 w-3.5" />}>
          Details
        </ButtonLink>
        <ButtonLink href={tool.pypi} size="sm" variant="ghost" iconEnd={<ArrowUpRight className="h-3.5 w-3.5" />}>
          PyPI
        </ButtonLink>
        <ButtonLink href={tool.repo} size="sm" variant="ghost" iconEnd={<ArrowUpRight className="h-3.5 w-3.5" />}>
          Source
        </ButtonLink>
      </div>
    </Card>
  );
}

export default function ToolsIndexPage() {
  return (
    <div className="container pb-24">
      <PageHeader
        eyebrow={<Eyebrow dot="green">Shipped</Eyebrow>}
        title="Tools"
        stillLede
        lede="The parts of this program you can install and run today. Both are command-line tools on PyPI, both come out of the research archive, and both are built to say what they do not know."
      />

      <ul className="mt-10 grid gap-4 md:mt-14 lg:grid-cols-2">
        {TOOLS.map((tool, index) => (
          <Reveal as="li" key={tool.slug} {...entranceItem(index, CARDS_AFTER)}>
            <ToolCard tool={tool} />
          </Reveal>
        ))}
      </ul>

      <p className="mt-12 max-w-[60ch] text-copy-16 text-muted-foreground">
        quantfit is an independent tool, not one of the nine Chimera repositories — it productizes
        the safety-under-quantization research line.{' '}
        <Link href="/platform" className="text-foreground underline decoration-foreground/35 underline-offset-4 transition-colors duration-fast ease-standard hover:decoration-primary">
          See the platform
        </Link>{' '}
        for the ecosystem itself.
      </p>
    </div>
  );
}
