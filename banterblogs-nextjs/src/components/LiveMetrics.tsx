'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Zap, Users, Clock } from 'lucide-react';

interface Metric {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit: string;
  icon: ReactNode;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

interface LiveMetricsProps {
  className?: string;
}

export function LiveMetrics({ className = '' }: LiveMetricsProps) {
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      id: 'episodes',
      label: 'Episodes Generated',
      value: 87,
      previousValue: 85,
      unit: '',
      icon: <Activity className="h-4 w-4" />,
      color: 'text-primary',
      trend: 'up'
    },
    {
      id: 'latency',
      label: 'Avg Response Time',
      value: 156,
      previousValue: 162,
      unit: 'ms',
      icon: <Zap className="h-4 w-4" />,
      color: 'text-green-400',
      trend: 'up'
    },
    {
      id: 'users',
      label: 'Active Users',
      value: 1247,
      previousValue: 1189,
      unit: '',
      icon: <Users className="h-4 w-4" />,
      color: 'text-blue-400',
      trend: 'up'
    },
    {
      id: 'uptime',
      label: 'System Uptime',
      value: 99.8,
      previousValue: 99.7,
      unit: '%',
      icon: <Clock className="h-4 w-4" />,
      color: 'text-emerald-400',
      trend: 'up'
    }
  ]);

  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        const variation = Math.random() * 0.1 - 0.05; // +/-5% variation
        const newValue = metric.value * (1 + variation);
        
        return {
          ...metric,
          previousValue: metric.value,
          value: Math.max(0, newValue),
          trend: newValue > metric.value ? 'up' : newValue < metric.value ? 'down' : 'stable'
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Math.round(value).toString();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-400" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-400" />;
      default:
        return <div className="h-3 w-3" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Live Metrics</h3>
        <button
          type="button"
          onClick={() => setIsLive(prev => !prev)}
          className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-pressed={isLive}
          title="Toggle live metrics"
        >
          <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-muted'}`} />
          <span>{isLive ? 'Live' : 'Paused'}</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence>
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="relative overflow-hidden rounded-xl border border-border/60 bg-card/70 p-6 backdrop-blur"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50" />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-primary/10 ${metric.color}`}>
                    {metric.icon}
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span className="text-xs text-muted-foreground">
                      {metric.trend === 'up' ? '+' : metric.trend === 'down' ? '-' : '='}
                      {Math.abs(((metric.value - metric.previousValue) / metric.previousValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <motion.div
                    key={metric.value}
                    initial={{ scale: 1.1, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl font-bold text-foreground"
                  >
                    {formatValue(metric.value, metric.unit)}
                  </motion.div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                </div>

                {/* Progress bar */}
                <div className="mt-4 w-full h-1 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((metric.value / 100) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Performance Chart Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border border-border/60 bg-card/70 p-6 backdrop-blur"
      >
        <h4 className="text-lg font-semibold text-foreground mb-4">Performance Trends</h4>
        <div className="h-48 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">Real-time performance charts</p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon with WebGL acceleration</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface MetricTickerProps {
  value: number;
  className?: string;
}

export function MetricTicker({ value, className = '' }: MetricTickerProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 2000;
    const startTime = performance.now();
    const startValue = displayValueRef.current;
    const targetValue = value;

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeOutCubic;

      displayValueRef.current = currentValue;
      setDisplayValue(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        displayValueRef.current = targetValue;
        frameRef.current = null;
        setDisplayValue(targetValue);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value]);

  return (
    <motion.span
      className={className}
      key={value}
      initial={{ scale: 1.1 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {Math.round(displayValue)}
    </motion.span>
  );
}


