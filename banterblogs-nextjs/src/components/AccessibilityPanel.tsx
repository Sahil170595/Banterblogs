'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Eye, EyeOff, Volume2, VolumeX, Settings, X } from 'lucide-react';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  screenReader: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilityPanelProps {
  className?: string;
}

export function AccessibilityPanel({ className = '' }: AccessibilityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
    screenReader: false,
    keyboardNavigation: true
  });

  useEffect(() => {
    // Apply accessibility settings to document
    const root = document.documentElement;
    
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    root.style.fontSize = settings.fontSize === 'small' ? '14px' : 
                         settings.fontSize === 'large' ? '18px' : '16px';

    if (settings.screenReader) {
      root.setAttribute('aria-live', 'polite');
    } else {
      root.removeAttribute('aria-live');
    }
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K, 
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-3 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl text-foreground hover:bg-background transition-colors ${className}`}
        aria-label="Accessibility settings"
      >
        <Settings className="h-5 w-5" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-50 bg-background/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-6 w-80"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Accessibility
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close accessibility panel"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">High Contrast</span>
                </div>
                <button
                  onClick={() => updateSetting('highContrast', !settings.highContrast)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.highContrast ? 'bg-primary' : 'bg-muted'
                  }`}
                  aria-label={`${settings.highContrast ? 'Disable' : 'Enable'} high contrast`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Reduced Motion */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Reduce Motion</span>
                </div>
                <button
                  onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.reducedMotion ? 'bg-primary' : 'bg-muted'
                  }`}
                  aria-label={`${settings.reducedMotion ? 'Disable' : 'Enable'} reduced motion`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Font Size */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-foreground">Font Size</span>
                </div>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting('fontSize', size)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        settings.fontSize === size
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen Reader */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <VolumeX className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Screen Reader</span>
                </div>
                <button
                  onClick={() => updateSetting('screenReader', !settings.screenReader)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.screenReader ? 'bg-primary' : 'bg-muted'
                  }`}
                  aria-label={`${settings.screenReader ? 'Disable' : 'Enable'} screen reader support`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.screenReader ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <h4 className="text-sm font-semibold text-foreground mb-3">Keyboard Shortcuts</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Navigate sections</span>
                  <div className="flex gap-1">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">ArrowUp</kbd>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">ArrowDown</kbd>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Jump to content</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Close panels</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Toggle actions</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Space</kbd>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface KeyboardNavigationProps {
  children: ReactNode;
}

export function KeyboardNavigation({ children }: KeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const currentIndex = Array.from(focusableElements).findIndex(
        el => el === document.activeElement
      );

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight': {
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % focusableElements.length;
          (focusableElements[nextIndex] as HTMLElement)?.focus();
          break;
        }

        case 'ArrowUp':
        case 'ArrowLeft': {
          event.preventDefault();
          const prevIndex =
            currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
          (focusableElements[prevIndex] as HTMLElement)?.focus();
          break;
        }

        case 'Home': {
          event.preventDefault();
          (focusableElements[0] as HTMLElement)?.focus();
          break;
        }

        case 'End': {
          event.preventDefault();
          (focusableElements[focusableElements.length - 1] as HTMLElement)?.focus();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="keyboard-navigation">
      {children}
    </div>
  );
}

interface FocusIndicatorProps {
  className?: string;
}

export function FocusIndicator({ className = '' }: FocusIndicatorProps) {
  return (
    <div className={`focus-indicator ${className}`}>
      <style jsx>{`
        .focus-indicator :global(*) {
          outline: none;
        }
        
        .focus-indicator :global(*:focus-visible) {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
          border-radius: 4px;
        }
        
        .keyboard-navigation :global(button:focus-visible),
        .keyboard-navigation :global([href]:focus-visible),
        .keyboard-navigation :global(input:focus-visible),
        .keyboard-navigation :global(select:focus-visible),
        .keyboard-navigation :global(textarea:focus-visible) {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2);
        }
      `}</style>
    </div>
  );
}
