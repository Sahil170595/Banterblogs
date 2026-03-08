'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface MobileNavigationProps {
  prevEpisode?: { slug: string; title: string } | null;
  nextEpisode?: { slug: string; title: string } | null;
  className?: string;
}

export function MobileNavigation({ prevEpisode, nextEpisode, className = '' }: MobileNavigationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Show navigation when scrolled past 20% and not at the very bottom
      setIsVisible(scrollTop > windowHeight * 0.2 && scrollTop < documentHeight - windowHeight * 0.8);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 md:hidden ${className}`}
        >
          <div className="flex items-center gap-2 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full px-4 py-2 shadow-2xl">
            {prevEpisode && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`/episodes/${prevEpisode.slug}`}
                data-navigation="prev"
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-xs">Prev</span>
              </motion.a>
            )}

            <div className="w-px h-4 bg-border/50" />

            {nextEpisode && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`/episodes/${nextEpisode.slug}`}
                data-navigation="next"
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              >
                <span className="text-xs">Next</span>
                <ArrowRight className="h-4 w-4" />
              </motion.a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
