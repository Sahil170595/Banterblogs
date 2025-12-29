import { Cpu, GitBranch, Radar } from 'lucide-react';
import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export const runtime = 'nodejs';

export default async function ChimeraPage() {
  const episodes = await getAllEpisodes();

  const chimeraEpisodes = episodes.filter((ep) => ep.slug.startsWith('chimera-episode-'));

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-12 p-8 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <span className="signal-pill">Chimera Engine</span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Multi-LLM Orchestration Core</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Chimera is the orchestration brain: routing requests across multiple LLMs, automating development workflows, and measuring every outcome with research-grade instrumentation.
            </p>
          </div>
          <div className="grid gap-3 sm:min-w-[220px]">
            <div className="signal-panel p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Episodes Logged</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{chimeraEpisodes.length}</div>
            </div>
            <div className="signal-panel p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pipeline Status</div>
              <div className="mt-2 text-sm font-semibold text-foreground">Active development</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <div className="signal-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Radar className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">Core Features</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />Multi-LLM orchestration</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />Automated content generation</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />Development workflow automation</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />Performance benchmarking and regression alerts</li>
          </ul>
        </div>

        <div className="signal-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Cpu className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">AI Model Fleet</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />Claude (Anthropic)</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />GPT-4 (OpenAI)</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />Gemini (Google)</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />Local models (Ollama)</li>
          </ul>
        </div>

        <div className="signal-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <GitBranch className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">Status</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Multi-LLM integration complete
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Automation pipeline in progress
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Report automation expanding
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-3">Development Episodes</h2>
        <p className="text-muted-foreground">{chimeraEpisodes.length} episodes covering Chimera Engine development.</p>
      </div>

      <EpisodeFilters episodes={chimeraEpisodes} />
    </div>
  );
}
