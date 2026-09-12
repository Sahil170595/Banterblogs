import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { REPORTS } from '@/lib/constants';

export interface ReportTeaser {
  slug: string;
  title: string;
  description: string;
}

interface ResearchSpotlightProps {
  reports: ReportTeaser[];
}

export function ResearchSpotlight({ reports }: ResearchSpotlightProps) {
  return (
    <section className="container py-20 md:py-28">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-4">
          <span className="signal-pill">Latest research</span>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Every claim, measured.</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            The newest technical reports from the {REPORTS.DISPLAY}-report program — CUDA-timed
            benchmarks and controlled safety evaluations, each backed by reproducible raw data.
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2 text-sm font-semibold text-foreground transition-[color,background-color,border-color,transform] duration-fast ease-standard hover:border-primary/60 hover:text-primary motion-safe:active:scale-[0.98]"
        >
          Browse the archive
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {reports.length > 0 ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reports.slice(0, 6).map((report) => (
            <Link
              key={report.slug}
              href={`/reports/${report.slug}`}
              className="block group rounded-xl border border-border/50 bg-card/30 p-6 transition-colors duration-fast ease-standard hover:border-primary/40 hover:bg-muted/20"
            >
              <h3 className="mb-3 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                {report.title}
              </h3>
              {report.description && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{report.description}</p>
              )}
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 group-focus-visible:opacity-100">
                Read report <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-10 signal-panel p-8 text-center text-muted-foreground">
          <p>Reports will be loaded dynamically.</p>
        </div>
      )}
    </section>
  );
}
