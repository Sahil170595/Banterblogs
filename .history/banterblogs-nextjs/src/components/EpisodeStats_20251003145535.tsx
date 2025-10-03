'use client';

import { motion } from 'framer-motion';
import { FileText, GitCommit, Clock, Activity } from 'lucide-react';
import { Episode } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

interface EpisodeStatsProps {
  episode: Episode;
}

export function EpisodeStats({ episode }: EpisodeStatsProps) {
  const getComplexityColor = (complexity: number) => {
    if (complexity >= 80) return 'text-red-400';
    if (complexity >= 60) return 'text-yellow-400';
    if (complexity >= 40) return 'text-blue-400';
    return 'text-green-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8"
    >
      <div className="flex items-center space-x-2 text-sm">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Files:</span>
        <span className="font-medium">{episode.filesChanged}</span>
      </div>
      
      <div className="flex items-center space-x-2 text-sm">
        <GitCommit className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Lines:</span>
        <span className="font-medium">{episode.linesAdded.toLocaleString()}</span>
      </div>
      
      <div className="flex items-center space-x-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Read:</span>
        <span className="font-medium">{episode.readingTime} min</span>
      </div>
      
      <div className="flex items-center space-x-2 text-sm">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Complexity:</span>
        <span className={`font-medium ${getComplexityColor(episode.complexity)}`}>
          {episode.complexity}
        </span>
      </div>
    </motion.div>
  );
}
