'use client';

import { motion } from 'framer-motion';
import type { Episode } from '@/lib/episodes';

interface EpisodeContentProps {
  episode: Episode;
}

export function EpisodeContent({ episode }: EpisodeContentProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="prose prose-zinc prose-invert max-w-none"
    >
      <div 
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: episode.content }}
      />
      
      {/* Episode Tags */}
      {episode.tags.length > 0 && (
        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {episode.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.article>
  );
}
