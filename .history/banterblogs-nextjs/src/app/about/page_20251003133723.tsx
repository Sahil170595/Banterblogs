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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight mb-12">Platform Architecture</h1>
        
        {/* Platform Overview */}
        <div className="bg-gradient-to-br from-blue-50/10 to-purple-50/10 rounded-2xl p-8 border border-border mb-12">
          <h2 className="text-3xl font-bold mb-6">The Banter Platform</h2>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Banterblogs documents the complete <strong>Banter Platform ecosystem</strong>: private repositories combining real-time AI overlay technology, 
            production-grade ML infrastructure, and automated development documentation. 
            Three integrated platforms creating the future of interactive streaming content.
          </p>
          
          {/* Architecture Diagram */}
          <div className="bg-muted/20 rounded-xl p-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Banterpacks */}
              <div className="space-y-4">
                <div className="bg-card/60 rounded-lg p-6 border border-border">
                  <h3 className="text-xl font-bold mb-3">Banterpacks</h3>
                  <h4 className="font-semibold mb-2">Gaming Content Platform</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Browser overlay with &lt;200ms render</li>
                    <li>• Registry service with rollout controls</li>
                    <li>• React Studio with pack creation wizard</li>
                    <li>• Multi-LLM provider ecosystem</li>
                    <li>• Google-tier observability stack</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/10 rounded-lg">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Real-time Processing</span>
                  </div>
                </div>
              </div>

              {/* Intelligence Pipeline */}
              <div className="space-y-4">
                <div className="bg-card/60 rounded-lg p-6 border border-border">
                  <h3 className="text-xl font-bold mb-3">Intelligence Pipeline</h3>
                  <h4 className="font-semibold mb-2">Platform Brain Layer</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Predictive analytics engine</li>
                    <li>• Auto-optimization algorithms</li>
                    <li>• Self-healing infrastructure</li>
                    <li>• Real-time monitoring stack</li>
                    <li>• API gateway & routing</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-500/10 rounded-lg">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">AI-Driven Management</span>
                  </div>
                </div>
              </div>

              {/* Banterhearts */}
              <div className="space-y-4">
                <div className="bg-card/60 rounded-lg p-6 border border-border">
                  <h3 className="text-xl font-bold mb-3">Banterhearts (Chimera Heart)</h3>
                  <h4 className="font-semibold mb-2">ML Optimization Platform</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Multi-service FastAPI architecture</li>
                    <li>• RLHF training pipelines</li>
                    <li>• GPU hyperoptimization suite</li>
                    <li>• Model registry & serving</li>
                    <li>• Enterprise data infrastructure</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500/10 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Continuous Learning</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Data Flow */}
            <div className="mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center justify-center space-x-8">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-sm">📊</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Data Collection</div>
                </div>
                <div className="text-blue-400">→</div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-sm">🧠</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Intelligence</div>
                </div>
                <div className="text-purple-400">→</div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-sm">⚡</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Optimization</div>
                </div>
                <div className="text-green-400">→</div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-sm">🎮</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Real-time Serving</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Components */}
        <div className="grid gap-8 md:grid-cols-3 mb-12">
          {/* Banterpacks Detail */}
          <div className="bg-card/50 rounded-xl p-6 border border-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🎮</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Banterpacks Platform</h3>
                <div className="text-sm text-muted-foreground">Private Gaming Content Infrastructure</div>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">Overlay System</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Browser-based OBS overlay with Service Worker caching</li>
                  <li>• IndexedDB offline capability with SWR patterns</li>
                  <li>• Provider Health panel (<code>?health=1</code>)</li>
                  <li>• Accessibility testing (<code>?axe=1</code>)</li>
                  <li>• TTS/STT plugins with multi-provider support</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">Registry Service + Rollout Controls</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>FastAPI registry</strong> serving pack manifests with versioning</li>
                  <li>• <strong>Stable/canary rollouts</strong>: <code>curl localhost:8898/packs/epic-wins/manifest?stage=canary</code></li>
                  <li>• <strong>A/B testing framework</strong> with traffic splitting (70/30, 90/10)</li>
                  <li>• <strong>Instant rollback</strong>: sub-second reversion on performance drops</li>
                  <li>• <strong>Prometheus metrics</strong>: download counts, latency, hit/miss rates</li>
                  <li>• <strong>ETag caching</strong> + <strong>CDN integration</strong> for global distribution</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">Studio Creation Wizard + Pack Marketplace</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>4-step creation wizard</strong>: Pack → Triggers → Content → Deploy</li>
                  <li>• <strong>Real-time preview</strong> with OBS browser source integration</li>
                  <li>• <strong>Pack marketplace</strong> with 15+ ready-made packs ("Epic Wins", "Fail Parade", "Chill Vibes")</li>
                  <li>• <strong>Live editing</strong>: changes reflect in overlay within 2 seconds</li>
                  <li>• <strong>Provider health panel</strong>: <code>?health=1</code> shows GPT-4✓ Claude✓ Gemini✓ Ollama✗</li>
                  <li>• <strong>Template library</strong>: game-specific packs for Valorant, League, Overwatch, etc.</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-500/10 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-300">Performance Targets</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-blue-500/20 rounded px-2 py-1">&lt;200ms overlay latency</div>
                <div className="bg-blue-500/20 rounded px-2 py-1">99.9% uptime SLA</div>
              </div>
            </div>
          </div>

          {/* Intelligence Pipeline Detail */}
          <div className="bg-card/50 rounded-xl p-6 border border-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span>🧠</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Intelligence Pipeline</h3>
                <div className="text-sm text-muted-foreground">Private Platform Brain Layer</div>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-semibold text-purple-300 mb-2">Predictive Analytics</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• User behavior forecasting (&gt;90% accuracy)</li>
                  <li>• Load prediction & resource optimization</li>
                  <li>• Model performance degradation detection</li>
                  <li>• Proactive resource allocation</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-purple-300 mb-2">Auto-Optimization</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Dynamic LLM model switching</li>
                  <li>• Predictive scaling based on forecasts</li>
                  <li>• AI-driven content optimization</li>
                  <li>• Continuous performance tuning</li>
                </ul>
          </div>

              <div>
                <h4 className="font-semibold text-purple-300 mb-2">Self-Healing</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Automatic issue detection (&lt;1min MTTR)</li>
                  <li>• Auto-recovery for common failures</li>
                  <li>• Intelligent fallback mechanisms</li>
                  <li>• Proactive maintenance prevention</li>
                </ul>
              </div>
              </div>
            
            <div className="bg-purple-500/10 rounded-lg p-3">
              <div className="text-sm font-medium text-purple-300">Performance Targets</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-purple-500/20 rounded px-2 py-1">&lt;50ms response time</div>
                <div className="bg-purple-500/20 rounded px-2 py-1">99.99% availability</div>
              </div>
            </div>
          </div>
          
          {/* Banterhearts Detail */}
          <div className="bg-card/50 rounded-xl p-6 border border-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <span>⚡</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Banterhearts Platform</h3>
                <div className="text-sm text-muted-foreground">Private ML Optimization Core</div>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-semibold text-green-300 mb-2">Multi-Service Architecture</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Inference Service (Port 8001)</li>
                  <li>• Data Ingestion (Port 8002)</li>
                  <li>• Training Service (Port 8003)</li>
                  <li>• PostgreSQL + Redis + MinIO</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-green-300 mb-2">ML Hyperoptimization</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Advanced quantization (INT8/FP8/QAT)</li>
                  <li>• Custom CUDA kernel optimization</li>
                  <li>• TensorRT/ONNX compilation</li>
                  <li>• Attention mechanisms (MQA/GQA)</li>
              </ul>
            </div>
              
              <div>
                <h4 className="font-semibold text-green-300 mb-2">RLHF Pipeline</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Complete RLHF training system</li>
                  <li>• Model registry & versioning</li>
                  <li>• A/B testing framework</li>
                  <li>• Continuous learning deployment</li>
              </ul>
            </div>
          </div>

            <div className="bg-green-500/10 rounded-lg p-3">
              <div className="text-sm font-medium text-green-300">Performance Targets</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-green-500/20 rounded px-2 py-1">&lt;100ms inference</div>
                <div className="bg-green-500/20 rounded px-2 py-1">24hr training cycle</div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Architecture */}
        <div className="bg-gradient-to-br from-gradient-black to-muted/20 rounded-2xl p-8 border border-border mb-12">
          <h2 className="text-3xl font-bold mb-8">Platform Integration</h2>
          
          <div className="grid gap-8 md:grid-cols-2">
            {/* Data Flow */}
            <div>
              <h3 className="text-xl font-bold mb-4">Concrete Integration Examples</h3>
              <div className="space-y-4">
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="font-semibold mb-2">Real-Time Feedback Loop</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    <strong>Step 1:</strong> Overlay fires "Nice try!" during missed shot<br/>
                    <strong>Step 2:</strong> Intelligence Pipeline logs: <code>{"{event: 'miss', pack: 'fail-parade', latency: 187ms}"}</code><br/>
                    <strong>Step 3:</strong> Banterhearts ingests → retrains model → serves updated trigger<br/>
                    <strong>Result:</strong> Next miss gets smarter response: "Almost had them!"
                  </div>
                </div>
                
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="font-semibold mb-2">Registry → Overlay Deployment</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    <strong>Studio:</strong> Creator publishes "Epic Wins" pack via 4-step wizard<br/>
                    <strong>Registry:</strong> <code>curl localhost:8898/packs/epic-wins/manifest</code> returns JSON<br/>
                    <strong>Overlay:</strong> Downloads pack + triggers → renders in 2s<br/>
                    <strong>Live:</strong> Streamer sees reactions in real-time during gameplay
                  </div>
                </div>
                
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="font-semibold mb-2">ML Training Pipeline</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    <strong>Collection:</strong> Banterhearts receives viewer reactions (👍👎🙌)<br/>
                    <strong>Training:</strong> RLHF runs overnight: <code>python train_rlhf.py --data-path=/feedback</code><br/>
                    <strong>Evaluation:</strong> Model validates: latency &lt;100ms, response quality &gt;85%<br/>
                    <strong>Deploy:</strong> New triggers push to overlay within 24 hours if metrics improve
                  </div>
                </div>
              </div>
            </div>
            
            {/* API Contracts */}
            <div>
              <h3 className="text-xl font-bold mb-4">Try It: Real API Commands</h3>
              <div className="space-y-4">
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="font-semibold mb-2">Banterpacks Registry</div>
                  <div className="bg-black/50 rounded p-3 font-mono text-sm text-green-400">
{`# Get pack manifest
curl localhost:8898/packs/epic-wins/manifest

# Download pack assets
curl localhost:8898/packs/epic-wins/download -o epic-wins.zip

# Check provider health panel
curl localhost:8898/health/providers`}
                  </div>
                </div>
                
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="font-semibold mb-2">Banterhearts ML Pipeline</div>
                  <div className="bg-black/50 rounded p-3 font-mono text-sm text-green-400">
{`# Send feedback event
curl -X POST localhost:8002/api/v1/events \\
  -H "Content-Type: application/json" \\
  -d '{"event":"clutch","appreciation":0.92}'

# Get AI inference  
curl -X POST localhost:8001/api/v1/inference \\
  -H "Content-Type: application/json" \\
  -d '{"trigger":"epic_win","game":"valorant"}'`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Observability Stack */}
        <div className="bg-card/50 rounded-xl p-8 border border-border mb-12">
          <h2 className="text-3xl font-bold mb-8">Enterprise Observability</h2>
          
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="font-semibold mb-2">Prometheus</h4>
              <p className="text-sm text-muted-foreground">Metrics collection and storage</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <h4 className="font-semibold mb-2">Grafana</h4>
              <p className="text-sm text-muted-foreground">Visualization dashboards</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
              <h4 className="font-semibold mb-2">Jaeger</h4>
              <p className="text-sm text-muted-foreground">Distributed tracing</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">📋</span>
            </div>
              <h4 className="font-semibold mb-2">ELK Stack</h4>
              <p className="text-sm text-muted-foreground">Log aggregation</p>
            </div>
            </div>
          </div>

        {/* Development Stats */}
        <div className="border-t border-border pt-8">
          <h2 className="text-3xl font-bold mb-8">Development Metrics</h2>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Banterblogs automatically documents every commit, metric, and decision across the platform ecosystem. 
            Each episode is generated from real development data with AI-powered narrative that follows 
            the journey from code to production.
          </p>
          
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 mb-8">
            <div className="text-center p-6 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">{stats.totalEpisodes}</div>
              <div className="text-lg font-semibold mb-1">Episodes</div>
              <div className="text-sm text-muted-foreground">Automated from commits</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">{stats.totalFilesChanged.toLocaleString()}</div>
              <div className="text-lg font-semibold mb-1">Files Changed</div>
              <div className="text-sm text-muted-foreground">Across 3 platforms</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">{stats.totalLinesAdded.toLocaleString()}</div>
              <div className="text-lg font-semibold mb-1">Lines Added</div>
              <div className="text-sm text-muted-foreground">Platform development</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/50">
              <div className="text-4xl font-bold text-primary mb-2">{formatReadingTime(stats.totalReadingTime)}</div>
              <div className="text-lg font-semibold mb-1">Reading Time</div>
              <div className="text-sm text-muted-foreground">Technical deep-dives</div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <h3 className="text-xl font-bold mb-3">Automated Documentation</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Real-time commit parsing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>CI/CD metrics integration</span>
                </li>
            <li className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>AI-powered narrative generation</span>
            </li>
            <li className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Cross-platform decision tracking</span>
                </li>
              </ul>
            </div>
            
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <h3 className="text-xl font-bold mb-3">Technical Depth</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <span className="text-blue-400">📊</span>
                  <span>Performance metrics integration</span>
            </li>
            <li className="flex items-center space-x-2">
                  <span className="text-blue-400">📊</span>
                  <span>Observability data correlation</span>
            </li>
            <li className="flex items-center space-x-2">
                  <span className="text-blue-400">📊</span>
                  <span>Architecture decision tracking</span>
            </li>
            <li className="flex items-center space-x-2">
                  <span className="text-blue-400">📊</span>
                  <span>Integration flow documentation</span>
            </li>
          </ul>
            </div>
            
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <h3 className="text-xl font-bold mb-3">AI Storytelling</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <span className="text-purple-400">🎭</span>
                  <span>Four distinct AI personalities</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-purple-400">🎭</span>
                  <span>Character-consistent narratives</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-purple-400">🎭</span>
                  <span>Technical debate simulation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-purple-400">🎭</span>
                  <span>Decision rationale explanation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}