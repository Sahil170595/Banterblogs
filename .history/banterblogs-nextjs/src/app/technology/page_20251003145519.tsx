import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber, formatReadingTime } from '@/lib/formatUtils';

export default async function TechnologyPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Banter Platform Technology</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A deep dive into the technology that powers the Banter Platform: Banterpacks overlay, Banterhearts (Chimera Heart) ML infrastructure,
            and the Banterblogs automation engine that ties every change together.
          </p>
        </div>

        {/* Multi-LLM Architecture */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">🤖 Multi-LLM Architecture</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4">Provider Integration</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">O</span>
                  </div>
                  <div>
                    <div className="font-medium">OpenAI GPT-4</div>
                    <div className="text-sm text-muted-foreground">Primary provider for complex reasoning</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">A</span>
                  </div>
                  <div>
                    <div className="font-medium">Anthropic Claude</div>
                    <div className="text-sm text-muted-foreground">Fallback for safety and accuracy</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">G</span>
                  </div>
                  <div>
                    <div className="font-medium">Google Gemini</div>
                    <div className="text-sm text-muted-foreground">Multimodal capabilities</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">O</span>
                  </div>
                  <div>
                    <div className="font-medium">Ollama Local</div>
                    <div className="text-sm text-muted-foreground">Offline-first processing</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4">Intelligent Routing</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Load Balancing</span>
                  <span className="text-xs text-muted-foreground">Round-robin with health checks</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Fallback Chain</span>
                  <span className="text-xs text-muted-foreground">OpenAI → Claude → Google → Ollama</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Cost Optimization</span>
                  <span className="text-xs text-muted-foreground">Smart provider selection</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Response Time</span>
                  <span className="text-xs text-muted-foreground">&lt;200ms target latency</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real-Time Audio Processing */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">🎤 Real-Time Audio Processing</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                <span className="text-2xl">🎙️</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">Speech-to-Text</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Real-time transcription</li>
                <li>• Emotion detection</li>
                <li>• Speaker identification</li>
                <li>• Noise cancellation</li>
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <span className="text-2xl">🔊</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">Text-to-Speech</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Multiple voice options</li>
                <li>• Emotion-aware synthesis</li>
                <li>• Real-time generation</li>
                <li>• Custom voice training</li>
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">Emotion Analysis</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Sentiment detection</li>
                <li>• Contextual responses</li>
                <li>• Personality adaptation</li>
                <li>• Mood-based filtering</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Performance Architecture */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">⚡ Performance Architecture</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-6">Cache-First Design</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-sm">1</span>
                  </div>
                  <div>
                    <div className="font-medium">Service Worker Cache</div>
                    <div className="text-sm text-muted-foreground">Primary cache with stale-while-revalidate</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <span className="text-white text-sm">2</span>
                  </div>
                  <div>
                    <div className="font-medium">IndexedDB Fallback</div>
                    <div className="text-sm text-muted-foreground">Offline-capable persistent storage</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-sm">3</span>
                  </div>
                  <div>
                    <div className="font-medium">Memory Cache</div>
                    <div className="text-sm text-muted-foreground">In-memory LRU with TTL management</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-6">Performance Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Cache Hit Rate</span>
                  <span className="text-sm font-bold text-green-400">84.5%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Average Latency</span>
                  <span className="text-sm font-bold text-blue-400">&lt;200ms</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm font-bold text-purple-400">&lt;10MB</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Uptime</span>
                  <span className="text-sm font-bold text-green-400">99.9%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chimera Heart Infrastructure */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Chimera Heart (Banterhearts) Infrastructure</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4">Data & Feedback Pipeline</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><strong>Collection:</strong> Viewer reactions, overlay telemetry, and banter outcomes stream through ingest services with strict schema validation.</li>
                <li><strong>Privacy:</strong> Automatic PII scrubbing, anonymized identifiers, and audit logging for compliance.</li>
                <li><strong>Storage:</strong> Time-series and feature stores backed by Postgres, Redis, and cold archives for replay.</li>
              </ul>
            </div>
            <div className="p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4">Model Lifecycle</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><strong>RLHF Loop:</strong> Daily training runs with evaluation gates before promotion.</li>
                <li><strong>Optimization:</strong> Quantization (INT8/FP8), custom kernels, TensorRT compilation, and memory optimization.</li>
                <li><strong>Deployment:</strong> Model registry APIs enabling rollout, shadow traffic, and instant rollback.</li>
              </ul>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-4 mt-8">
            <div className="p-6 rounded-xl border border-border bg-card/50 text-center">
              <div className="text-2xl font-bold text-primary mb-1">&lt;100ms</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Inference Target</div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/50 text-center">
              <div className="text-2xl font-bold text-primary mb-1">24h</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Training to Deploy Window</div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/50 text-center">
              <div className="text-2xl font-bold text-primary mb-1">4+</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">GPU Profiles Managed</div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/50 text-center">
              <div className="text-2xl font-bold text-primary mb-1">99.9%</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Inference Uptime Goal</div>
            </div>
          </div>
        </section>

        {/* Banterblogs Automation */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Banterblogs Automation Stack</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-3">Data Sources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Git commits, diffs, and patch notes from Banterpacks and Banterhearts</li>
                <li>CI artifacts, test reports, and observability dashboards</li>
                <li>Product docs and PRDs referenced inline</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-3">Narrative Engine</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Character templates keep Claude/ChatGPT/Gemini/Banterpacks voices aligned</li>
                <li>Episode builder tags commits to themes (architecture, ML, ops)</li>
                <li>Stats pipeline captures files changed, lines added, and reading time</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-3">Delivery</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Episodes rendered as Markdown with interactive components</li>
                <li>Search, tags, and onboarding provide guided entry points</li>
                <li>RSS and sitemap generation keep distribution automated</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security & Quality */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">🔒 Security & Quality</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-red-500 flex items-center justify-center">
                <span className="text-white text-lg">🛡️</span>
              </div>
              <h3 className="font-semibold mb-2">XSS Protection</h3>
              <p className="text-sm text-muted-foreground">DOMPurify integration with CSP headers</p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-orange-500 flex items-center justify-center">
                <span className="text-white text-lg">🔐</span>
              </div>
              <h3 className="font-semibold mb-2">Rate Limiting</h3>
              <p className="text-sm text-muted-foreground">100 requests/minute with burst handling</p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-green-500 flex items-center justify-center">
                <span className="text-white text-lg">✅</span>
              </div>
              <h3 className="font-semibold mb-2">Content Validation</h3>
              <p className="text-sm text-muted-foreground">PG-13 filtering with quality rules</p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-blue-500 flex items-center justify-center">
                <span className="text-white text-lg">🔍</span>
              </div>
              <h3 className="font-semibold mb-2">HMAC Verification</h3>
              <p className="text-sm text-muted-foreground">SHA-256 signature verification for shards</p>
            </div>
          </div>
        </section>

        {/* Development Stats */}
        <section className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-8 border border-border">
          <h2 className="text-3xl font-bold mb-8 text-center">📊 Development Journey</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{stats.totalEpisodes}</div>
              <div className="text-sm text-muted-foreground">Episodes Documented</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{formatNumber(stats.totalFilesChanged)}</div>
              <div className="text-sm text-muted-foreground">Files Changed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{formatNumber(stats.totalLinesAdded)}</div>
              <div className="text-sm text-muted-foreground">Lines of Code</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{stats.avgComplexity}</div>
              <div className="text-sm text-muted-foreground">Avg Complexity</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
