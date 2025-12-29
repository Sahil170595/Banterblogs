import { Activity, Brain, Cpu, Gauge, Lock, Mic2, Radar, Search, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

export default async function TechnologyPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-16">
      <div className="max-w-6xl mx-auto">
        <div className="signal-panel-strong mb-16 p-8 md:p-12 text-center">
          <span className="signal-pill">Technology Stack</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-4">Banter Platform Technology</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
            A deep dive into the systems powering Banterpacks overlay, Chimera Heart ML infrastructure, and the Banterblogs automation engine that ties every change together.
          </p>
        </div>

        <section id="overlay" className="mb-16 scroll-m-20">
          <h2 className="text-3xl font-bold mb-8 text-center">Real-Time Streaming Overlay</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="signal-panel p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary">
                  <Radar className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-semibold">Banterpacks Core</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-bold">B</span>
                  </div>
                  <div>
                    <div className="font-medium">Real-time Processing</div>
                    <div className="text-sm text-muted-foreground">Low-latency overlay generation</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-bold">P</span>
                  </div>
                  <div>
                    <div className="font-medium">Privacy-First</div>
                    <div className="text-sm text-muted-foreground">Local processing only</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="signal-panel p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center text-accent">
                  <Gauge className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-semibold">Technical Specs</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Latency</div>
                  <div className="text-2xl font-bold text-primary">&lt;100ms</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Supported Formats</div>
                  <div className="font-medium">RTMP, HLS, WebRTC</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Resolution</div>
                  <div className="font-medium">Up to 4K</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Platforms</div>
                  <div className="font-medium">OBS, Streamlabs</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="chimera-heart" className="mb-16 scroll-m-20">
          <h2 className="text-3xl font-bold mb-8 text-center">Chimera Heart ML Platform</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="signal-panel p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary">
                  <Cpu className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-semibold">Banterhearts Core</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-bold">N</span>
                  </div>
                  <div>
                    <div className="font-medium">Neural Architecture</div>
                    <div className="text-sm text-muted-foreground">Custom ML pipelines</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-bold">M</span>
                  </div>
                  <div>
                    <div className="font-medium">Model Orchestration</div>
                    <div className="text-sm text-muted-foreground">Multi-model inference</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="signal-panel p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center text-accent">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-semibold">AI Capabilities</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">RLHF Training</div>
                  <div className="font-medium">Continuous</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Inference Speed</div>
                  <div className="font-medium">&lt;50ms</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Context Window</div>
                  <div className="font-medium">128K tokens</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Fine-tuned Models</div>
                  <div className="font-medium">3+ variants</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Multi-LLM Architecture</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="signal-panel p-8">
              <h3 className="text-xl font-semibold mb-4">Provider Integration</h3>
              <div className="space-y-4">
                {[
                  { label: 'OpenAI GPT-4', detail: 'Primary provider for complex reasoning', marker: 'O', tone: 'bg-primary' },
                  { label: 'Anthropic Claude', detail: 'Fallback for safety and accuracy', marker: 'A', tone: 'bg-accent' },
                  { label: 'Google Gemini', detail: 'Multimodal capabilities', marker: 'G', tone: 'bg-emerald-500' },
                  { label: 'Ollama Local', detail: 'Offline-first processing', marker: 'L', tone: 'bg-orange-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${item.tone} flex items-center justify-center`}>
                      <span className="text-white text-sm font-bold">{item.marker}</span>
                    </div>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="signal-panel p-8">
              <h3 className="text-xl font-semibold mb-4">Intelligent Routing</h3>
              <div className="space-y-4">
                {[
                  { label: 'Load Balancing', detail: 'Round-robin with health checks' },
                  { label: 'Fallback Chain', detail: 'OpenAI to Claude to Google to Ollama' },
                  { label: 'Cost Optimization', detail: 'Smart provider selection' },
                  { label: 'Response Time', detail: 'Under 200ms target latency' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{row.label}</span>
                    <span className="text-xs text-muted-foreground">{row.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Real-Time Audio Processing</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: 'Speech-to-Text',
                icon: Mic2,
                tone: 'from-emerald-500 to-teal-600',
                points: ['Real-time transcription', 'Emotion detection', 'Speaker identification', 'Noise cancellation'],
              },
              {
                title: 'Text-to-Speech',
                icon: Waves,
                tone: 'from-primary to-accent',
                points: ['Multiple voice options', 'Emotion-aware synthesis', 'Real-time generation', 'Custom voice training'],
              },
              {
                title: 'Emotion Analysis',
                icon: Brain,
                tone: 'from-accent to-primary',
                points: ['Sentiment detection', 'Contextual responses', 'Personality adaptation', 'Mood-based filtering'],
              },
            ].map((card) => (
              <div key={card.title} className="signal-panel p-6 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${card.tone} flex items-center justify-center`}>
                  <card.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{card.title}</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  {card.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Performance Architecture</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="signal-panel p-8">
              <h3 className="text-xl font-semibold mb-6">Cache-First Design</h3>
              <div className="space-y-4">
                {[
                  { label: 'Service Worker Cache', detail: 'Primary cache with stale-while-revalidate' },
                  { label: 'IndexedDB Fallback', detail: 'Offline-capable persistent storage' },
                  { label: 'Memory Cache', detail: 'In-memory LRU with TTL management' },
                ].map((row, index) => (
                  <div key={row.label} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-white text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{row.label}</div>
                      <div className="text-sm text-muted-foreground">{row.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="signal-panel p-8">
              <h3 className="text-xl font-semibold mb-6">Performance Metrics</h3>
              <div className="space-y-4">
                {[
                  { label: 'Cache Hit Rate', value: '84.5%' },
                  { label: 'Average Latency', value: '<200ms' },
                  { label: 'Memory Usage', value: '<10MB' },
                  { label: 'Uptime', value: '99.9%' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{row.label}</span>
                    <span className="text-sm font-bold text-accent">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Chimera Heart Infrastructure</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="signal-panel p-8">
              <h3 className="text-xl font-semibold mb-4">Data and Feedback Pipeline</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><strong>Collection:</strong> Viewer reactions, overlay telemetry, and banter outcomes stream through ingest services with strict schema validation.</li>
                <li><strong>Privacy:</strong> Automatic PII scrubbing, anonymized identifiers, and audit logging for compliance.</li>
                <li><strong>Storage:</strong> Time-series and feature stores backed by Postgres, Redis, and cold archives for replay.</li>
              </ul>
            </div>
            <div className="signal-panel p-8">
              <h3 className="text-xl font-semibold mb-4">Model Lifecycle</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><strong>RLHF Loop:</strong> Daily training runs with evaluation gates before promotion.</li>
                <li><strong>Optimization:</strong> Quantization (INT8/FP8), custom kernels, TensorRT compilation, and memory optimization.</li>
                <li><strong>Deployment:</strong> Model registry APIs enabling rollout, shadow traffic, and instant rollback.</li>
              </ul>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-4 mt-8">
            {[
              { value: '<100ms', label: 'Inference Target' },
              { value: '24h', label: 'Training to Deploy Window' },
              { value: '4+', label: 'GPU Profiles Managed' },
              { value: '99.9%', label: 'Inference Uptime Goal' },
            ].map((metric) => (
              <div key={metric.label} className="signal-panel p-6 text-center">
                <div className="text-2xl font-bold text-primary mb-1">{metric.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{metric.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Banterblogs Automation Stack</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: 'Data Sources',
                icon: Activity,
                points: [
                  'Git commits, diffs, and patch notes from Banterpacks and Banterhearts',
                  'CI artifacts, test reports, and observability dashboards',
                  'Product docs and PRDs referenced inline',
                ],
              },
              {
                title: 'Narrative Engine',
                icon: Sparkles,
                points: [
                  'Character templates keep Claude, ChatGPT, Gemini, and Banterpacks voices aligned',
                  'Episode builder tags commits to themes (architecture, ML, ops)',
                  'Stats pipeline captures files changed, lines added, and reading time',
                ],
              },
              {
                title: 'Delivery',
                icon: Radar,
                points: [
                  'Episodes rendered as Markdown with interactive components',
                  'Search, tags, and onboarding provide guided entry points',
                  'RSS and sitemap generation keep distribution automated',
                ],
              },
            ].map((block) => (
              <div key={block.title} className="signal-panel p-6">
                <div className="flex items-center gap-3 mb-4 text-primary">
                  <block.icon className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">{block.title}</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {block.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Security and Quality</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'XSS Protection', detail: 'DOMPurify integration with CSP headers', icon: ShieldCheck, tone: 'bg-red-500' },
              { title: 'Rate Limiting', detail: '100 requests/minute with burst handling', icon: Lock, tone: 'bg-orange-500' },
              { title: 'Content Validation', detail: 'PG-13 filtering with quality rules', icon: Activity, tone: 'bg-emerald-500' },
              { title: 'HMAC Verification', detail: 'SHA-256 signature verification for shards', icon: Search, tone: 'bg-accent' },
            ].map((item) => (
              <div key={item.title} className="signal-panel p-6 text-center">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-lg ${item.tone} flex items-center justify-center`}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="signal-panel p-8">
          <h2 className="text-3xl font-bold mb-8 text-center">Development Journey</h2>
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
