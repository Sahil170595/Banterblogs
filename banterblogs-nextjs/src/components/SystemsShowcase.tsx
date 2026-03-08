'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, BookOpen, BrainCircuit, Cpu, Radio, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

const systems = [
  {
    name: 'Banterpacks',
    label: '122K LOC Monorepo',
    description: 'Real-time streaming overlay with JARVIS AI gateway, manifest registry, constitutional AI governance, and a Rust runtime that cut latency by 58%.',
    bullets: ['Sub-200ms event-to-render pipeline', 'JARVIS gateway with 4 LLM providers', '305+ automated tests'],
    href: '/platform',
    icon: <Radio className="h-5 w-5" />,
  },
  {
    name: 'Banterhearts',
    label: '70K+ Measurements',
    description: 'Production ML research platform with CUDA event timing, quantization pipelines, TensorRT compilation, and capacity planning — feeding 26 technical reports.',
    bullets: ['32K LOC Python research platform', 'INT8/FP8 quantization and KV cache analysis', 'FastAPI production services'],
    href: '/reports',
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    name: 'Chimera Multi-Agent',
    label: '6-Agent Pipeline',
    description: 'Production orchestration with ingestor, collector, watcher, council, publisher, and translator agents backed by ClickHouse and Datadog.',
    bullets: ['18K LOC Python pipeline', 'MCP servers for tool orchestration', 'Time-series analytics'],
    href: '/chimera',
    icon: <BrainCircuit className="h-5 w-5" />,
  },
  {
    name: 'Chimeraforge',
    label: '4.3 GB Experiment Data',
    description: 'Research breakout with a 4-gate capacity planner CLI for inference optimization, context scaling, and concurrency profiling.',
    bullets: ['13K LOC benchmarking infra', 'Capacity planning CLI', 'Model output analysis'],
    href: '/reports',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    name: 'Chimeradroid',
    label: 'Mobile Deployment',
    description: 'Unity Android client connecting to the JARVIS v2 gateway — real device deployment extending the AI ecosystem to mobile.',
    bullets: ['3K LOC C# / Unity', 'JARVIS v2 gateway client', 'Android native'],
    href: '/about',
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    name: 'Banterblogs',
    label: 'This Site',
    description: 'Automated documentation engine that ingests commits from all repos, generates multi-persona episodes, and publishes the research archive.',
    bullets: ['Next.js with SSG + ISR', 'Multi-persona narration engine', '26-report research archive'],
    href: '/about',
    icon: <BookOpen className="h-5 w-5" />,
  },
];

export function SystemsShowcase() {
  return (
    <section className="container py-20 md:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80 font-semibold">200K+ lines of code across 6 repositories</p>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold leading-tight display">
          The Full Ecosystem.
          <br />
          <span className="gradient-text">One Mission: Chimera</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          Real-time overlay. ML research with 70K+ measurements. Multi-agent orchestration. Mobile deployment.
          All building toward a <strong className="text-accent">fully autonomous, privacy-first AI platform</strong>.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {systems.map((system, index) => (
          <motion.article
            key={system.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true, amount: 0.4 }}
            className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {system.icon}
              </span>
              {system.label}
            </div>
            <h3 className="mt-4 text-xl font-semibold text-foreground">
              {system.name}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {system.description}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground/90">
              {system.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Link
              href={system.href}
              aria-label={`Deep dive into ${system.name}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              Deep dive
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}