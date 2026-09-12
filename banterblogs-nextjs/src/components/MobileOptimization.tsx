'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface MobileNavigationProps {
  prevEpisode?: { slug: string; title: string } | null;
  nextEpisode?: { slug: string; title: string } | null;
  className?: string;
}

// Floating prev/next pill on phones. It stays mounted so its enter and exit
// run in CSS on the overlay tokens; while hidden it is inert and ignores the
// pointer.
const PILL_LINK_CLASS =
  'flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground transition-colors duration-fast ease-standard hover:bg-muted/70 hover:text-foreground';

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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      inert={isVisible ? undefined : true}
      className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 transition-[opacity,transform] duration-base ease-standard md:hidden ${
        isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
      } ${className}`}
    >
      <div className="flex items-center gap-2 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full px-4 py-2 shadow-2xl">
        {prevEpisode && (
          <a href={`/episodes/${prevEpisode.slug}`} data-navigation="prev" className={PILL_LINK_CLASS}>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs">Prev</span>
          </a>
        )}

        <div className="w-px h-4 bg-border/50" />

        {nextEpisode && (
          <a href={`/episodes/${nextEpisode.slug}`} data-navigation="next" className={PILL_LINK_CLASS}>
            <span className="text-xs">Next</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
