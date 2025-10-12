'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Eye, 
  Heart, 
  Share2, 
  Bookmark, 
  MessageCircle,
  TrendingUp,
  Star
} from 'lucide-react';

interface ReadingExperienceProps {
  episode: {
    id: number;
    title: string;
    readingTime: number;
    date: string;
  };
  onLike?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
}

export function ReadingExperience({ 
  episode, 
  onLike, 
  onShare, 
  onBookmark 
}: ReadingExperienceProps) {
  const [readingProgress, setReadingProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFloatingActions, setShowFloatingActions] = useState(false);
  const [readingStats, setReadingStats] = useState({
    views: Math.floor(Math.random() * 1000) + 100,
    likes: Math.floor(Math.random() * 50) + 10,
    bookmarks: Math.floor(Math.random() * 30) + 5,
    comments: Math.floor(Math.random() * 20) + 3
  });

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min((scrollTop / docHeight) * 100, 100);
      setReadingProgress(progress);
      
      // Show floating actions when user scrolls down
      setShowFloatingActions(scrollTop > 200);
    };

    window.addEventListener('scroll', updateProgress);
    updateProgress();

    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setReadingStats(prev => ({
      ...prev,
      likes: prev.likes + (isLiked ? -1 : 1)
    }));
    onLike?.();
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    setReadingStats(prev => ({
      ...prev,
      bookmarks: prev.bookmarks + (isBookmarked ? -1 : 1)
    }));
    onBookmark?.();
  };

  return (
    <>
      {/* Reading Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary z-50"
        style={{ scaleX: readingProgress / 100, transformOrigin: 'left' }}
      />

      {/* Floating Action Bar */}
      <AnimatePresence>
        {showFloatingActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-2 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full px-4 py-3 shadow-2xl">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                className={`p-2 rounded-full transition-colors ${
                  isLiked 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-400'
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleBookmark}
                className={`p-2 rounded-full transition-colors ${
                  isBookmarked 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onShare}
                className="p-2 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </motion.button>

              <div className="w-px h-6 bg-border/50 mx-1" />

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>{readingStats.views}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading Stats Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed left-6 top-1/2 transform -translate-y-1/2 z-30 hidden lg:block"
      >
        <div className="bg-background/90 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Reading Stats</h3>
          </div>

          <div className="space-y-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Eye className="h-3 w-3 text-blue-400" />
                <span className="text-muted-foreground">Views</span>
              </div>
              <span className="font-semibold text-foreground">{readingStats.views}</span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Heart className="h-3 w-3 text-red-400" />
                <span className="text-muted-foreground">Likes</span>
              </div>
              <span className="font-semibold text-foreground">{readingStats.likes}</span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Bookmark className="h-3 w-3 text-blue-400" />
                <span className="text-muted-foreground">Saves</span>
              </div>
              <span className="font-semibold text-foreground">{readingStats.bookmarks}</span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3 w-3 text-green-400" />
                <span className="text-muted-foreground">Comments</span>
              </div>
              <span className="font-semibold text-foreground">{readingStats.comments}</span>
            </motion.div>
          </div>

          {/* Reading Progress */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(readingProgress)}%</span>
            </div>
            <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                style={{ width: `${readingProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reading Time Indicator */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        className="fixed right-6 top-1/2 transform -translate-y-1/2 z-30 hidden lg:block"
      >
        <div className="bg-background/90 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-lg font-bold text-foreground">{episode.readingTime}</div>
            <div className="text-xs text-muted-foreground">min read</div>
          </div>

          {/* Estimated Time Remaining */}
          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <div className="text-xs text-muted-foreground mb-1">Time Remaining</div>
            <div className="text-sm font-semibold text-foreground">
              {Math.max(0, Math.round(episode.readingTime * (1 - readingProgress / 100)))} min
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reading Completion Celebration */}
      <AnimatePresence>
        {readingProgress >= 95 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center"
              >
                <Star className="h-12 w-12 text-primary fill-current" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground mb-2"
              >
                🎉 Reading Complete!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground"
              >
                Great job finishing this episode!
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface ReadingTipsProps {
  className?: string;
}

export function ReadingTips({ className = '' }: ReadingTipsProps) {
  const [currentTip, setCurrentTip] = useState(0);
  
  const tips = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      title: "Reading Mode",
      description: "Use dark mode for better focus and reduced eye strain"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Take Breaks",
      description: "Take a 5-minute break every 25 minutes for optimal retention"
    },
    {
      icon: <Eye className="h-5 w-5" />,
      title: "Focus Mode",
      description: "Hide distractions and focus on the content"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Track Progress",
      description: "Monitor your reading progress to stay motivated"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className={`bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        Reading Tips
      </h3>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTip}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="text-primary">
            {tips[currentTip].icon}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{tips[currentTip].title}</h4>
            <p className="text-sm text-muted-foreground">{tips[currentTip].description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-1 mt-4">
        {tips.map((_, index) => (
          <motion.div
            key={index}
            className={`h-1 rounded-full ${
              index === currentTip ? 'bg-primary w-6' : 'bg-muted/50 w-2'
            }`}
            animate={{ width: index === currentTip ? 24 : 8 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
