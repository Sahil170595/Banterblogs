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

      {/* The Problem Section */}
      <section className="container py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-6">
            The Problem Banterpacks Solves
          </h2>
          <div className="grid gap-8 md:grid-cols-2 mb-12">
            <div className="p-8 rounded-xl border border-red-200 bg-red-50/10 backdrop-blur-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500 flex items-center justify-center">
                <span className="text-2xl">😴</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-red-400">Dead Air in Gaming Streams</h3>
              <ul className="text-left space-y-2 text-muted-foreground list-disc list-inside">
                <li>Loading screens with nothing happening</li>
                <li>Waiting in lobbies or queues</li>
                <li>Repetitive gameplay moments</li>
                <li>Viewers lose interest and leave</li>
                <li>Streamers struggle to maintain engagement</li>
              </ul>
            </div>
            
            <div className="p-8 rounded-xl border border-green-200 bg-green-50/10 backdrop-blur-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-green-500 flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-green-400">With Banterpacks</h3>
              <ul className="text-left space-y-2 text-muted-foreground list-disc list-inside">
                <li>Fills dead air with smart banter</li>
                <li>Turns boring lobbies into entertaining moments</li>
                <li>Breaks repetition with variety and surprise</li>
                <li>Keeps viewers engaged and watching longer</li>
                <li>Helps streamers maintain energy effortlessly</li>
              </ul>
            </div>
          </div>
          
          {/* Tech that makes it possible */}
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-6 border border-blue-200/20 backdrop-blur-sm">
            <h4 className="text-lg font-semibold mb-3 text-blue-400">Tech that makes it possible</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">⚡</span>
                <span>Sub-200ms latency</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-purple-400">🧠</span>
                <span>Multi-LLM variety</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-400">🎤</span>
                <span>TTS/STT voice interaction</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-8 border border-border">
            <h3 className="text-2xl font-bold mb-4">Why This is Technically Challenging</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Building a real-time AI system that can understand game context, generate appropriate responses, 
              and deliver them with sub-200ms latency while maintaining quality and personality is an 
              <strong className="text-primary"> engineering nightmare</strong>.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">&lt;200ms</div>
                <div className="text-sm text-muted-foreground">Latency Requirement</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">4+ LLMs</div>
                <div className="text-sm text-muted-foreground">Provider Integration</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">Real-time</div>
                <div className="text-sm text-muted-foreground">Audio Processing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

        {/* Technical Flow Explanation */}
        <div className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-8 border border-border mb-12">
          <h3 className="text-3xl font-bold mb-8 text-center">How Banterpacks Actually Works</h3>
          
          {/* Real-Time Pipeline */}
          <div className="mb-12">
            <h4 className="text-xl font-semibold mb-6 text-center">Real-Time Processing Pipeline</h4>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-lg">🎮</span>
                </div>
                <h5 className="font-medium mb-2">Game Event</h5>
                <p className="text-xs text-muted-foreground">Kill, death, or trigger detected</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-green-500 flex items-center justify-center">
                  <span className="text-white text-lg">🎤</span>
                </div>
                <h5 className="font-medium mb-2">Audio Capture</h5>
                <p className="text-xs text-muted-foreground">STT + emotion analysis</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-lg">🧠</span>
                </div>
                <h5 className="font-medium mb-2">LLM Selection</h5>
                <p className="text-xs text-muted-foreground">Smart provider routing</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-orange-500 flex items-center justify-center">
                  <span className="text-white text-lg">💬</span>
                </div>
                <h5 className="font-medium mb-2">Response Gen</h5>
                <p className="text-xs text-muted-foreground">Contextual banter creation</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-red-500 flex items-center justify-center">
                  <span className="text-white text-lg">📺</span>
                </div>
                <h5 className="font-medium mb-2">Overlay Display</h5>
                <p className="text-xs text-muted-foreground">TTS + visual overlay</p>
              </div>
            </div>
            <div className="text-center mt-4">
              <span className="text-sm font-bold text-primary">Total Time: &lt;200ms</span>
            </div>
          </div>

          {/* Multi-LLM Intelligence */}
          <div className="mb-12">
            <h4 className="text-xl font-semibold mb-6 text-center">Multi-LLM Intelligence System</h4>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-6 rounded-lg border border-border bg-card/50">
                <h5 className="font-semibold mb-4">Smart Provider Selection</h5>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">O</span>
                    </div>
                    <div>
                      <div className="font-medium">OpenAI GPT-4</div>
                      <div className="text-sm text-muted-foreground">Complex reasoning, creative responses</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <div>
                      <div className="font-medium">Anthropic Claude</div>
                      <div className="text-sm text-muted-foreground">Safety-critical, accurate analysis</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">G</span>
                    </div>
                    <div>
                      <div className="font-medium">Google Gemini</div>
                      <div className="text-sm text-muted-foreground">Multimodal, vision/audio processing</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">L</span>
                    </div>
                    <div>
                      <div className="font-medium">Ollama Local</div>
                      <div className="text-sm text-muted-foreground">Fast responses, offline capability</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 rounded-lg border border-border bg-card/50">
                <h5 className="font-semibold mb-4">Decision Logic</h5>
                <div className="space-y-3">
                  <div className="p-3 rounded bg-muted/50">
                    <div className="font-medium text-sm">Content Complexity</div>
                    <div className="text-xs text-muted-foreground">Simple → Ollama, Complex → Claude</div>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <div className="font-medium text-sm">Response Time</div>
                    <div className="text-xs text-muted-foreground">Critical → Local, Standard → Cloud</div>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <div className="font-medium text-sm">Content Type</div>
                    <div className="text-xs text-muted-foreground">Creative → ChatGPT, Technical → Claude</div>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <div className="font-medium text-sm">Fallback Chain</div>
                    <div className="text-xs text-muted-foreground">Primary → Secondary → Local → Cache</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture Overview */}
          <div>
            <h4 className="text-xl font-semibold mb-6 text-center">System Architecture</h4>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl">🎮</span>
                </div>
                <h5 className="font-semibold mb-2">Overlay System</h5>
                <p className="text-sm text-muted-foreground">Real-time banter display with modular JavaScript architecture</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <span className="text-2xl">🗄️</span>
                </div>
                <h5 className="font-semibold mb-2">Registry Service</h5>
                <p className="text-sm text-muted-foreground">FastAPI-based centralized pack management with rollout control</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <h5 className="font-semibold mb-2">Studio Frontend</h5>
                <p className="text-sm text-muted-foreground">React-based pack editor with AI-powered content generation</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <span className="text-2xl">⚙️</span>
                </div>
                <h5 className="font-semibold mb-2">Authoring Tools</h5>
                <p className="text-sm text-muted-foreground">CLI tools for content generation with multi-provider support</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
