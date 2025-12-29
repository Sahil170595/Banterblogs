'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FileText, Brain, Mic2, Cpu, ShieldCheck } from 'lucide-react';

type IconType = typeof FileText;

interface TimelineEvent {
  episode: string;
  date: string;
  highlight: string;
  complexity: number;
  description: string;
  icon: IconType;
  milestone: boolean;
}

const timelineEvents: TimelineEvent[] = [
  {
    episode: 'Episode 1',
    date: 'Sep 7, 2025',
    highlight: 'Empty Markdown Files',
    complexity: 10,
    description: 'Four empty docs, infinite possibility',
    icon: FileText,
    milestone: true,
  },
  {
    episode: 'Episode 15',
    date: 'Sep 12, 2025',
    highlight: 'First AI Integration',
    complexity: 45,
    description: 'Multi-LLM architecture begins',
    icon: Brain,
    milestone: true,
  },
  {
    episode: 'Episode 30',
    date: 'Sep 20, 2025',
    highlight: 'Voice Control System',
    complexity: 70,
    description: 'Real-time audio processing',
    icon: Mic2,
    milestone: true,
  },
  {
    episode: 'Episode 41',
    date: 'Sep 24, 2025',
    highlight: 'Local Ollama Integration',
    complexity: 85,
    description: 'Complete offline capability',
    icon: Cpu,
    milestone: true,
  },
  {
    episode: 'Episode 53',
    date: 'Sep 26, 2025',
    highlight: 'Enterprise OAuth',
    complexity: 99,
    description: 'Production-ready security',
    icon: ShieldCheck,
    milestone: true,
  },
];

export function DevelopmentTimeline() {
  const [activeEpisode, setActiveEpisode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEpisode((prev) => (prev + 1) % timelineEvents.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-24">
      <div className="signal-grid absolute inset-0 opacity-30" aria-hidden />
      <div className="container relative">
        <div className="max-w-3xl">
          <span className="signal-pill">Development Timeline</span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight">The Evolution Journey</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Track the leap from empty docs to an enterprise-grade local AI system.
          </p>
        </div>

        <div className="relative mt-12">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border/60" aria-hidden />
          <div className="space-y-6">
            {timelineEvents.map((event, index) => {
              const Icon = event.icon;
              const isActive = activeEpisode === index;

              return (
                <motion.article
                  key={event.episode}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="relative pl-16"
                >
                  <div
                    className={`absolute left-0 top-6 flex h-10 w-10 items-center justify-center rounded-2xl border ${
                      isActive
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'border-border/60 bg-background/60 text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <motion.div
                    className={`${isActive ? 'signal-panel-strong' : 'signal-panel'} p-6 transition`}
                    onClick={() => setActiveEpisode(index)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{event.episode}</p>
                        <h3 className="mt-2 text-xl font-semibold text-foreground">{event.highlight}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{event.date}</div>
                        {event.milestone && (
                          <div className="mt-2 inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Milestone
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Complexity</span>
                        <span className="font-mono text-foreground">{event.complexity}/100</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted/60">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${event.complexity}%` }}
                          transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </motion.article>
              );
            })}
          </div>
        </div>

        <div className="mt-12 signal-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Focus</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {timelineEvents[activeEpisode].highlight}
              </h3>
            </div>
            <div className="text-sm text-muted-foreground">
              {timelineEvents[activeEpisode].episode} - {timelineEvents[activeEpisode].date}
            </div>
          </div>
          <div className="signal-divider my-4" />
          <p className="text-muted-foreground">{timelineEvents[activeEpisode].description}</p>
        </div>
      </div>
    </section>
  );
}
