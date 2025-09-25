import Link from 'next/link';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { EpisodeCard } from '@/components/EpisodeCard';
import { Hero } from '@/components/Hero';
import { OnboardingWrapper } from '@/components/OnboardingWrapper';

export default async function HomePage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);
  const featuredEpisodes = episodes.slice(0, 6);

  return (
    <div className="flex flex-col">
      <OnboardingWrapper />
      <Hero stats={stats} />

      <section className="container py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Latest Episodes</h2>
          <Link
            href="/episodes"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all episodes →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredEpisodes.map((episode, index) => (
            <EpisodeCard key={episode.id} episode={episode} index={index} />
          ))}
        </div>
      </section>

      <section className="container py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            The Epic Saga of Building Banterpacks
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Watch as four AI personalities (Claude, ChatGPT, Gemini, and Banterpacks)
            discuss the daily development journey, technical decisions, and the wild
            ride of building something amazing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/episodes"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Reading
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Technology Showcase */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
          <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <h3 className="text-lg font-semibold">Multi-LLM Architecture</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Integrated OpenAI, Anthropic, Google, and Ollama providers with intelligent fallback and load balancing.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">OpenAI</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Anthropic</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Google</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Ollama</span>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                <span className="text-lg">🎤</span>
              </div>
              <h3 className="text-lg font-semibold">Real-Time Audio</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Speech-to-Text with emotion detection and Text-to-Speech with multiple voice options for live streaming.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">STT</span>
              <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">TTS</span>
              <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">Emotion</span>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                <span className="text-lg">⚡</span>
              </div>
              <h3 className="text-lg font-semibold">Sub-200ms Latency</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Cache-first architecture with intelligent prefetching and offline capabilities for real-time performance.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Cache</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Prefetch</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Offline</span>
            </div>
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-8 border border-border">
          <h3 className="text-2xl font-bold mb-6 text-center">Banterpacks Architecture</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <h4 className="font-semibold mb-2">Overlay System</h4>
              <p className="text-sm text-muted-foreground">Real-time banter display with modular JavaScript architecture</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                <span className="text-2xl">🗄️</span>
              </div>
              <h4 className="font-semibold mb-2">Registry Service</h4>
              <p className="text-sm text-muted-foreground">FastAPI-based centralized pack management with rollout control</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <span className="text-2xl">🎨</span>
              </div>
              <h4 className="font-semibold mb-2">Studio Frontend</h4>
              <p className="text-sm text-muted-foreground">React-based pack editor with AI-powered content generation</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
              <h4 className="font-semibold mb-2">Authoring Tools</h4>
              <p className="text-sm text-muted-foreground">CLI tools for content generation with multi-provider support</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
