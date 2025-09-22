import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { EpisodeCard } from '@/components/EpisodeCard';
import { StatsCard } from '@/components/StatsCard';
import { Hero } from '@/components/Hero';

export default async function HomePage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);
  const featuredEpisodes = episodes.slice(0, 6);

  return (
    <div className="flex flex-col">
      <Hero stats={stats} />
      
      <section className="container py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Latest Episodes</h2>
          <a
            href="/episodes"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all episodes →
          </a>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredEpisodes.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
        </div>
      </section>

      <section className="container py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            The Epic Saga of Building Banterpacks
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Watch as four AI personalities (Claude, ChatGPT, Gemini, and Banterpacks) 
            discuss the daily development journey, technical decisions, and the wild 
            ride of building something amazing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/episodes"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Reading
            </a>
            <a
              href="/about"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
