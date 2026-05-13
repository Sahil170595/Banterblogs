'use client';

// Lightweight reader-comfort panel. Earlier revisions also surfaced
// "High contrast", "Reduce motion", and "Screen reader" toggles —
// none of which had CSS hooks or runtime behaviour and so were doing
// nothing for users. Removed. The site already honours the OS-level
// `prefers-reduced-motion` media query via Framer Motion's
// `useReducedMotion()`, and the FocusIndicator (see
// `AccessibilityShell.tsx`) provides the visible keyboard-focus ring.
//
// What remains: a font-size override, the only setting here that ever
// actually moved a pixel.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Settings, X } from 'lucide-react';

type FontSize = 'small' | 'medium' | 'large';

interface AccessibilityPanelProps {
  className?: string;
}

export function AccessibilityPanel({ className = '' }: AccessibilityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  useEffect(() => {
    document.documentElement.style.fontSize =
      fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px';
  }, [fontSize]);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-50 p-3 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl text-foreground hover:bg-background transition-colors ${className}`}
        aria-label="Reader settings"
      >
        <Settings className="h-5 w-5" aria-hidden />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            role="dialog"
            aria-label="Reader settings"
            className="fixed bottom-20 right-6 z-50 bg-background/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-6 w-72"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Type className="h-5 w-5" aria-hidden />
                Reader Settings
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Type className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-sm font-medium text-foreground">Font Size</span>
            </div>
            <div className="flex gap-2" role="radiogroup" aria-label="Font size">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  role="radio"
                  aria-checked={fontSize === size}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    fontSize === size
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>

            <p className="mt-4 pt-4 border-t border-border/50 text-[11px] text-muted-foreground/80 leading-relaxed">
              Motion and contrast follow your OS settings — reduce-motion is honoured automatically,
              and the site renders against the high-contrast Obsidian palette by default.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
