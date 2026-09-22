import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import { Reveal } from './motion/Reveal';
import { entranceGroup } from './motion/entrance';
import { Badge } from './ui/Badge';
import { ButtonLink } from './ui/Button';
import { CommandChip } from './ui/CommandChip';
import { Eyebrow } from './ui/Eyebrow';
import { FlowFigure } from './ui/FlowFigure';
import { ListRow } from './ui/ListRow';
import { PageHeader } from './ui/PageHeader';
import { Section } from './ui/Section';
import { cn } from '@/lib/cn';
import { readReportMeta } from '@/lib/reports/meta';
import type { ToolDef } from '@/lib/tools';

// Shared body for every /tools/<slug> page. Both CLIs render through this, so
// the pages cannot structurally drift and a third tool is a data entry in
// tools.ts rather than a new page.
//
// Server component: readReportMeta touches the filesystem, which is fine here
// because every /tools route is statically generated at build time.

function reportTitle(slug: string): string {
  return readReportMeta(slug)?.title ?? slug;
}

const reportLabel = (slug: string) => slug.replace('technical-report-', 'TR');
const ordinal = (index: number) => String(index + 1).padStart(2, '0');
// the head stages the title, then the facts with the links (its summary, the
// largest text in the fold, paints at once); the quickstart closes it
const QUICKSTART_GROUP = 2;
const quickstartEntrance = entranceGroup(QUICKSTART_GROUP);

/**
 * The product template: the head with the install chip and the links, the
 * principle the tool is built on, its features as rows, its commands, the
 * evidence as a table and the limits it states about itself.
 */
export function ToolPage({ tool }: { tool: ToolDef }) {
  return (
    <div className="container pb-24">
      {/* the head, and beside it from lg how the tool decides */}
      <div className={cn('tool-head', tool.pipeline && 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-x-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]')}>
        <div className="min-w-0">
          <PageHeader
            eyebrow={
              <span className="flex flex-wrap items-center gap-3">
                <Badge tone="ember">CLI</Badge>
                <Eyebrow as="span">{tool.tagline}</Eyebrow>
              </span>
            }
            title={tool.name}
            stillLede
            lede={tool.summary}
            meta={
              <ul aria-label="About this release" className="meta-list basis-full text-label-13 text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">v{tool.version}</span>
                </li>
                <li>{tool.license}</li>
                <li>Python {tool.python}</li>
                {/* quantfit is a standalone tool, not one of the nine repos —
                    state it here so the page never inflates the ecosystem count */}
                {!tool.ecosystem && <li>Standalone tool</li>}
              </ul>
            }
            actions={
              <>
                <CommandChip command={tool.install} label={`${tool.name} install command`} />
                <ButtonLink href={tool.pypi} variant="primary" iconEnd={<ArrowUpRight className="h-4 w-4" />}>
                  PyPI
                </ButtonLink>
                <ButtonLink href={tool.repo} variant="ghost" iconEnd={<ArrowUpRight className="h-4 w-4" />}>
                  Source
                </ButtonLink>
                {tool.changelog && (
                  <ButtonLink href={tool.changelog} variant="ghost" iconEnd={<ArrowUpRight className="h-4 w-4" />}>
                    Changelog
                  </ButtonLink>
                )}
              </>
            }
          />
          {/* outside the head's action row, so a long command scrolls inside
              the chip instead of widening the row past a phone's edge */}
          <div className={cn(quickstartEntrance.className, 'mt-3')} style={quickstartEntrance.style}>
            <CommandChip command={tool.quickstart} label={`${tool.name} quickstart command`} />
          </div>
        </div>
        {tool.pipeline && (
          <div className={cn(quickstartEntrance.className, 'mt-12 min-w-0 lg:mt-0 lg:pt-10')} style={quickstartEntrance.style}>
            <FlowFigure title={tool.pipeline.title} caption={tool.pipeline.caption} steps={tool.pipeline.steps} />
          </div>
        )}
      </div>

      <div className="mt-16 md:mt-24">
        {/* the honesty commitment each tool leads with */}
        <Section id="principle" title={tool.principle.title}>
          <p className="max-w-[39rem] border-l-2 border-primary/60 pl-5 text-copy-18 text-prose">{tool.principle.body}</p>
        </Section>

        <Section id="features" title="Features">
          <ul>
            {tool.highlights.map((highlight, index) => (
              <Reveal as="li" key={highlight.title}>
                <ListRow index={ordinal(index)} title={highlight.title} description={highlight.body} />
              </Reveal>
            ))}
          </ul>
        </Section>

        <Section
          id="commands"
          title="Commands"
          description={
            <>
              {tool.commands.length} commands. Full flags and output samples live in the{' '}
              <Link
                href={tool.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-foreground/35 underline-offset-4 transition-colors duration-fast ease-standard hover:decoration-primary"
              >
                README
              </Link>
              .
            </>
          }
        >
          <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {tool.commands.map((command) => (
              <Reveal as="li" key={command.name} className="list-row py-4">
                <code className="font-mono text-copy-14 font-semibold text-foreground">{command.name}</code>
                <p className="mt-1 text-copy-14 text-muted-foreground">{command.summary}</p>
              </Reveal>
            ))}
          </ul>
        </Section>

        {/* the thing a PyPI page cannot do */}
        <Section
          id="evidence"
          title="Evidence"
          description="Each capability traces to the measurements behind it. These are the published reports, not a summary of them."
        >
          <Reveal>
            <table role="table" className="evidence-table">
              <thead role="rowgroup">
                <tr role="row" className="text-label-12-mono text-muted-foreground">
                  <th role="columnheader" scope="col" className="w-[22%] font-medium">
                    Capability
                  </th>
                  <th role="columnheader" scope="col" className="font-medium">
                    What it rests on
                  </th>
                  <th role="columnheader" scope="col" className="w-[18%] font-medium">
                    Reports
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {tool.evidence.map((item) => (
                  <tr role="row" key={item.claim}>
                    <td role="cell" className="text-copy-16 font-semibold text-foreground">
                      {item.claim}
                    </td>
                    <td role="cell" className="text-copy-14 text-prose">
                      {item.detail}
                    </td>
                    <td role="cell">
                      <span className="flex flex-wrap gap-1">
                        {item.reports.map((slug) => (
                          <ButtonLink key={slug} href={`/reports/${slug}`} variant="ghost" size="sm" className="px-2 font-mono tabular-nums" aria-label={`${reportLabel(slug)}: ${reportTitle(slug)}`} iconEnd={<ArrowRight className="h-3 w-3" />}>
                            {reportLabel(slug)}
                          </ButtonLink>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </Section>

        {/* stated limits — published in the README, repeated rather than hidden */}
        <Section id="limits" title="What it does not do" description="The limits the tool states about itself.">
          <ul className="max-w-[39rem] space-y-3">
            {tool.limits.map((limit) => (
              <Reveal as="li" key={limit} className="flex gap-3 text-copy-16 text-prose">
                <Minus aria-hidden="true" className="mt-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {limit}
              </Reveal>
            ))}
          </ul>
        </Section>

        <div className="page-section flex flex-wrap gap-3">
          <ButtonLink href="/tools" iconEnd={<ArrowRight className="h-4 w-4" />}>
            All tools
          </ButtonLink>
          <ButtonLink href="/reports" iconEnd={<ArrowRight className="h-4 w-4" />}>
            Research archive
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
