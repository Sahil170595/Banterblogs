import 'highlight.js/styles/github-dark.css';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
export const runtime = 'nodejs';
// Prerender all episode pages at build; the archive is final so on-demand
// renders only re-run for ISR refreshes, not first visits.
export const revalidate = 900;
import { getAllEpisodes, toEpisodeSummary, extractHtmlHeadings, computeContentStats } from '@/lib/episodes';
import { EpisodeNavigation } from '@/components/EpisodeNavigation';

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
    openGraph: {
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
import { EpisodeStats } from '@/components/EpisodeStats';
import { TableOfContents } from '@/components/TableOfContents';
import { ArticleEnhancements } from '@/components/ContentEnhancer';
import { ContentStats } from '@/components/ContentStats';
import { MobileNavigation } from '@/components/MobileOptimization';
import { EpisodeFloatingUI } from '@/components/EpisodeFloatingUI';
import { EpisodeRecommendationsClient } from '@/components/EpisodeRecommendationsClient';

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
  const platformLabel = episode.platform === 'chimera' ? 'Chimera' : episode.platform === 'benchmark' ? 'Benchmarks' : 'Banterpacks';

  // Derive TOC headings and stats server-side so the article HTML rides the
  // RSC payload exactly once (the server-rendered body below) instead of four
  // times as client-component props.
  const headings = extractHtmlHeadings(episode.content);
  const contentStats = computeContentStats(episode.content);
  const summary = toEpisodeSummary(episode);

  return (
    <>
      <TableOfContents headings={headings} />

      <EpisodeFloatingUI episode={summary} />

      <MobileNavigation
        prevEpisode={prevEpisode && { slug: prevEpisode.slug, title: prevEpisode.title }}
        nextEpisode={nextEpisode && { slug: nextEpisode.slug, title: nextEpisode.title }}
      />

      <div className="container py-16">
        <div className="max-w-5xl mx-auto">
          <div className="signal-panel-strong mb-10 p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="signal-pill">Episode {displayId}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {platformLabel}
              </span>
              <span>
                {new Date(episode.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
              </span>
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight">{episode.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{episode.subtitle}</p>

            <div className="signal-divider my-6" />

            <EpisodeStats episode={episode} />
          </div>

          <div className="signal-panel mb-10 p-6">
            <ContentStats stats={contentStats} />
          </div>

          <div
            className="signal-panel p-8 prose prose-lg prose-zinc prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-foreground
            prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12
            prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-10
            prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-8
            prose-h4:text-xl prose-h4:mb-3 prose-h4:mt-6
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground prose-strong:font-semibold
            prose-code:text-sm prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded
            prose-pre:bg-muted prose-pre:border prose-pre:border-border
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:rounded-r-lg
            prose-ul:list-disc prose-ol:list-decimal
            prose-li:text-muted-foreground prose-li:mb-2
            prose-img:rounded-xl prose-img:shadow-lg prose-img:border prose-img:border-border
            prose-table:border prose-table:border-border prose-table:rounded-lg
            prose-th:bg-muted prose-th:font-semibold prose-th:text-foreground
            prose-td:border prose-td:border-border prose-td:text-muted-foreground"
          >
            {/* Server-rendered article body — SEO/no-JS complete on first paint. */}
            <div id="episode-article" dangerouslySetInnerHTML={{ __html: episode.content }} />
            <ArticleEnhancements articleId="episode-article" />
          </div>

          <EpisodeNavigation
            prevEpisode={prevEpisode && { slug: prevEpisode.slug, title: prevEpisode.title }}
            nextEpisode={nextEpisode && { slug: nextEpisode.slug, title: nextEpisode.title }}
          />

          <div className="mt-16">
            <EpisodeRecommendationsClient
              currentEpisode={toEpisodeSummary(episode)}
              allEpisodes={allEpisodes.map(toEpisodeSummary)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
