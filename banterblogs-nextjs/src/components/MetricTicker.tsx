'use client';

import { motion } from 'framer-motion';
import { Target, TrendingUp, Code2, FileText } from 'lucide-react';
import type { Episode } from '@/lib/episodes';

interface MetricTickerProps {
  totalEpisodes: number;
  totalLines: number;
  avgComplexity: number;
  latestEpisode?: Episode;
}

export function MetricTicker({ 
  totalEpisodes, 
  totalLines, 
  avgComplexity, 
  latestEpisode 
}: MetricTickerProps) {
  const metrics = [
    {
      label: 'Total Episodes',
      value: totalEpisodes.toString(),
      change: '+3',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: 'Lines of Code',
      value: totalLines.toLocaleString(),
      change: '+2.1K',
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      label: 'Avg Complexity',
      value: `${avgComplexity}/100`,
      change: '-5',
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: 'Daily Active',
      value: '24/7',
      change: '+0',
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  return (
    <section className="border-b border-border/50 bg-gradient-to-r from-background via-background/80 to-background">
      <div className="container py-12">
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-center space-y-3 group cursor-pointer"
            >
              <div className="flex justify-center">
                <div className="rounded-lg bg-primary/10 p-3 text-primary transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110">
                  {metric.icon}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {metric.value}
                  </span>
                  <motion.span 
                    className={`text-sm font-medium px-2 py-1 rounded-full ${
                      metric.change.startsWith('+') 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : metric.change.startsWith('-')
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    {metric.change}
                  </motion.span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {metric.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {latestEpisode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm text-accent">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-fast" />
              Latest: Episode {latestEpisode.id} - {latestEpisode.filesChanged} files changed
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}