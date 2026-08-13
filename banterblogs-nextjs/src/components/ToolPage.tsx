import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Terminal } from 'lucide-react';
import { CopyButton } from './CopyButton';
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

export function ToolPage({ tool }: { tool: ToolDef }) {
  return (
    <div className="container py-16">
      {/* ── Hero ── */}
      <div className="signal-panel-strong mb-12 p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="signal-pill">CLI</span>
          <span>v{tool.version}</span>
          <span aria-hidden="true">·</span>
          <span>{tool.license}</span>
          <span aria-hidden="true">·</span>
          <span>Python {tool.python}</span>
          {!tool.ecosystem && (
            <>
              <span aria-hidden="true">·</span>
              {/* quantfit is a standalone tool, not one of the nine repos —
                  state it here so the page never inflates the ecosystem count */}
              <span>Standalone tool</span>
            </>
          )}
        </div>

        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{tool.name}</h1>
        <p className="mt-2 text-lg text-primary">{tool.tagline}</p>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {tool.summary}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 font-mono text-sm backdrop-blur">
            <span className="text-muted-foreground">$</span>
            <code className="text-foreground">{tool.install}</code>
            <CopyButton text={tool.install} label={`${tool.name} install command`} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <Link
              href={tool.pypi}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
            >
              PyPI
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href={tool.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
            >
              Source
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            {tool.changelog && (
              <Link
                href={tool.changelog}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              >
                Changelog
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 overflow-x-auto rounded-xl border border-border/40 bg-background/50 px-4 py-2.5 font-mono text-xs">
          <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <code className="whitespace-nowrap text-muted-foreground">{tool.quickstart}</code>
        </div>
      </div>

      {/* ── The honesty commitment each tool leads with ── */}
      <section className="mb-16">
        <div className="signal-panel p-6 md:p-8">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">{tool.principle.title}</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            {tool.principle.body}
          </p>
        </div>
      </section>

      {/* ── Highlights ── */}
      <section className="mb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {tool.highlights.map((highlight) => (
            <div key={highlight.title} className="signal-panel p-5">
              <h3 className="text-sm font-semibold">{highlight.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{highlight.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Command surface ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-2xl font-bold tracking-tight">Commands</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {tool.commands.length} commands. Full flags and output samples live in the{' '}
          <Link
            href={tool.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary transition-colors hover:text-primary/80"
          >
            README
          </Link>
          .
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tool.commands.map((command) => (
            <div key={command.name} className="signal-panel px-4 py-3">
              <code className="font-mono text-sm font-semibold text-primary">{command.name}</code>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{command.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Evidence: the thing a PyPI page cannot do ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-2xl font-bold tracking-tight">Evidence</h2>
        <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
          Each capability traces to the measurements behind it. These are the published reports, not
          a summary of them.
        </p>
        <div className="space-y-3">
          {tool.evidence.map((item) => (
            <div key={item.claim} className="signal-panel p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="md:max-w-2xl">
                  <h3 className="text-sm font-semibold">{item.claim}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.reports.map((slug) => (
                    <Link
                      key={slug}
                      href={`/reports/${slug}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      title={reportTitle(slug)}
                    >
                      {slug.replace('technical-report-', 'TR')}
                      <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stated limits — published in the README, repeated rather than hidden ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-2xl font-bold tracking-tight">What it does not do</h2>
        <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
          The limits the tool states about itself.
        </p>
        <ul className="space-y-2.5">
          {tool.limits.map((limit) => (
            <li key={limit} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
              {limit}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-6 border-t border-border/40 pt-8 text-sm font-semibold">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
        >
          All tools
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
        >
          Research archive
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
