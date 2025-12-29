import { BarChart3, Bot, FileText, Globe, RefreshCw } from 'lucide-react';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber, formatReadingTime } from '@/lib/formatUtils';

export default async function AboutPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-24">
      <div className="max-w-6xl mx-auto space-y-24">
        <div className="signal-panel-strong p-8 md:p-12 text-center">
          <span className="signal-pill">Platform Architecture</span>
          <h1 className="display text-4xl md:text-5xl font-bold tracking-tight mt-4">The Banter Platform</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            Banterblogs documents the complete Banter Platform ecosystem: private repositories combining real-time AI overlay technology,
            production-grade ML infrastructure, and automated development documentation. Three integrated platforms creating the future of interactive streaming content.
          </p>
        </div>

        <section id="automation-loop" className="scroll-m-20">
          <div className="signal-panel p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <RefreshCw className="h-6 w-6" />
              </span>
              <h2 className="text-3xl font-bold">Banterblogs Automation Loop</h2>
            </div>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              The automation engine that ties everything together - from code commits to episode generation, creating a seamless development narrative powered by AI.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-6 rounded-2xl border border-border/60 bg-background/40">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Auto Episodes</h3>
                <p className="text-sm text-muted-foreground">Commits trigger episode generation</p>
              </div>
              <div className="text-center p-6 rounded-2xl border border-border/60 bg-background/40">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto mb-4 text-accent">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">AI Processing</h3>
                <p className="text-sm text-muted-foreground">Multi-LLM content generation</p>
              </div>
              <div className="text-center p-6 rounded-2xl border border-border/60 bg-background/40">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Live Updates</h3>
                <p className="text-sm text-muted-foreground">Real-time site revalidation</p>
              </div>
            </div>
          </div>
        </section>

        <div className="signal-panel p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <BarChart3 className="h-6 w-6" />
            </span>
            <h2 className="text-3xl font-bold">Development Metrics</h2>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center p-6 rounded-2xl border border-border/60 bg-background/40">
              <div className="text-4xl font-bold text-primary mb-2">{stats.totalEpisodes}</div>
              <div className="text-lg font-semibold mb-1">Episodes</div>
              <div className="text-sm text-muted-foreground">Automated from commits</div>
            </div>
            <div className="text-center p-6 rounded-2xl border border-border/60 bg-background/40">
              <div className="text-4xl font-bold text-primary mb-2">{formatNumber(stats.totalFilesChanged)}</div>
              <div className="text-lg font-semibold mb-1">Files Changed</div>
              <div className="text-sm text-muted-foreground">Across 3 platforms</div>
            </div>
            <div className="text-center p-6 rounded-2xl border border-border/60 bg-background/40">
              <div className="text-4xl font-bold text-primary mb-2">{formatNumber(stats.totalLinesAdded)}</div>
              <div className="text-lg font-semibold mb-1">Lines Added</div>
              <div className="text-sm text-muted-foreground">Platform development</div>
            </div>
            <div className="text-center p-6 rounded-2xl border border-border/60 bg-background/40">
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
