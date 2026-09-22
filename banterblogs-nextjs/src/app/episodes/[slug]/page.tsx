import 'highlight.js/styles/github-dark.css';
import '@/app/reading.css';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getAllEpisodes, toEpisodeSummary, extractHtmlHeadings, computeContentStats } from '@/lib/episodes';
import { EpisodeNavigation } from '@/components/EpisodeNavigation';
import Link from 'next/link';
import { EpisodeStats } from '@/components/EpisodeStats';
import { ArticleEnhancements } from '@/components/ContentEnhancer';
import { ContentStats } from '@/components/ContentStats';
import { MobileNavigation } from '@/components/MobileOptimization';
import { EpisodeFloatingUI } from '@/components/EpisodeFloatingUI';
import { ContentRecommendations, recommendEpisodes } from '@/components/ContentRecommendations';
import { platformLabel as platformLabelOf } from '@/components/EpisodeRow';
import { entranceGroup } from '@/components/motion/entrance';
import { RevealScope } from '@/components/motion/RevealScope';
import { ReportProgress } from '@/components/reports/ReportProgress';
import { ReportTocMobile, ReportTocSidebar } from '@/components/reports/ReportToc';
import { ReportEnd } from '@/components/reports/reportEnd';
import { cn } from '@/lib/cn';

export const runtime = 'nodejs';
// Prerendered at build and never revalidated: the archive ships inside the
// deployment, so a regeneration would only redo work for identical output.

