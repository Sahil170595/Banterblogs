import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber, formatReadingTime } from '@/lib/formatUtils';

export default async function AboutPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-24">
      <div className="max-w-6xl mx-auto space-y-24">
        <h1 className="display text-5xl font-bold tracking-tight mb-12">Platform Architecture</h1>
        
        <div className="bg-gradient-to-br from-blue-50/10 to-purple-50/10 gradient-border rounded-2xl p-8 mb-12 noise-overlay">
          <h2 className="text-3xl font-bold mb-6">The Banter Platform</h2>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Banterblogs documents the complete Banter Platform ecosystem: private repositories combining real-time AI overlay technology, 
            production-grade ML infrastructure, and automated development documentation. 
            Three integrated platforms creating the future of interactive streaming content.
          </p>
        </div>

        <div className="border-t border-border pt-8">
          <h2 className="text-3xl font-bold mb-8">Development Metrics</h2>
          
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 mb-8">
            <div className="text-center p-6 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">{stats.totalEpisodes}</div>
              <div className="text-lg font-semibold mb-1">Episodes</div>
              <div className="text-sm text-muted-foreground">Automated from commits</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">{formatNumber(stats.totalFilesChanged)}</div>
              <div className="text-lg font-semibold mb-1">Files Changed</div>
              <div className="text-sm text-muted-foreground">Across 3 platforms</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">{formatNumber(stats.totalLinesAdded)}</div>
              <div className="text-lg font-semibold mb-1">Lines Added</div>
              <div className="text-sm text-muted-foreground">Platform development</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">{formatReadingTime(stats.totalReadingTime)}</div>
              <div className="text-lg font-semibold mb-1">Reading Time</div>
              <div className="text-sm text-muted-foreground">Technical deep-dives</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}