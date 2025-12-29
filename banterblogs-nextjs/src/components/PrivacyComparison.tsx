'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Database, WifiOff, Tag, Lock, Settings, Zap } from 'lucide-react';

type IconType = typeof Database;

interface ComparisonPoint {
  feature: string;
  cloudAI: string;
  localAI: string;
  icon: IconType;
}

const comparisonData: ComparisonPoint[] = [
  {
    feature: 'Data storage',
    cloudAI: 'Sent to centralized servers',
    localAI: 'Stays on your device',
    icon: Database,
  },
  {
    feature: 'Internet required',
    cloudAI: 'Useless offline',
    localAI: 'Works completely offline',
    icon: WifiOff,
  },
  {
    feature: 'Cost profile',
    cloudAI: 'Subscription fees forever',
    localAI: 'One-time setup cost',
    icon: Tag,
  },
  {
    feature: 'Privacy posture',
    cloudAI: 'Every chat monitored',
    localAI: 'Zero surveillance',
    icon: Lock,
  },
  {
    feature: 'Customization',
    cloudAI: 'Generic responses',
    localAI: 'Learns your personality',
    icon: Settings,
  },
  {
    feature: 'Speed',
    cloudAI: 'Depends on the internet',
    localAI: 'Sub-200ms local processing',
    icon: Zap,
  },
];

export function PrivacyComparison() {
  const [selectedPoint, setSelectedPoint] = useState(0);

  return (
    <section className="relative py-24">
      <div className="signal-grid absolute inset-0 opacity-30" aria-hidden />
      <div className="container relative">
        <div className="max-w-3xl">
          <span className="signal-pill">Local Sovereignty</span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight">Cloud AI vs Chimera</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Stop trading ownership for convenience. Chimera keeps every signal in your control.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="signal-panel p-8"
          >
            <h3 className="text-2xl font-semibold text-foreground">Traditional Cloud AI</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Centralized platforms that trade convenience for surveillance and latency.
            </p>

            <div className="mt-6 space-y-4">
              {comparisonData.map((point, index) => {
                const Icon = point.icon;
                const isActive = selectedPoint === index;
                return (
                  <motion.button
                    key={point.feature}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    onClick={() => setSelectedPoint(index)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? 'border-red-400/60 bg-red-500/10'
                        : 'border-border/60 bg-background/40 hover:border-red-400/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{point.feature}</p>
                          <p className="mt-1 text-xs text-red-200/80">{point.cloudAI}</p>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="signal-panel p-8"
          >
            <h3 className="text-2xl font-semibold text-foreground">Chimera Local AI</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A private, local-first system that keeps every inference under your control.
            </p>

            <div className="mt-6 space-y-4">
              {comparisonData.map((point, index) => {
                const Icon = point.icon;
                const isActive = selectedPoint === index;
                return (
                  <motion.button
                    key={point.feature}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    onClick={() => setSelectedPoint(index)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? 'border-emerald-400/60 bg-emerald-500/10'
                        : 'border-border/60 bg-background/40 hover:border-emerald-400/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{point.feature}</p>
                          <p className="mt-1 text-xs text-emerald-200/80">{point.localAI}</p>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <motion.div
          key={selectedPoint}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="signal-panel-strong mt-10 p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Focus</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {comparisonData[selectedPoint].feature}
              </h3>
            </div>
            <div className="text-sm text-muted-foreground">Chimera local advantage</div>
          </div>

          <div className="signal-divider my-6" />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">Cloud risk</h4>
              <p className="mt-2 text-sm text-muted-foreground">{comparisonData[selectedPoint].cloudAI}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Local advantage</h4>
              <p className="mt-2 text-sm text-muted-foreground">{comparisonData[selectedPoint].localAI}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
