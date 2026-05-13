'use client';

import { Play, Pause, RotateCcw } from 'lucide-react';

/**
 * Play / Pause / Restart button trio for scene walkthroughs.
 *
 * Aria-labeled, keyboard-focusable with visible ring. The icons are
 * decorative (aria-hidden) — the button's aria-label carries the
 * meaning.
 */
export function PlaybackControls({
  playing,
  onToggle,
  onRestart,
}: {
  playing: boolean;
  onToggle: () => void;
  onRestart: () => void;
}) {
  const btn =
    'rounded border border-border/50 hover:border-border bg-background/60 p-2 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className={btn}
        aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
      >
        {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
      </button>
      <button onClick={onRestart} className={btn} aria-label="Restart walkthrough">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
