'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Bookmark,
  BookmarkCheck,
  Heart,
  HeartHandshake,
  Copy,
  Check,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Link as LinkIcon,
  X
} from 'lucide-react';

interface SocialShareProps {
  episode: {
    title: string;
    slug: string;
    preview: string;
  };
  className?: string;
}

export function SocialShare({ episode, className = '' }: SocialShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const episodeUrl = `https://banterblogs.vercel.app/episodes/${episode.slug}`;
  const shareText = `Check out this episode: ${episode.title}`;

  const shareOptions = [
    {
      name: 'Twitter',
      icon: <Twitter className="h-4 w-4" />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(episodeUrl)}`,
      color: 'text-accent'
    },
    {
      name: 'Facebook',
      icon: <Facebook className="h-4 w-4" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(episodeUrl)}`,
      color: 'text-primary'
    },
    {
      name: 'LinkedIn',
      icon: <Linkedin className="h-4 w-4" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(episodeUrl)}`,
      color: 'text-accent'
    },
    {
      name: 'Copy Link',
      icon: copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />,
      action: 'copy',
      color: copied ? 'text-green-400' : 'text-muted-foreground'
    }
  ];

  const handleShare = async (option: any) => {
    if (option.action === 'copy') {
      try {
        await navigator.clipboard.writeText(episodeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    } else if (option.url) {
      window.open(option.url, '_blank', 'width=600,height=400');
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    // Here you would typically send analytics or update a database
    // Here you would typically send analytics or update a database
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    // Here you would typically save to localStorage or user preferences
    const bookmarks = JSON.parse(localStorage.getItem('episode-bookmarks') || '[]');
    if (bookmarked) {
      const updated = bookmarks.filter((slug: string) => slug !== episode.slug);
      localStorage.setItem('episode-bookmarks', JSON.stringify(updated));
    } else {
      bookmarks.push(episode.slug);
      localStorage.setItem('episode-bookmarks', JSON.stringify(bookmarks));
    }
  };

  useEffect(() => {
    // Check if episode is bookmarked
    const bookmarks = JSON.parse(localStorage.getItem('episode-bookmarks') || '[]');
    setBookmarked(bookmarks.includes(episode.slug));
  }, [episode.slug]);

  return (
    <div className={`social-share ${className}`}>
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLike}
          className={`p-2 rounded-full transition-colors ${liked
              ? 'bg-red-500/20 text-red-400'
              : 'bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-400'
            }`}
          aria-label={liked ? 'Unlike episode' : 'Like episode'}
        >
          {liked ? <HeartHandshake className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBookmark}
          className={`p-2 rounded-full transition-colors ${bookmarked
              ? 'bg-accent/20 text-accent'
              : 'bg-muted/50 text-muted-foreground hover:bg-accent/10 hover:text-accent'
            }`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark episode'}
        >
          {bookmarked ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          aria-label="Share episode"
        >
          <Share2 className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Share Options */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 bg-background/90 backdrop-blur-xl border border-border/50 rounded-xl p-3 shadow-2xl min-w-48"
          >
            <div className="space-y-2">
              {shareOptions.map((option, index) => (
                <motion.button
                  key={option.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleShare(option)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors ${option.color}`}
                >
                  {option.icon}
                  <span className="text-sm font-medium">{option.name}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BookmarkManagerProps {
  className?: string;
}

export function BookmarkManager({ className = '' }: BookmarkManagerProps) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedBookmarks = JSON.parse(localStorage.getItem('episode-bookmarks') || '[]');
    setBookmarks(savedBookmarks);
  }, []);

  const removeBookmark = (slug: string) => {
    const updated = bookmarks.filter(s => s !== slug);
    setBookmarks(updated);
    localStorage.setItem('episode-bookmarks', JSON.stringify(updated));
  };

  return (
    <div className={`bookmark-manager ${className}`}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        aria-label={`Bookmarks (${bookmarks.length})`}
      >
        <Bookmark className="h-4 w-4" />
        {bookmarks.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {bookmarks.length}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 bg-background/90 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-2xl min-w-64 max-w-80"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Bookmarks</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No bookmarks yet
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bookmarks.map((slug, index) => (
                  <motion.div
                    key={slug}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <a
                      href={`/episodes/${slug}`}
                      className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors truncate"
                    >
                      <LinkIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{slug.replace(/-/g, ' ')}</span>
                    </a>
                    <button
                      onClick={() => removeBookmark(slug)}
                      className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      aria-label={`Remove bookmark for ${slug}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface EngagementStatsProps {
  className?: string;
}

export function EngagementStats({ className = '' }: EngagementStatsProps) {
  const [stats, setStats] = useState({
    views: Math.floor(Math.random() * 1000) + 100,
    likes: Math.floor(Math.random() * 50) + 10,
    shares: Math.floor(Math.random() * 20) + 5,
    bookmarks: Math.floor(Math.random() * 15) + 3
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        views: prev.views + Math.floor(Math.random() * 3),
        likes: prev.likes + (Math.random() > 0.9 ? 1 : 0),
        shares: prev.shares + (Math.random() > 0.95 ? 1 : 0),
        bookmarks: prev.bookmarks + (Math.random() > 0.98 ? 1 : 0)
      }));
    }, 5000);

    // Show stats after a delay
    const timer = setTimeout(() => setIsVisible(true), 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`engagement-stats ${className}`}
        >
          <div className="bg-background/90 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Engagement
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{stats.views}</div>
                <div className="text-xs text-muted-foreground">Views</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-400">{stats.likes}</div>
                <div className="text-xs text-muted-foreground">Likes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-accent">{stats.shares}</div>
                <div className="text-xs text-muted-foreground">Shares</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{stats.bookmarks}</div>
                <div className="text-xs text-muted-foreground">Saves</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
