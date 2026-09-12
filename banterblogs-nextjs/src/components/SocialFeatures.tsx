'use client';

import { useState, useEffect, type ReactNode } from 'react';
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

interface ShareOption {
  name: string;
  icon: ReactNode;
  color: string;
  url?: string;
  action?: 'copy';
}

const BOOKMARKS_KEY = 'episode-bookmarks';
const LIKES_KEY = 'episode-likes';

// Popovers stay mounted so they can enter and exit in CSS on the overlay
// tokens; closed, they are inert and ignore the pointer.
const POPOVER_CLASS =
  'absolute bottom-full right-0 mb-2 origin-bottom-right bg-background/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl transition-[opacity,transform] duration-base ease-standard';
const popoverState = (open: boolean) =>
  open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-1 scale-[0.98] opacity-0';
const ICON_BUTTON_CLASS = 'p-2 rounded-full transition-colors duration-fast ease-standard';

// localStorage JSON can be corrupt (manual edits, old formats) — never let a
// bad value crash the component.
function readSlugList(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch (error) {
    console.error(`[SocialFeatures] corrupt localStorage value for ${key}, resetting:`, error);
    return [];
  }
}

function writeSlugList(key: string, slugs: string[]) {
  localStorage.setItem(key, JSON.stringify(slugs));
}

function toggleSlugInList(key: string, slug: string, present: boolean): void {
  const list = readSlugList(key).filter((s) => s !== slug);
  if (present) list.push(slug);
  writeSlugList(key, list);
}

export function SocialShare({ episode, className = '' }: SocialShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const episodeUrl = `https://chimeraforge.vercel.app/episodes/${episode.slug}`;
  const shareText = `Check out this episode: ${episode.title}`;

  const shareOptions: ShareOption[] = [
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

  const handleShare = async (option: ShareOption) => {
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
    const next = !liked;
    setLiked(next);
    toggleSlugInList(LIKES_KEY, episode.slug, next);
  };

  const handleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    toggleSlugInList(BOOKMARKS_KEY, episode.slug, next);
  };

  useEffect(() => {
    // Hydration-safe localStorage read: the server render can't know client
    // state, so the first client pass must sync it — setState here is the
    // intended pattern, not a cascading-render bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookmarked(readSlugList(BOOKMARKS_KEY).includes(episode.slug));
    setLiked(readSlugList(LIKES_KEY).includes(episode.slug));
  }, [episode.slug]);

  return (
    <div className={`social-share ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleLike}
          className={`${ICON_BUTTON_CLASS} ${liked
              ? 'bg-red-500/20 text-red-400'
              : 'bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-400'
            }`}
          aria-label={liked ? 'Unlike episode' : 'Like episode'}
        >
          {liked ? <HeartHandshake className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={handleBookmark}
          className={`${ICON_BUTTON_CLASS} ${bookmarked
              ? 'bg-accent/20 text-accent'
              : 'bg-muted/50 text-muted-foreground hover:bg-accent/10 hover:text-accent'
            }`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark episode'}
        >
          {bookmarked ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${ICON_BUTTON_CLASS} bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary`}
          aria-label="Share episode"
          aria-expanded={isOpen}
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <div inert={isOpen ? undefined : true} className={`${POPOVER_CLASS} min-w-48 p-3 ${popoverState(isOpen)}`}>
        <div className="space-y-2">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => handleShare(option)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors duration-fast ease-standard ${option.color}`}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.name}</span>
            </button>
          ))}
        </div>
      </div>
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
    // Hydration-safe localStorage read (see SocialShare note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookmarks(readSlugList(BOOKMARKS_KEY));
  }, []);

  const removeBookmark = (slug: string) => {
    const updated = bookmarks.filter(s => s !== slug);
    setBookmarks(updated);
    writeSlugList(BOOKMARKS_KEY, updated);
  };

  return (
    <div className={`bookmark-manager ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${ICON_BUTTON_CLASS} relative bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary`}
        aria-label={`Bookmarks (${bookmarks.length})`}
        aria-expanded={isOpen}
      >
        <Bookmark className="h-4 w-4" />
        {bookmarks.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {bookmarks.length}
          </span>
        )}
      </button>

      <div inert={isOpen ? undefined : true} className={`${POPOVER_CLASS} min-w-64 max-w-80 p-4 ${popoverState(isOpen)}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Bookmarks</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close bookmarks"
            className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {bookmarks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No bookmarks yet
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bookmarks.map((slug) => (
              <div
                key={slug}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors duration-fast ease-standard"
              >
                <a
                  href={`/episodes/${slug}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors duration-fast ease-standard truncate"
                >
                  <LinkIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{slug.replace(/-/g, ' ')}</span>
                </a>
                <button
                  type="button"
                  onClick={() => removeBookmark(slug)}
                  className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors duration-fast ease-standard"
                  aria-label={`Remove bookmark for ${slug}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
