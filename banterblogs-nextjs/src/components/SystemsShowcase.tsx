'use client';

import Link from 'next/link';
import { ArrowRight, BrainCircuit, Cpu, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const systems = [
  {
    name: 'Banterpacks Platform',
    label: 'Real-Time AI Overlay',
    status: 'Production',
    metrics: '<200ms latency',
    description: 'Enterprise-grade streaming overlay platform with sub-millisecond AI responses, rollout controls, and creator tools proving local AI viability.',
    bullets: ['WebRTC-based browser overlay', 'A/B testing with instant rollback', 'Provider health monitoring panel', 'Service Worker offline capabilities'],
    href: '/platform?view=banterpacks',
    icon: <Radio className="h-5 w-5" />,
  },
  {
    name: 'Banterhearts (Chimera)',
    label: 'ML Optimization Core',
    status: 'Production',
    metrics: '<100ms inference',
    description: 'Production ML infrastructure with GPU quantization, TensorRT compilation, RLHF training, and enterprise observability stack.',
    bullets: ['Multi-service FastAPI architecture', 'INT8/FP8 quantization pipeline', 'Prometheus + Grafana + Jaeger', 'Automated RLHF retraining'],
    href: '/technology?system=banterhearts',
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    name: 'Banterblogs Automation',
    label: 'Development Intelligence',
    status: 'Production',
    metrics: '24/7 monitoring',
    description: 'Automated documentation engine parsing git commits, telemetry, and CI/CD metrics into narrative episodes with multi-persona TL;DRs.',
    bullets: ['Real-time commit ingestion', 'AI-powered narrative generation', 'Multi-persona content adaptation', 'Cross-repo artifact linking'],
    href: '/about',
    icon: <BrainCircuit className="h-5 w-5" />,
  },
];

export function SystemsShowcase() {
  return (
    <section className="container py-20 md:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80 font-semibold">Building the world&apos;s first fully local AI platform</p>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold leading-tight display">
          Three Production Systems.
          <br />
          <span className="gradient-text">One Mission: Jarvis</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          Real-time overlay proving demand. ML optimization spine scaling performance. Automation plane documenting every breakthrough.
          All building toward a <strong className="text-accent">fully autonomous, privacy-first AI assistant</strong> that runs on any device.
        </p>
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-3">
        {systems.map((system, index) => (
          <motion.article
            key={system.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true, amount: 0.4 }}
            className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-8 backdrop-blur"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {system.icon}
              </span>
              {system.label}
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-foreground">
              {system.name}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {system.description}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground/90">
              {system.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Link
              href={system.href}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              Deep dive
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}