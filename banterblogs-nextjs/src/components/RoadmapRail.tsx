'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Timer } from 'lucide-react';

const phases = [
  {
    name: 'Phase 01: Overlay Proof of Concept',
    status: 'Live in production',
    description: 'Enterprise-grade streaming overlay demonstrating sub-200ms AI latency, rollout controls, and creator validation tools.',
    signals: ['Real-time WebRTC overlay', 'A/B testing with instant rollback', 'Provider health monitoring', 'Service Worker offline capabilities'],
    cta: { label: 'Explore Banterpacks Platform', href: '/platform?view=banterpacks' },
    done: true,
  },
  {
    name: 'Phase 02: Local Assistant Alpha',
    status: 'In development',
    description: 'Building fully local AI core with GPU quantization, TensorRT compilation, and automated RLHF training pipelines.',
    signals: ['Production ML infrastructure', 'Sub-100ms inference target', 'Multi-service FastAPI architecture', 'Enterprise observability stack'],
    cta: { label: 'Track Banterhearts Progress', href: '/technology?system=banterhearts' },
    done: false,
  },
  {
    name: 'Phase 03: Multi-Device Intelligence',
    status: 'Queued',
    description: 'Device-agnostic Chimera deployment with encrypted sync, cross-platform compatibility, and unified personal AI workspace.',
    signals: ['Edge deployment architecture', 'Encrypted mesh networking', 'Cross-platform compatibility layer', 'Unified workspace integration'],
    cta: { label: 'Join Early Access Program', href: '/roadmap#access' },
    done: false,
  },
];

export function RoadmapRail() {
  return (
    <section className="container pb-20 pt-10 md:pb-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80 font-semibold">Chimera Evolution Path</p>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold leading-tight display">
          From Streaming Overlay to{" "}
          <span className="gradient-text">Personal AI Platform</span>
        </h2>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {phases.map((phase, index) => (
          <motion.article
            key={phase.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true, amount: 0.25 }}
            className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-card/60 p-8 backdrop-blur"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em]">
              <span className="text-muted-foreground">{phase.status}</span>
              {phase.done ? (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Shipped
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Timer className="h-4 w-4" />
                  Tracking
                </span>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-foreground">{phase.name}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{phase.description}</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground/90">
              {phase.signals.map((signal) => (
                <li key={signal} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
            <Link
              href={phase.cta.href}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              {phase.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}