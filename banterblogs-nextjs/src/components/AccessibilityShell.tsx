'use client';

import { type ReactNode } from 'react';

// Lightweight a11y wrappers — no framer-motion, no lucide.
// Loaded eagerly in the root layout. The heavy AccessibilityPanel UI
// (settings modal with motion + icons) lives in AccessibilityPanel.tsx
// and is lazy-loaded so it does not ship in the initial page bundle.

interface KeyboardNavigationProps {
  children: ReactNode;
}

// Container wrapper. Earlier revisions hijacked all arrow-key/Home/End
// presses on the document (event.preventDefault on every key), which
// silently broke arrow-scrolling, <select> nav, and text-input cursor
// movement. The class hook is preserved so FocusIndicator's :global
// selectors still target focusable descendants.
export function KeyboardNavigation({ children }: KeyboardNavigationProps) {
  return <div className="keyboard-navigation">{children}</div>;
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
