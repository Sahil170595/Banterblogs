import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { TOOLS } from '@/lib/tools';

export const metadata: Metadata = {
  title: 'Tools',
  description:
    'Two shipped command-line tools from the Chimera research program — Chimeraforge, an LLM deployment planner, and quantfit, a quantization CLI that measures whether quantization broke refusals.',
  alternates: { canonical: 'https://chimeraforge.vercel.app/tools' },
};

export default function ToolsIndexPage() {
  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-12 p-8 md:p-10">
        <span className="signal-pill">Shipped</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Tools</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          The parts of this program you can install and run today. Both are command-line tools on
          PyPI, both come out of the research archive, and both are built to say what they do not
          know.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {TOOLS.map((tool) => (
          <div key={tool.slug} className="signal-panel flex flex-col p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>v{tool.version}</span>
              <span aria-hidden="true">·</span>
              <span>{tool.license}</span>
              {!tool.ecosystem && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Standalone</span>
                </>
              )}
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-tight">{tool.name}</h2>
            <p className="mt-1 text-sm text-primary">{tool.tagline}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {tool.summary}
            </p>

            <div className="mt-5 inline-flex w-fit items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 font-mono text-sm">
              <span className="text-muted-foreground">$</span>
              <code className="text-foreground">{tool.install}</code>
              <CopyButton text={tool.install} label={`${tool.name} install command`} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-semibold">
              <Link
                href={`/tools/${tool.slug}`}
                className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
              >
                Details
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
              <Link
                href={tool.pypi}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
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
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        quantfit is an independent tool, not one of the nine Chimera repositories — it productizes
        the safety-under-quantization research line.{' '}
        <Link href="/platform" className="text-primary transition-colors hover:text-primary/80">
          See the platform
        </Link>{' '}
        for the ecosystem itself.
      </p>
    </div>
  );
}
