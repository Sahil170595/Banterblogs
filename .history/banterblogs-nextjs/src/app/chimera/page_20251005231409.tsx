import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export const runtime = 'nodejs';

export default async function ChimeraPage() {
  const episodes = await getAllEpisodes();
  
  // Filter for Chimera episodes (chimera-episode-XXX.md files)
  const chimeraEpisodes = episodes.filter(ep =>
    ep.slug.startsWith('chimera-episode-')
  );

  return (
    <div className="container py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Chimera Engine</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Multi-LLM orchestration platform. Automated episode generation and AI-powered development workflow.
        </p>
        
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">Core Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Multi-LLM orchestration</li>
              <li>• Automated content generation</li>
              <li>• Development workflow automation</li>
              <li>• Performance benchmarking</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">AI Models</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Claude (Anthropic)</li>
              <li>• GPT-4 (OpenAI)</li>
              <li>• Gemini (Google)</li>
              <li>• Local models (Ollama)</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">Status</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Multi-LLM integration complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Automation pipeline in progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Development Episodes</h2>
        <p className="text-muted-foreground mb-6">
          {chimeraEpisodes.length} episodes covering Chimera Engine development
        </p>
      </div>

      <EpisodeFilters episodes={chimeraEpisodes} />
    </div>
  );
}
