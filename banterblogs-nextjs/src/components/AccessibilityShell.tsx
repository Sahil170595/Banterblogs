'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Lightweight a11y wrappers — no framer-motion, no lucide.
// Loaded eagerly in the root layout. The heavy AccessibilityPanel UI
// (settings modal with motion + icons) lives in AccessibilityPanel.tsx
// and is lazy-loaded so it does not ship in the initial page bundle.

interface KeyboardNavigationProps {
  children: ReactNode;
}

export function KeyboardNavigation({ children }: KeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      const currentIndex = Array.from(focusableElements).findIndex(
        (el) => el === document.activeElement,
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
