'use client';

// Reader-comfort panel: a root font-size override, the one reader setting
// that ever moved a pixel. Fetched on intent by the footer launcher
// (AccessibilityPanelClient.tsx) and animated with CSS transitions, so no
// page pays for it up front. Motion follows the OS prefers-reduced-motion
// setting site-wide; the keyboard focus ring lives in globals.css.

import { useEffect, useRef, useState } from 'react';
import { Type, X } from 'lucide-react';

export type FontSize = 'small' | 'medium' | 'large';

// Also read by the pre-paint script in app/layout.tsx; keep the two in step
// (pinned by readerSettings.test.tsx).
export const FONT_SIZE_STORAGE_KEY = 'chimeraforge:reader-font-size';
// Percentages scale from the visitor's browser default instead of pinning
// 16px; medium IS that default, so it writes nothing.
export const FONT_SIZE_SCALE: Record<Exclude<FontSize, 'medium'>, string> = {
  small: '87.5%',
  large: '112.5%',
};
const FONT_SIZES: readonly FontSize[] = ['small', 'medium', 'large'];

export function applyFontSize(size: FontSize): void {
  const style = document.documentElement.style;
  if (size === 'medium') style.removeProperty('font-size');
  else style.fontSize = FONT_SIZE_SCALE[size];
}

export function readStoredFontSize(): FontSize {
  try {
    const stored = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return stored === 'small' || stored === 'large' ? stored : 'medium';
  } catch (error) {
    console.warn('[reader-settings] stored font size unavailable', error);
    return 'medium';
  }
}

function storeFontSize(size: FontSize): void {
  try {
    if (size === 'medium') window.localStorage.removeItem(FONT_SIZE_STORAGE_KEY);
    else window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
  } catch (error) {
    console.warn('[reader-settings] could not persist font size', error);
  }
}

export interface AccessibilityPanelProps {
  id: string;
  open: boolean;
  onClose: () => void;
}

export function AccessibilityPanel({ id, open, onClose }: AccessibilityPanelProps) {
  const [fontSize, setFontSize] = useState<FontSize>(readStoredFontSize);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Dialog focus contract: move focus in on open, trap Tab inside, close on
  // Escape (onClose hands focus back to the launcher) — without this the
  // role="dialog" announcement lies to screen-reader users.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, [tabindex]:not([tabindex="-1"])'));
    focusables()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const choose = (size: FontSize) => {
    setFontSize(size);
    applyFontSize(size);
    storeFontSize(size);
  };

  return (
    <div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Reader settings"
      // stays mounted so the close transition can run; closed = faded out
      // and inert (unfocusable, hidden from assistive tech)
      inert={open ? undefined : true}
      className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 w-72 max-w-[calc(100vw-2rem)] origin-bottom-right rounded-xl border border-border/50 bg-background/90 p-6 shadow-2xl backdrop-blur-xl transition-[opacity,transform] duration-base ease-standard sm:right-6 ${
        open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-1 scale-[0.98] opacity-0'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Type className="h-5 w-5" aria-hidden />
          Reader Settings
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
          aria-label="Close reader settings"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Type className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-sm font-medium text-foreground">Font Size</span>
      </div>
      <div className="flex gap-2" role="group" aria-label="Font size">
        {FONT_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => choose(size)}
            aria-pressed={fontSize === size}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-fast ease-standard ${
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
    </div>
  );
}