export async function generateStaticParams() {
  const episodes = await getAllEpisodes();
  return episodes.map((episode) => ({ slug: episode.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const slugParam = decodeURIComponent(slug).toLowerCase();
  const allEpisodes = await getAllEpisodes();
  const episode = allEpisodes.find((ep) => ep.slug.toLowerCase() === slugParam);
  if (!episode) {
    return { title: 'Episode' };
  }
  const displayId = episode.displayId ?? episode.id;
  // The markdown H1 often already starts with "Episode N:" — don't double-prefix.
  const alreadyPrefixed = /^episode\s+\d+\b/i.test(episode.title.trim());
  const title = alreadyPrefixed ? episode.title : `Episode ${displayId}: ${episode.title}`;
  const description =
    episode.subtitle ?? episode.preview ?? `${episode.title} — Chimeraforge dev log episode ${displayId}.`;
  const url = `https://chimeraforge.vercel.app/episodes/${episode.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Archived blog stratum: keep the URLs, keep them out of the index.
    robots: { index: false, follow: true },
    openGraph: {
      images: ['/opengraph-image.png'],
      title: `${title} | Chimeraforge`,
      description,
      url,
      type: 'article',
      publishedTime: new Date(episode.date).toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Chimeraforge`,
      description,
    },
  };
}

// the head's first-load entrance: breadcrumb and title, the dek, the meta and counts
const HEAD_GROUP = { title: 0, dek: 1, meta: 2 } as const;
// each platform's archive, the breadcrumb's second step
const PLATFORM_ARCHIVE: Record<string, string> = { Chimera: '/chimera', Banterpacks: '/banterpacks' };
// the episode's date, as the old head printed it, in every time zone alike
const EPISODE_DATE = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const slugParam = decodeURIComponent(slug).toLowerCase();
  const allEpisodes = await getAllEpisodes();

  const episodeBySlug = allEpisodes.find((ep) => ep.slug.toLowerCase() === slugParam);

  let episode = episodeBySlug;

  if (!episode) {
    const banterMatch = slugParam.match(/^episode-(\d+)$/) ?? slugParam.match(/^(\d+)$/);
    if (banterMatch) {
      const displayId = parseInt(banterMatch[1], 10);
      episode = allEpisodes.find((ep) => ep.platform !== 'chimera' && ep.displayId === displayId);
    }
  }

  if (!episode) {
    const chimeraMatch = slugParam.match(/^chimera(?:-episode)?-(\d+)$/);
    if (chimeraMatch) {
      const displayId = parseInt(chimeraMatch[1], 10);
      episode = allEpisodes.find((ep) => ep.platform === 'chimera' && ep.displayId === displayId);
    }
  }

  if (!episode) {
    notFound();
  }

  const canonicalSlug = episode.slug.toLowerCase();
  if (slugParam !== canonicalSlug) {
    redirect(`/episodes/${episode.slug}`);
  }

  const currentIndex = allEpisodes.findIndex((ep) => ep.id === episode?.id);
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  const displayId = episode.displayId ?? episode.id;
  const platformLabel = platformLabelOf(episode);
  const platformArchive = PLATFORM_ARCHIVE[platformLabel];

  // Derive TOC headings and stats server-side so the article HTML rides the
  // RSC payload exactly once (the server-rendered body below) instead of four
  // times as client-component props.
  const headings = extractHtmlHeadings(episode.content);
  const contentStats = computeContentStats(episode.content);
  const summary = toEpisodeSummary(episode);

  return (
    <>
      <ReportProgress />

      <MobileNavigation
        prevEpisode={prevEpisode && { slug: prevEpisode.slug, title: prevEpisode.title }}
        nextEpisode={nextEpisode && { slug: nextEpisode.slug, title: nextEpisode.title }}
      />

      {/* the report page's reading register: breadcrumb, title, dek and meta, then the body and its contents */}
      <div className="container pb-24 pt-8 md:pt-10">
        {/* one centred frame: the head over the article column and the contents rail */}
        <div className="report-frame">
          <div className="report-head">
            <div {...entranceGroup(HEAD_GROUP.title)}>
              <nav aria-label="Breadcrumb">
                <ol className="report-crumbs">
                  <li>
                    <Link href="/episodes">Episode archive</Link>
                  </li>
                  {platformArchive && (
                    <li>
                      <Link href={platformArchive}>{platformLabel} episodes</Link>
                    </li>
                  )}
                </ol>
              </nav>
              <h1 className="report-title">{episode.title}</h1>
            </div>
            {episode.subtitle && (
              <p className={cn('report-dek', entranceGroup(HEAD_GROUP.dek).className)} style={entranceGroup(HEAD_GROUP.dek).style}>
                {episode.subtitle}
              </p>
            )}
            <div {...entranceGroup(HEAD_GROUP.meta)}>
              <ul className="report-meta" aria-label="About this episode">
                <li>
                  <strong>Episode {displayId}</strong>
                </li>
                <li>{platformLabel}</li>
                <li>
                  <time dateTime={episode.date}>{EPISODE_DATE.format(new Date(episode.date))}</time>
                </li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                <EpisodeStats
                  filesChanged={episode.filesChanged}
                  linesAdded={episode.linesAdded}
                  readingTime={episode.readingTime}
                  complexity={episode.complexity}
                />
                <ContentStats stats={contentStats} />
              </div>
            </div>
          </div>

          <div className="report-layout">
            <div className="min-w-0">
              <ReportTocMobile headings={headings} />
              {/* Server-rendered article body, complete without JavaScript; its tables,
                  code blocks and figures reveal as they scroll in. */}
              <article id="episode-article">
                <RevealScope className="report-prose prose prose-invert" html={episode.content} />
              </article>
              <ArticleEnhancements articleId="episode-article" />
            </div>
            <ReportTocSidebar headings={headings} />
          </div>
          <ReportEnd />

          <EpisodeNavigation
            prevEpisode={prevEpisode && { slug: prevEpisode.slug, title: prevEpisode.title }}
            nextEpisode={nextEpisode && { slug: nextEpisode.slug, title: nextEpisode.title }}
          />

          {/* scored on the server: only the picks reach the page */}
          <ContentRecommendations
            className="mt-20"
            current={summary}
            recommendations={recommendEpisodes(episode, allEpisodes).map(toEpisodeSummary)}
          />
        </div>
      </div>

      {/* fixed-position, so it sits after the article in reading and Tab
          order without moving on screen */}
      <EpisodeFloatingUI episode={summary} />
    </>
  );
}
