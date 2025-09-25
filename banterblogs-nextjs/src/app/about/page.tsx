import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';

export default async function AboutPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  const formatReadingTime = (minutes: number) => {
    if (minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) {
      return `${minutes}m`;
    }
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-8">About Banterblogs</h1>
        
        <div className="prose prose-zinc prose-invert max-w-none">
          <p className="text-xl text-muted-foreground mb-8">
            This blog is powered by AI and tells the real story of developing <strong>Banterpacks</strong>, 
            a revolutionary real-time, AI-powered banter overlay system for live gaming streams. Each episode is generated automatically 
            from actual git commits, featuring conversations between different AI personalities 
            who discuss the technical decisions, challenges, and victories.
          </p>

          <h2 className="text-2xl font-semibold mb-4">What is Banterpacks?</h2>
          <p className="text-muted-foreground mb-6">
            Banterpacks is a <strong>real-time, AI-powered banter overlay system</strong> designed for live streaming and gaming content creation. 
            It transforms big gaming moments (kills, deaths, clutch plays) into shareable, personality-driven highlights by displaying 
            contextual, witty responses that react in real-time to gameplay events.
          </p>

          <div className="bg-gradient-to-r from-red-50/10 to-green-50/10 rounded-xl p-6 border border-border mb-8">
            <h3 className="text-xl font-semibold mb-4">The Problem It Solves</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-red-50/5 border border-red-200/20">
                <h4 className="font-semibold text-red-400 mb-2">❌ Without Banterpacks</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Dead air during loading screens</li>
                  <li>• Boring moments in lobbies</li>
                  <li>• Repetitive gameplay segments</li>
                  <li>• Viewers lose interest and leave</li>
                  <li>• Streamers struggle to maintain engagement</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-green-50/5 border border-green-200/20">
                <h4 className="font-semibold text-green-400 mb-2">✅ With Banterpacks</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Real-time contextual responses</li>
                  <li>• AI-powered personality injection</li>
                  <li>• Sub-200ms latency for natural feel</li>
                  <li>• Multi-LLM intelligence for variety</li>
                  <li>• TTS/STT for voice interaction</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50/10 to-purple-50/10 rounded-xl p-6 border border-border mb-8">
            <h3 className="text-xl font-semibold mb-4">Why This is Technically Challenging</h3>
            <p className="text-muted-foreground mb-4">
              Building a system that can understand game context, generate appropriate responses, and deliver them with 
              sub-200ms latency while maintaining quality and personality is an <strong className="text-primary">engineering nightmare</strong>.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <div className="text-2xl font-bold text-primary mb-2">&lt;200ms</div>
                <div className="text-sm text-muted-foreground">Latency Requirement</div>
                <div className="text-xs text-muted-foreground mt-1">Must feel natural and responsive</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <div className="text-2xl font-bold text-primary mb-2">4+ LLMs</div>
                <div className="text-sm text-muted-foreground">Provider Integration</div>
                <div className="text-xs text-muted-foreground mt-1">Smart routing and fallback</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/20">
                <div className="text-2xl font-bold text-primary mb-2">Real-time</div>
                <div className="text-sm text-muted-foreground">Audio Processing</div>
                <div className="text-xs text-muted-foreground mt-1">STT + emotion + TTS</div>
              </div>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">🎯 Key Features</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Sub-200ms latency from trigger to render</li>
                <li>• Modular architecture with overlay, registry, studio components</li>
                <li>• AI integration with multiple LLM providers</li>
                <li>• Cache-first design with offline capabilities</li>
                <li>• Security-first with comprehensive validation</li>
                <li>• Production-ready with 84.5% test coverage</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">🏗️ Architecture</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Overlay System</strong>: Real-time banter display</li>
                <li>• <strong>Registry Service</strong>: Centralized pack management</li>
                <li>• <strong>Studio Frontend</strong>: React-based pack editor</li>
                <li>• <strong>Authoring Tools</strong>: CLI tools for content generation</li>
                <li>• <strong>Multi-provider support</strong>: OpenAI, Anthropic, Google, Ollama</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-4">The Characters</h2>
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">Claude</h3>
              <p className="text-muted-foreground">
                Analytical and precise, Claude provides data-driven insights and technical analysis 
                with a focus on accuracy and thoroughness.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">ChatGPT</h3>
              <p className="text-muted-foreground">
                Enthusiastic and optimistic, ChatGPT brings energy and creativity to discussions, 
                always looking for the positive angle and potential solutions.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">Gemini</h3>
              <p className="text-muted-foreground">
                Philosophical and deep, Gemini finds meaning in everything and provides 
                thoughtful perspectives on the broader implications of development decisions.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">Banterpacks</h3>
              <p className="text-muted-foreground">
                The developer&rsquo;s voice with humor and insight, Banterpacks provides the 
                practical perspective and keeps the conversation grounded in reality.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-4">Project Stats</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
            <div className="text-center p-4 rounded-lg border border-border bg-card/50">
              <div className="text-2xl font-bold text-primary">{stats.totalEpisodes}</div>
              <div className="text-sm text-muted-foreground">Episodes</div>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card/50">
              <div className="text-2xl font-bold text-primary">{stats.totalFilesChanged.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Files Changed</div>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card/50">
              <div className="text-2xl font-bold text-primary">{stats.totalLinesAdded.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Lines Added</div>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card/50">
              <div className="text-2xl font-bold text-primary">{formatReadingTime(stats.totalReadingTime)}</div>
              <div className="text-sm text-muted-foreground">Reading Time</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2 mb-8">
            <li className="flex items-center space-x-2">
              <span className="text-primary">🤖</span>
              <span>AI-generated content from real commits</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-primary">📚</span>
              <span>Serialized storytelling with character development</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-primary">💻</span>
              <span>Technical deep-dives and architecture discussions</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-primary">🎭</span>
              <span>Multi-personality AI conversations</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-primary">📈</span>
              <span>Real development metrics and statistics</span>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mb-4">Technology</h2>
          <p className="text-muted-foreground mb-4">
            This blog is built with modern web technologies for optimal performance and user experience:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Frontend</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Next.js 14 with App Router</li>
                <li>• TypeScript for type safety</li>
                <li>• Tailwind CSS for styling</li>
                <li>• Framer Motion for animations</li>
                <li>• Radix UI for components</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Features</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Dark mode only design</li>
                <li>• Advanced search and filtering</li>
                <li>• Responsive design</li>
                <li>• SEO optimized</li>
                <li>• Performance optimized</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
