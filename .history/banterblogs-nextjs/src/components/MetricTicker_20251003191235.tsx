'use client';

import { motion } from 'framer-motion';
import { ActivitySquare, Cpu, Eye, Shield } from 'lucide-react';
import type { ReactElement } from 'react';
import type { Episode } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

interface MetricTickerProps {
  totalEpisodes: number;
  totalLines: number;
  avgComplexity: number;
  latestEpisode?: Episode;
}

interface MetricEntry {
  label: string;
  value: string;
  icon: ReactElement;
}

export function MetricTicker({ totalEpisodes, totalLines, avgComplexity, latestEpisode }: MetricTickerProps) {
  const metrics: MetricEntry[] = [
    {
      label: 'Development Episodes',
      value: formatNumber(totalEpisodes),
      icon: <ActivitySquare className="h-4 w-4" />,
    },
    {
      label: 'Platform Code Lines',
      value: formatNumber(totalLines),
      icon: <Cpu className="h-4 w-4" />,
    },
    {
      label: 'System Complexity',
      value: `${avgComplexity}/100`,
      icon: <Shield className="h-4 w-4" />,
    },
  ];

  if (latestEpisode) {
    metrics.push({
      label: 'Latest Episode',
      value: `Log ${latestEpisode.id}`,
      icon: <Eye className="h-4 w-4" />,
    });
  }

  return (
    <section className="border-y border-border/60 bg-background/60">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 py-10 md:grid-cols-2 lg:grid-cols-4"
        >
          {metrics.map((metric) => (
            <div key={metric.label} className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-card/60 p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {metric.icon}
              </span>
              <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{metric.label}</span>
              <span className="text-xl font-semibold text-foreground">{metric.value}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}