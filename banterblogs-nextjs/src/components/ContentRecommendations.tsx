'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Tag, 
  ArrowRight,
  BookOpen,
  Zap,
  Target,
  Star,
  Eye
} from 'lucide-react';
import type { Episode } from '@/lib/episodes';

interface ContentRecommendationsProps {
  currentEpisode: Episode;
  allEpisodes: Episode[];
  className?: string;
}

export function ContentRecommendations({ currentEpisode, allEpisodes, className = '' }: ContentRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Episode[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Generate recommendations based on various factors
    const generateRecommendations = () => {
      const scoredEpisodes = allEpisodes
        .filter(ep => ep.id !== currentEpisode.id)
        .map(episode => {
          let score = 0;

          // Tag similarity (40% weight)
          const commonTags = episode.tags.filter(tag => 
            currentEpisode.tags.includes(tag)
          ).length;
          score += commonTags * 40;

          // Platform similarity (30% weight)
          if (episode.platform === currentEpisode.platform) {
            score += 30;
          }

          // Recency bonus (20% weight)
          const currentDate = new Date(currentEpisode.date);
          const episodeDate = new Date(episode.date);
          const daysDiff = Math.abs(currentDate.getTime() - episodeDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff < 30) score += 20;
          else if (daysDiff < 90) score += 10;

          // Complexity similarity (10% weight)
          const complexityDiff = Math.abs(episode.complexity - currentEpisode.complexity);
          if (complexityDiff < 5) score += 10;

          return { episode, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.episode);

      setRecommendations(scoredEpisodes);
    };

    generateRecommendations();
    
    // Show recommendations after a delay
    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [currentEpisode, allEpisodes]);

  const getRecommendationReason = (episode: Episode) => {
    const commonTags = episode.tags.filter(tag => 
      currentEpisode.tags.includes(tag)
    );
    
    if (commonTags.length > 0) {
      return `Similar topics: ${commonTags.slice(0, 2).join(', ')}`;
    } else if (episode.platform === currentEpisode.platform) {
      return `Same platform: ${episode.platform}`;
    } else {
      return `Popular episode`;
    }
  };

  const getRecommendationIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Star className="h-4 w-4 text-yellow-400" />;
      case 1:
        return <TrendingUp className="h-4 w-4 text-blue-400" />;
      case 2:
        return <Zap className="h-4 w-4 text-purple-400" />;
      default:
        return <BookOpen className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`content-recommendations ${className}`}
        >
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Recommended Episodes</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Based on your current reading, you might enjoy these episodes
            </p>

            <div className="space-y-3">
              {recommendations.map((episode, index) => (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <a
                    href={`/episodes/${episode.slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    <div className="flex-shrink-0">
                      {getRecommendationIcon(index)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {episode.title}
                        </h4>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          #{episode.id}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                        {episode.preview}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {episode.readingTime} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {episode.tags.length} tags
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {episode.complexity} complexity
                        </div>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </a>
                  
                  <div className="ml-7 mt-1">
                    <p className="text-xs text-primary/70">
                      {getRecommendationReason(episode)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ReadingPathProps {
  episodes: Episode[];
  className?: string;
}

export function ReadingPath({ episodes, className = '' }: ReadingPathProps) {
  const [currentPath, setCurrentPath] = useState<Episode[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Generate reading paths based on different themes
    const generatePaths = () => {
      const paths = {
        beginner: episodes.filter(ep => ep.complexity < 10).slice(0, 5),
        intermediate: episodes.filter(ep => ep.complexity >= 10 && ep.complexity < 25).slice(0, 5),
        advanced: episodes.filter(ep => ep.complexity >= 25).slice(0, 5),
        platform: episodes.filter(ep => ep.platform === 'banterpacks').slice(0, 5),
        chimera: episodes.filter(ep => ep.platform === 'chimera').slice(0, 5)
      };

      // Choose a random path
      const pathKeys = Object.keys(paths) as Array<keyof typeof paths>;
      const randomPath = pathKeys[Math.floor(Math.random() * pathKeys.length)];
      setCurrentPath(paths[randomPath]);
    };

    generatePaths();
    
    const timer = setTimeout(() => setIsVisible(true), 4000);
    return () => clearTimeout(timer);
  }, [episodes]);

  return (
    <AnimatePresence>
      {isVisible && currentPath.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`reading-path ${className}`}
        >
          <div className="bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/20 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">Suggested Reading Path</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Follow this curated sequence for a comprehensive learning journey
            </p>

            <div className="space-y-2">
              {currentPath.map((episode, index) => (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
                    {index + 1}
                  </div>
                  
                  <a
                    href={`/episodes/${episode.slug}`}
                    className="flex-1 p-2 rounded-lg hover:bg-accent/10 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                          {episode.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Episode {episode.id} • {episode.readingTime} min read
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-accent/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total reading time: {currentPath.reduce((sum, ep) => sum + ep.readingTime, 0)} minutes
                </span>
                <span className="text-accent font-medium">
                  {currentPath.length} episodes
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface TrendingEpisodesProps {
  episodes: Episode[];
  className?: string;
}

export function TrendingEpisodes({ episodes, className = '' }: TrendingEpisodesProps) {
  const [trending, setTrending] = useState<Episode[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Simulate trending episodes based on various factors
    const generateTrending = () => {
      const scoredEpisodes = episodes.map(episode => {
        let score = 0;
        
        // Recency bonus
        const daysSincePublished = (Date.now() - new Date(episode.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePublished < 7) score += 50;
        else if (daysSincePublished < 30) score += 30;
        
        // Complexity bonus (more complex = more interesting)
        score += episode.complexity * 2;
        
        // Tag diversity bonus
        score += episode.tags.length * 5;
        
        // Random factor for variety
        score += Math.random() * 20;
        
        return { episode, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.episode);

      setTrending(scoredEpisodes);
    };

    generateTrending();
    
    const timer = setTimeout(() => setIsVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [episodes]);

  return (
    <AnimatePresence>
      {isVisible && trending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`trending-episodes ${className}`}
        >
          <div className="bg-gradient-to-r from-green-500/5 to-blue-500/5 border border-green-500/20 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-semibold text-foreground">Trending Now</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Episodes gaining traction in the community
            </p>

            <div className="space-y-3">
              {trending.map((episode, index) => (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <a
                    href={`/episodes/${episode.slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30 hover:border-green-500/30 hover:bg-green-500/5 transition-all duration-200"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-sm font-bold text-green-400">
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-green-400 transition-colors truncate">
                        {episode.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                        {episode.preview}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Episode {episode.id}</span>
                        <span>•</span>
                        <span>{episode.readingTime} min</span>
                        <span>•</span>
                        <span>{episode.complexity} complexity</span>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-400 transition-colors flex-shrink-0" />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
