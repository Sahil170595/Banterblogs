'use client';

import { motion } from 'framer-motion';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  delay?: number;
}

export function StatsCard({ label, value, icon, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:bg-card/80 transition-all duration-300"
    >
      <div className="flex flex-col items-center text-center">
        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div className="text-2xl font-bold text-foreground mb-1">
          {value}
        </div>
        <div className="text-sm text-muted-foreground">
          {label}
        </div>
      </div>
      
      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
}
