'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { GitCommit, FileText, Clock, Tag } from 'lucide-react';
import { Episode } from '@/lib/episodes';

interface EpisodeCardProps {
  episode: Episode;
  index?: number;
}

export function EpisodeCard({ episode, index = 0 }: EpisodeCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
    >
      <Link href={`/episodes/${episode.slug}`} className="block p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Episode {episode.id}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(episode.date)}
            </span>
          </div>
          <div className={`text-xs font-medium ${getComplexityColor(episode.complexity)}`}>
            {episode.complexity} complexity
          </div>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
          {episode.title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {episode.subtitle}
        </p>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {episode.preview}
        </p>

        {/* Episode Context */}
        <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-muted/20 to-muted/10 border border-border/50">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xs font-medium text-primary">🚀 Development Milestone</span>
            <span className="text-xs text-muted-foreground">• Episode {episode.id}</span>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              This episode documents a critical decision in building Banterpacks&apos; 
              {episode.tags.includes('ai') && ' AI-powered'} 
              {episode.tags.includes('architecture') && ' architectural'} 
              {episode.tags.includes('testing') && ' testing'} 
              {episode.tags.includes('deployment') && ' deployment'} 
              {' '}capabilities.
            </p>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="text-muted-foreground">
                  {episode.filesChanged} files changed
                </span>
                <span className="text-muted-foreground">
                  {episode.linesAdded.toLocaleString()} lines added
                </span>
              </div>
              <span className="text-primary font-medium">
                Complexity: {episode.complexity}/100
              </span>
            </div>
            
            {episode.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {episode.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs text-primary font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {episode.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{episode.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{episode.filesChanged} files</span>
            </div>
            <div className="flex items-center space-x-1">
              <GitCommit className="h-3 w-3" />
              <span>{episode.linesAdded.toLocaleString()} lines</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{episode.readingTime} min read</span>
            </div>
          </div>
        </div>

        {episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {episode.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </span>
            ))}
            {episode.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{episode.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary group-hover:text-primary/80 transition-colors">
            Read Episode →
          </span>
          <div className="text-xs text-muted-foreground">
            {episode.commit && `#${episode.commit.slice(0, 7)}`}
          </div>
        </div>
        
        {/* Hover effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </Link>
    </motion.div>
  );
}
