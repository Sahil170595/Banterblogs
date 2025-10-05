'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Target, Rocket } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

const ROADMAP_PHASES = [
  {
    id: 'phase-1',
    title: 'Phase 1: Foundation',
    status: 'completed',
    icon: CheckCircle2,
    description: 'Core platform and streaming overlay development',
    features: [
      'Real-time streaming overlay architecture',
      'Privacy-first local processing',
      'Core Banterpacks platform',
      'Basic UI/UX implementation'
    ],
    year: '2024'
  },
  {
    id: 'phase-2', 
    title: 'Phase 2: Intelligence',
    status: 'in-progress',
    icon: Clock,
    description: 'AI capabilities and Banterhearts integration',
    features: [
      'Chimera Heart ML platform',
      'Multi-LLM orchestration (Claude, GPT, Gemini)',
      'Automated episode generation',
      'Advanced privacy controls'
    ],
    year: '2025'
  },
  {
    id: 'phase-3',
    title: 'Phase 3: Aut autonomy',
    status: 'planned',
    icon: Target,
    description: 'Full autonomy and ecosystem expansion',
    features: [
      'Fully autonomous operation',
      'Ecosystem integration',
      'Advanced AI capabilities',
      'Deployment optimization'
    ],
    year: '2025-2026'
  },
  {
    id: 'phase-4',
    title: 'Phase 4: Evolution',
    status: 'vision',
    icon: Rocket,
    description: 'Next-generation capabilities',
    features: [
      'Advanced AI consciousness',
      'Cross-platform integration',
      'Global deployment',
      'Innovation ecosystem'
    ],
    year: '2026+'
  }
];

export default function RoadmapPage() {
  return (
    <ErrorBoundary>
      <div className="container py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Jarvis Development{' '}
              <span className="gradient-text">Roadmap</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Follow our journey from real-time streaming overlay to fully autonomous 
              personal AI platform. Every phase builds upon the last.
            </p>
          </motion.div>

          {/* Roadmap Timeline */}
          <div className="space-y-12">
            {ROADMAP_PHASES.map((phase, index) => (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex items-start gap-6">
                  {/* Timeline Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      phase.status === 'completed' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : phase.status === 'in-progress'
                        ? 'bg-primary/20 text-primary'
                        : phase.status === 'planned'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      <phase.icon className="w-8 h-8" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium mb-3 ${
                        phase.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                          : phase.status === 'in-progress'
                          ? 'bg-primary/10 text-primary-primary ring-1 ring-primary/20'
                          : phase.status === 'planned'
                          ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20'
                      }">
                        {phase.year}
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-3">{phase.title}</h2>
                    <p className="text-muted-foreground mb-6">{phase.description}</p>

                    <div className="grid gap-3 md:grid-cols-2">
                      {phase.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Connector */}
                {index < ROADMAP_PHASES.length - 1 && (
                  <div className="absolute left-8 top-16 w-0.5 h-12 bg-border/50" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-16"
          >
            <div className="rounded-2xl border border-border/60 bg-card/70 p-8 shadow-xl">
              <h3 className="text-xl font-semibold mb-4">Ready to Follow the Journey?</h3>
              <p className="text-muted-foreground mb-6">
                Stay updated with every development milestone and breakthrough.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/episodes"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.assign('/episodes');
                  }}
                >
                  View Episodes
                </a>
                <a
                  href="https://github.com/Sahil170595/Banterblogs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent/10 transition-all duration-200"
                >
                  Follow on GitHub
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
