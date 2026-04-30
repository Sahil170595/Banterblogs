'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, FlaskConical } from 'lucide-react';

const highlights = [
  {
    label: 'Phase 1 — Foundation',
    range: 'TR108–TR116',
    summary: 'Model loading, ONNX conversion, quantization baselines, security analysis.',
  },
  {
    label: 'Phase 1.5 — Benchmarking',
    range: 'TR117–TR122',
    summary: 'Cross-backend inference parity, TensorRT compilation, scaling laws.',
  },
  {
    label: 'Phase 2 — Optimization',
    range: 'TR123–TR133',
    summary: 'KV cache tuning, INT8/FP8 quantization, context scaling, capacity planning.',
  },
  {
    label: 'Phase 3 — Safety',
    range: 'TR134–TR147',
    summary: 'Alignment under quantization, AWQ/GPTQ safety, batch perturbation, multi-turn jailbreaks, cross-architecture fragility, speculative decoding.',
  },
];

export function RoadmapRail() {
  return (
    <section className="container pb-20 pt-10 md:pb-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80 font-semibold">
          Research Program
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight display">
          728,000+ measurements across 44 technical reports
        </h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed mx-auto">
          Independent ML research with CUDA event timing and controlled safety evaluations.
          Every claim is backed by data, every optimization is measured.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((phase, index) => (
          <motion.div
            key={phase.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            viewport={{ once: true, amount: 0.3 }}
            className="rounded-xl border border-border/40 bg-card/40 p-5 backdrop-blur"
          >
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {phase.range}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{phase.label}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{phase.summary}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
        >
          Browse the research archive
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
