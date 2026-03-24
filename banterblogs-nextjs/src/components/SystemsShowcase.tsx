'use client';

import Link from 'next/link';
import { ArrowRight, Radio, Cpu, BrainCircuit, BarChart3, Smartphone, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const coreEngines = [
  {
    name: 'Banterpacks',
    role: 'Constitutional AI Core',
    description:
      'Constitutional enforcement architecture — embedding-based safety routing (99% fast-path), multi-model debate engine, Rust runtime with Ed25519 provenance and ZK proofs, RLAIF self-improving alignment loop, and the JARVIS AI gateway.',
    stats: ['6 subsystems', '7 Rust crates', '89 patches'],
    href: '/platform',
    icon: <Radio className="h-6 w-6" />,
  },
  {
    name: 'Banterhearts',
    role: 'ML Research Backbone',
    description:
      'Production research platform with CUDA event timing, quantization pipelines, TensorRT compilation, and capacity planning across 36 technical reports.',
    stats: ['555K+ measurements', '36 reports', '4 compilation backends'],
    href: '/reports',
    icon: <Cpu className="h-6 w-6" />,
  },
];

const supportingSystems = [
  {
    name: 'Chimera Multi-Agent',
    role: 'Muse Protocol — observability + content',
    description: '6-agent pipeline with ClickHouse analytics. Also the ecosystem observability layer (OTel, Datadog, DLQ).',
    href: '/chimera',
    icon: <BrainCircuit className="h-5 w-5" />,
  },
  {
    name: 'Chimeraforge',
    role: 'On PyPI — pip install chimeraforge',
    description: 'LLM deployment optimizer. 4-gate capacity planner across model, quant, backend, and agent count for 15 GPUs.',
    href: 'https://pypi.org/project/chimeraforge/',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    name: 'Chimeradroid',
    role: 'Mobile companion',
    description: 'Unity Android client — voice, chat, tool approval, session handoff, mesh networking, offline-first.',
    href: '/about',
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    name: 'Echo',
    role: 'Channel adapters',
    description: 'Slack and Discord bridges to JARVIS with session tracking and device key auth.',
    href: '/about',
    icon: <Radio className="h-5 w-5" />,
  },
  {
    name: 'JARVIS Console',
    role: 'Web dashboard',
    description: 'Next.js console — chat with streaming, control room, cognitive ELO, tool catalog, workflows.',
    href: '/about',
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    name: 'This Site',
    role: 'Automated documentation',
    description: 'Ingests commits from all repos, generates multi-persona episodes, publishes the research archive.',
    href: '/about',
    icon: <BookOpen className="h-5 w-5" />,
  },
];

export function SystemsShowcase() {
  return (
    <section className="container py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80 font-semibold">
          What powers the platform
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight display">
          Two core engines. Six supporting systems.
        </h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed mx-auto">
          Banterpacks is the constitutional AI core. Banterhearts provides the research backbone.
          The rest of the ecosystem extends access — mobile, web, messaging, observability.
        </p>
      </div>

      {/* Core engines — two big cards */}
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {coreEngines.map((engine, index) => (
          <motion.article
            key={engine.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true, amount: 0.3 }}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {engine.icon}
              </span>
              <div>
                <h3 className="text-xl font-semibold text-foreground">{engine.name}</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{engine.role}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{engine.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {engine.stats.map((stat) => (
                <span
                  key={stat}
                  className="inline-flex rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
                >
                  {stat}
                </span>
              ))}
            </div>

            <Link
              href={engine.href}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              Learn more
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.article>
        ))}
      </div>

      {/* Supporting systems — four smaller cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {supportingSystems.map((system, index) => (
          <motion.article
            key={system.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            viewport={{ once: true, amount: 0.3 }}
            className="group rounded-xl border border-border/40 bg-card/40 p-5 backdrop-blur transition hover:border-border/60 hover:bg-card/60"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {system.icon}
              </span>
              <h3 className="text-sm font-semibold text-foreground">{system.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground/80 uppercase tracking-[0.16em] mb-2">{system.role}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{system.description}</p>
          </motion.article>
        ))}
      </div>

      {/* Subtle engineering depth strip */}
      <div className="mt-10 text-center text-sm text-muted-foreground/60">
        8 repositories &middot; Python, Rust, TypeScript, C# &middot; 89 patches shipped
      </div>
    </section>
  );
}
