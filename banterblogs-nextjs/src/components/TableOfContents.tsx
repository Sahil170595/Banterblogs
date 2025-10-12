'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  Hash, 
  Eye, 
  EyeOff,
  BookOpen,
  Target
} from 'lucide-react';

interface TableOfContentsProps {
  content: string;
  className?: string;
}

interface TocItem {
  id: string;
  title: string;
  level: number;
  element: HTMLElement;
}

export function TableOfContents({ content, className = '' }: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Extract headings from content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const items: TocItem[] = [];
    
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;
      
      items.push({
        id,
        title: heading.textContent || '',
        level: parseInt(heading.tagName.charAt(1)),
        element: heading as HTMLElement
      });
    });
    
    setTocItems(items);

    // Set up intersection observer for active section tracking
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0
      }
    );

    // Observe all headings
    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    // Show TOC after a delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      clearTimeout(timer);
    };
  }, [content]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1:
        return <Hash className="h-3 w-3" />;
      case 2:
        return <Hash className="h-3 w-3" />;
      case 3:
        return <Hash className="h-3 w-3" />;
      default:
        return <ChevronRight className="h-3 w-3" />;
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'text-primary';
      case 2:
        return 'text-accent';
      case 3:
        return 'text-green-400';
      case 4:
        return 'text-blue-400';
      case 5:
        return 'text-purple-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (tocItems.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className={`fixed left-6 top-1/2 transform -translate-y-1/2 z-30 hidden xl:block ${className}`}
        >
          <div className="bg-background/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl max-w-xs">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Contents</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              >
                {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </motion.button>
            </div>

            {/* Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-1">
                      {tocItems.map((item, index) => (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => scrollToHeading(item.id)}
                          className={`w-full text-left p-2 rounded-lg transition-all duration-200 ${
                            activeId === item.id
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                          }`}
                          style={{ paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem` }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={getLevelColor(item.level)}>
                              {getLevelIcon(item.level)}
                            </div>
                            <span className="text-sm font-medium truncate">
                              {item.title}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress Indicator */}
            <div className="p-4 border-t border-border/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Reading Progress</span>
                <span>{Math.round((tocItems.findIndex(item => item.id === activeId) + 1) / tocItems.length * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  style={{ 
                    width: `${(tocItems.findIndex(item => item.id === activeId) + 1) / tocItems.length * 100}%` 
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ContentHighlighterProps {
  content: string;
  searchTerm?: string;
  className?: string;
}

export function ContentHighlighter({ content, searchTerm, className = '' }: ContentHighlighterProps) {
  const [highlightedContent, setHighlightedContent] = useState(content);

  useEffect(() => {
    if (!searchTerm) {
      setHighlightedContent(content);
      return;
    }

    // Create a regex pattern for the search term
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    
    // Replace the content with highlighted version
    const highlighted = content.replace(regex, '<mark class="search-highlight">$1</mark>');
    setHighlightedContent(highlighted);
  }, [content, searchTerm]);

  return (
    <div 
      className={`content-highlighter ${className}`}
      dangerouslySetInnerHTML={{ __html: highlightedContent }}
    />
  );
}

type ContentSearchHandler = (value: string) => void; // eslint-disable-line no-unused-vars

interface ContentSearchProps {
  onSearch: ContentSearchHandler;
  className?: string;
}

export function ContentSearch({ onSearch, className = '' }: ContentSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch(term);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className={`content-search ${className}`}
    >
      <div className="relative">
        <input
          type="text"
          placeholder="Search in content..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsVisible(true)}
          onBlur={() => setTimeout(() => setIsVisible(false), 200)}
          className="w-full px-4 py-2 pl-10 pr-10 bg-background/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
        />
        
        <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        {searchTerm && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
          >
            ×
          </motion.button>
        )}
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {isVisible && searchTerm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-2 p-3 bg-background/90 border border-border/50 rounded-lg backdrop-blur"
          >
            <div className="text-sm text-muted-foreground">
              Searching for: <span className="text-primary font-medium">&ldquo;{searchTerm}&rdquo;</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
