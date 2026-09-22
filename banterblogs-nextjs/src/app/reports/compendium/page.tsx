import 'highlight.js/styles/github-dark.css';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { entranceGroup } from '@/components/motion/entrance';
import { RevealScope } from '@/components/motion/RevealScope';
import { ReportDetails, ReportHero, ReportMeta } from '@/components/reports/ReportHead';
import { ReportProgress } from '@/components/reports/ReportProgress';
import { ReportTocMobile, ReportTocSidebar } from '@/components/reports/ReportToc';
import { DirectionalPage, NAV_BACK, ReportTitleTransition } from '@/components/reports/ReportTransitions';
import { reportIdentity } from '@/components/reports/reportIdentity';
import { ReportEnd } from '@/components/reports/reportEnd';
import { cn } from '@/lib/cn';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { computeContentStats, extractHeadings, MIN_TOC_HEADINGS } from '@/lib/episodes';
import { prepareReportMarkdown, renderReportDocument } from '@/lib/reports/content';
import { readReportMeta } from '@/lib/reports/meta';

export const runtime = 'nodejs';

const METADATA_TITLE = 'Chimeraforge Whitepaper: High-Performance LLM Agent Orchestration';
const METADATA_DESCRIPTION =
    'Rust vs. Python for production AI orchestration — hybrid architecture and Dual Ollama pattern achieving 58% latency reduction.';

export const metadata: Metadata = {
    alternates: { canonical: '/reports/compendium' },
    title: METADATA_TITLE,
    description: METADATA_DESCRIPTION,
    openGraph: {
        images: ['/opengraph-image.png'],
        title: `${METADATA_TITLE} | Chimeraforge`,
        description: METADATA_DESCRIPTION,
        url: 'https://chimeraforge.vercel.app/reports/compendium',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: `${METADATA_TITLE} | Chimeraforge`,
        description: METADATA_DESCRIPTION,
    },
};

// the report catalog's key, which the archive card links and morphs from
const COMPENDIUM_SLUG = 'compendium';
// The head's first-load entrance: the breadcrumb, the dek, then the meta and
// details. The title paints at once: on a phone it is the largest text in
// view, and Chrome credits a fade from 0 to LCP only when it ends.
const HEAD_GROUP = { crumbs: 0, dek: 1, meta: 2 } as const;
const NOTE_HEADING = 'report-pager-label';

/**
 * The research compendium on the report page's reading register: its title
 * block folds into the head (the report page does the same), its body reads
 * in the reading type with the report contents beside it, and the notes the
 * old sidebar held (hidden on phones) follow the body for every reader.
 */
export default async function CompendiumPage() {
    const filePath = path.join(process.cwd(), 'PublishReady', 'research_compendium.md');

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const { html, headings, frontMatter } = await renderReportDocument(prepareReportMarkdown(raw), {
        foldTitleBlock: true,
        dropInlineToc: extractHeadings(raw).length >= MIN_TOC_HEADINGS,
        markRevealTargets: true,
    });
    const meta = readReportMeta(COMPENDIUM_SLUG);
    const title = meta?.title ?? METADATA_TITLE;
    const { heading, label } = reportIdentity(COMPENDIUM_SLUG, title);
    const readingMinutes = computeContentStats(html).readingTime;
    const dek = entranceGroup(HEAD_GROUP.dek);

    return (
        <DirectionalPage className="container pb-24 pt-8 md:pt-10">
            <ReportProgress />

            <div className="report-head">
                <nav aria-label="Breadcrumb" {...entranceGroup(HEAD_GROUP.crumbs)}>
                    <ol className="report-crumbs">
                        <li>
                            <Link href="/reports" transitionTypes={[NAV_BACK]}>
                                Research archive
                            </Link>
                        </li>
                    </ol>
                </nav>
                <ReportTitleTransition slug={COMPENDIUM_SLUG}>
                    <h1 className="report-title">{heading}</h1>
                </ReportTitleTransition>
                {meta?.description && (
                    <p className={cn('report-dek', dek.className)} style={dek.style}>
                        {meta.description}
                    </p>
                )}
                <div {...entranceGroup(HEAD_GROUP.meta)}>
                    <ReportMeta label={label} phaseNumber={null} readingMinutes={readingMinutes} date={frontMatter?.date ?? null} />
                    {frontMatter && <ReportDetails frontMatter={frontMatter} />}
                </div>
            </div>

            <ReportHero slug={COMPENDIUM_SLUG} />

            <ReportTocMobile headings={headings} />

            <div className="mt-8 grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_15rem]">
                <article className="min-w-0">
                    <RevealScope className="report-prose prose prose-invert" html={html} />
                </article>
                <ReportTocSidebar headings={headings} />
            </div>
            <ReportEnd />

            {/* the old sidebar's notes, whole, under one hairline */}
            <aside aria-label="About this paper" className="mt-20 grid gap-10 border-t border-border/40 pt-8 md:grid-cols-2">
                <div className="max-w-[60ch]">
                    <h2 className={NOTE_HEADING}>About this Paper</h2>
                    <p className="mt-3 text-copy-16 text-prose">
                        This whitepaper synthesizes the foundational Phase 1 research (TR108-TR116) — the Rust vs. Python comparison that
                        shaped the platform architecture.
                    </p>
                    <p className="mt-3 text-label-13 text-muted-foreground">Published: November 2025 &middot; Sahil Kadadekar</p>
                </div>
                <div className="max-w-[60ch]">
                    <h2 className={NOTE_HEADING}>Source Data</h2>
                    <p className="mt-3 text-copy-16 text-prose">
                        Access all {REPORTS.DISPLAY} technical reports, {MEASUREMENTS.SHORT} measurements, and phase whitepapers.
                    </p>
                    <Link
                        href="/reports"
                        transitionTypes={[NAV_BACK]}
                        className="group mt-3 inline-flex items-center gap-1.5 text-label-13 font-medium text-primary"
                    >
                        View Technical Archives
                        <span aria-hidden="true" className="inline-block transition-transform duration-hover ease-strong-out group-hover:translate-x-[var(--motion-nudge)]">
                            &rarr;
                        </span>
                    </Link>
                </div>
            </aside>
        </DirectionalPage>
    );
}
