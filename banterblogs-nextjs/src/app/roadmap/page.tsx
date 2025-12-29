'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Target, Rocket } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

type RoadmapStatus = 'completed' | 'in-progress' | 'planned' | 'vision';

const ROADMAP_PHASES: Array<{
  id: string;
  title: string;
  status: RoadmapStatus;
  icon: typeof CheckCircle2;
  description: string;
  features: string[];
  year: string;
}> = [
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
      'Baseline UI and UX systems',
    ],
    year: '2024',
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
      'Advanced privacy controls',
    ],
    year: '2025',
  },
  {
    id: 'phase-3',
    title: 'Phase 3: Autonomy',
    status: 'planned',
    icon: Target,
    description: 'Full autonomy and ecosystem expansion',
    features: [
      'Fully autonomous operation',
      'Ecosystem integration',
      'Advanced AI capabilities',
      'Deployment optimization',
    ],
    year: '2025-2026',
  },
  {
    id: 'phase-4',
    title: 'Phase 4: Evolution',
    status: 'vision',
    icon: Rocket,
    description: 'Next-generation capabilities',
    features: [
      'Advanced AI cognition',
      'Cross-platform integration',
      'Global deployment',
      'Innovation ecosystem',
    ],
    year: '2026+',
  },
];

const STATUS_STYLES: Record<RoadmapStatus, { badge: string; icon: string }> = {
  completed: {
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    icon: 'bg-emerald-500/10 text-emerald-300',
  },
  'in-progress': {
    badge: 'border-primary/40 bg-primary/10 text-primary',
    icon: 'bg-primary/10 text-primary',
  },
  planned: {
    badge: 'border-accent/40 bg-accent/10 text-accent',
    icon: 'bg-accent/10 text-accent',
  },
  vision: {
    badge: 'border-border/60 bg-background/60 text-muted-foreground',
    icon: 'bg-background/60 text-muted-foreground',
  },
};

export default function RoadmapPage() {
  return (
    <ErrorBoundary>
      <div className="container py-16">
        <div className="signal-panel-strong mb-12 p-8 md:p-10">
          <span className="signal-pill">Chimera Roadmap</span>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
            Development Trajectory
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Follow the leap from real-time streaming overlay to a fully autonomous, privacy-first AI platform.
          </p>
        </div>

        <div className="space-y-6">
          {ROADMAP_PHASES.map((phase, index) => {
            const styles = STATUS_STYLES[phase.status];
            const Icon = phase.icon;

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="signal-panel p-6 md:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${styles.icon}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${styles.badge}`}
                      >
                        {phase.year}
                      </span>
                      <h2 className="mt-4 text-2xl font-semibold text-foreground">{phase.title}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{phase.description}</p>
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {phase.status.replace('-', ' ')}
                  </div>
                </div>

                <div className="signal-divider my-6" />

                <div className="grid gap-3 md:grid-cols-2">
                  {phase.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="signal-panel mt-12 p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-semibold text-foreground">Ready to follow the journey?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Stay aligned with every milestone, experiment, and release as Chimera evolves.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/episodes"
                className="inline-flex items-center justify-center rounded-full border border-primary/40 px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary/80"
              >
                View Episodes
              </Link>
              <a
                href="https://github.com/Sahil170595/Banterblogs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-border/60 px-5 py-2 text-sm font-semibold text-foreground transition hover:border-accent/60 hover:text-accent"
              >
                Follow on GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
}
