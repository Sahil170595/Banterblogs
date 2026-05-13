'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Char-by-char typewriter for scene narration beats.
 *
 * - Renders VISIBLE output only (aria-hidden). The screen-reader live
 *   region must live in the PARENT, OUTSIDE any AnimatePresence wrapper
 *   that toggles the typewriter — otherwise the live region gets
 *   unmounted/remounted per beat and announcements stop firing. This
 *   is playbook §10 sin #17.
 * - Single in-flight timer handle (not an unbounded array).
 * - Punctuation-aware delays: 110ms on `.?!`, 55ms on `,;`, 9ms default.
 *   Tunable via the `paceMs` prop.
 * - prefers-reduced-motion renders the full text immediately.
 */
export function Typewriter({
  text,
  reducedMotion,
  paceMs = 9,
  punctuationPauseMs = 110,
  commaPauseMs = 55,
}: {
  text: string;
  reducedMotion: boolean;
  paceMs?: number;
  punctuationPauseMs?: number;
  commaPauseMs?: number;
}) {
  const [shown, setShown] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (reducedMotion) {
      setShown(text);
      return () => {};
    }

    setShown('');
    let idx = 0;
    let stopped = false;
    function tick() {
      if (stopped) return;
      if (idx >= text.length) return;
      idx += 1;
      setShown(text.slice(0, idx));
      const ch = text[idx - 1];
      const delay =
        ch === '.' || ch === '?' || ch === '!'
          ? punctuationPauseMs
          : ch === ',' || ch === ';'
          ? commaPauseMs
          : paceMs;
      timerRef.current = setTimeout(tick, delay);
    }
    timerRef.current = setTimeout(tick, 40);
    return () => {
      stopped = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, reducedMotion, paceMs, punctuationPauseMs, commaPauseMs]);

  return (
    <span aria-hidden>
      {shown}
      {!reducedMotion && shown.length < text.length && (
        <span className="inline-block w-[0.5ch] -mb-0.5 ml-0.5 bg-primary animate-pulse">&nbsp;</span>
      )}
    </span>
  );
}

/**
 * Persistent screen-reader live region for the current narration text.
 * Render this OUTSIDE any AnimatePresence wrapper so it survives every
 * beat transition. Updates as `text` changes.
 *
 * Pairs with Typewriter — Typewriter handles the visible (aria-hidden)
 * char-by-char animation; this handles the SR announcement.
 */
export function NarrationLiveRegion({ text }: { text: string }) {
  return (
    <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
    </span>
  );
}
