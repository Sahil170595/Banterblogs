import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export const runtime = 'nodejs';

export default async function BanterpacksPage() {
  const episodes = await getAllEpisodes();
  
  // Filter for Banterpacks episodes (episode-XXX.md files)
  const banterpacksEpisodes = episodes.filter(ep =>
    ep.slug.startsWith('episode-') && !ep.slug.startsWith('chimera-episode-')
  );

  return (
    <div className="container py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Banterpacks</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Privacy-first streaming overlay platform. Real-time local processing with zero data collection.
        </p>
        
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">Core Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Real-time overlay rendering</li>
              <li>• Local AI processing</li>
              <li>• Privacy-first design</li>
              <li>• Cross-platform support</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">Tech Stack</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• WebRTC for streaming</li>
              <li>• WebGL for rendering</li>
              <li>• Local ML inference</li>
              <li>• Electron wrapper</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">Status</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Core rendering complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>AI integration in progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Development Episodes</h2>
        <p className="text-muted-foreground mb-6">
          {banterpacksEpisodes.length} episodes covering Banterpacks development
        </p>
      </div>

      <EpisodeFilters episodes={banterpacksEpisodes} />
    </div>
  );
}
