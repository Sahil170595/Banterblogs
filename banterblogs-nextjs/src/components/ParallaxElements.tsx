'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ParallaxElementProps {
  children: ReactNode;
  speed?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export function ParallaxElement({ 
  children, 
  speed = 0.5, 
  direction = 'up',
  className = '' 
}: ParallaxElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });




  const y = useTransform(scrollYProgress, [0, 1], [0, -100 * speed]);
  const x = useTransform(scrollYProgress, [0, 1], [0, -100 * speed]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        y: direction === 'up' || direction === 'down' ? y : 0,
        x: direction === 'left' || direction === 'right' ? x : 0,
      }}
    >
      {children}
    </motion.div>
  );
}

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className = '' }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();
  
  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent z-50 ${className}`}
      style={{ scaleX: scrollYProgress, transformOrigin: 'left' }}
    />
  );
}

interface ReadingProgressProps {
  className?: string;
}

export function ReadingProgress({ className = '' }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  
  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const newProgress = Math.min((scrollTop / docHeight) * 100, 100);
      setProgress(newProgress);
      
      // Estimate reading time based on scroll position
      const wordsPerMinute = 200;
      const totalWords = document.body.innerText.split(/\s+/).length;
      const estimatedTime = Math.ceil(totalWords / wordsPerMinute);
      setReadingTime(estimatedTime);
    };

    window.addEventListener('scroll', updateProgress);
    updateProgress(); // Initial calculation
    
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-background/90 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">Reading Progress</span>
        </div>
        
        <div className="w-32 h-1 bg-muted rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(progress)}%</span>
          <span>{readingTime} min read</span>
        </div>
      </div>
    </div>
  );
}



