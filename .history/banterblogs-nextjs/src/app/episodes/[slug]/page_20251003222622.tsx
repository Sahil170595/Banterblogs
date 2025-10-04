import { notFound } from 'next/navigation';
import { getEpisode, getAllEpisodes } from '@/lib/episodes';
import { EpisodeContent } from '@/components/EpisodeContent';
import { EpisodeNavigation } from '@/components/EpisodeNavigation';
import { EpisodeStats } from '@/components/EpisodeStats';

// Static generation for build - temporarily disabled for testing
// export async function generateStaticParams() {
//   try {
//     const episodes = await getAllEpisodes();
//     return episodes.map((episode) => ({
//       slug: episode.slug,
//     }));
//   } catch (error) {
//     console.error('Error generating static params:', error);
//     // Return empty array to avoid build failure
//     return [];
//   }
// }

export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const episode = await getEpisode(slug);

  if (!episode) {
    notFound();
  }

  const allEpisodes = await getAllEpisodes();
  const currentIndex = allEpisodes.findIndex((ep) => ep.id === episode.id);
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        {/* Episode Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Episode {episode.id}
            </span>
            <span className="text-sm text-muted-foreground">
              {new Date(episode.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-4">
            {episode.title}
          </h1>

          <p className="text-xl text-muted-foreground mb-6">
            {episode.subtitle}
          </p>

          <EpisodeStats episode={episode} />
        </div>

        {/* Episode Content */}
        <EpisodeContent episode={episode} />

        {/* Episode Navigation */}
        <EpisodeNavigation prevEpisode={prevEpisode} nextEpisode={nextEpisode} />
      </div>
    </div>
  );
}
