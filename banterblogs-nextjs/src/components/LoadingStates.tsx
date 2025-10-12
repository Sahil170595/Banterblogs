'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className = '', lines = 3 }: SkeletonCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-muted/30 border border-border/50 ${className}`}>
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      
      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        <div className="h-4 bg-muted/50 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`h-3 bg-muted/50 rounded animate-pulse ${
                i === lines - 1 ? 'w-3/4' : 'w-full'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProgressiveImageProps {
  src: string;
  placeholder: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

export function ProgressiveImage({ 
  src, 
  placeholder, 
  alt, 
  className = '',
  onLoad 
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      <motion.img
        src={placeholder}
        alt={alt}
        className="w-full h-full object-cover blur-sm scale-110"
        initial={{ opacity: 1 }}
        animate={{ opacity: loaded ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Main image */}
      <motion.img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {/* Loading indicator */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <motion.div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-muted-foreground text-sm">Failed to load</div>
        </div>
      )}
    </div>
  );
}

interface LoadingDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingDots({ className = '', size = 'md' }: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${sizeClasses[size]} bg-primary rounded-full`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

interface PulseLoaderProps {
  className?: string;
  color?: string;
}

export function PulseLoader({ className = '', color = 'primary' }: PulseLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        className={`w-4 h-4 bg-${color} rounded-full`}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className={`h-3 bg-muted/50 rounded animate-pulse ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

