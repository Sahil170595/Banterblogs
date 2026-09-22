'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentProps, type FocusEvent, type PointerEvent } from 'react';
import { NAV_RECEDE_RESET_MS, announceNavigation, recedeAround } from '@/components/motion/navRecede';
import { afterFirstPaint } from './afterFirstPaint';

export { NAV_RECEDE_RESET_MS };

export type IntentLinkProps = Omit<ComponentProps<typeof Link>, 'prefetch' | 'ref' | 'onNavigate'> & {
  /** also prefetch once the page has painted and gone idle (primary links) */
  warm?: boolean;
};

/**
 * How long a pointer rests on the link, or a finger stays on it without
 * scrolling, before its page is prefetched. The page scrolling under the
 * pointer calls the wait off, so a scroll never prefetches what it passes; a
 * reader who hovers before clicking rests longer, so the page is in hand by
 * the click.
 */
export const INTENT_DWELL_MS = 100;

// any scroller, window or element; never blocks the scroll
const SCROLL_LISTENER = { capture: true, passive: true } as const;

const isMouse = (event: PointerEvent) => event.pointerType === 'mouse';

/**
 * A link that prefetches its page on intent, not on sight: once the mouse has
 * rested on it, it takes focus, a mouse presses it, or a finger lifts from it
 * (or stays on it) without the browser taking the touch over as a scroll.
 * Viewport prefetch fetched every row a dense list scrolled past and decoded
 * those payloads mid-scroll. From then on it is Next's own prefetch
 * (`prefetch={null}`), so a full static page arrives, and later hovers
 * re-prefetch at intent priority. A warm link also turns it on once the page
 * has painted and gone idle.
 *
 * When it is followed, the page it leaves answers at once: everything but
 * the link (or its card's figure) recedes while the next page is rendered,
 * and the page hears that a navigation began. It also lets go of focus,
 * because removing a focused element makes the browser restyle the whole
 * leaving page inside the transition; focus lands on the document either way.
 */
export function IntentLink({
  warm = false,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onFocus,
  ...props
}: IntentLinkProps) {
  const [intent, setIntent] = useState(false);
  const anchor = useRef<HTMLAnchorElement>(null);
  const leaving = useRef<{ undo: () => void; timer: number } | null>(null);
  // cancels the dwell in progress
  const dwell = useRef<(() => void) | null>(null);

  const comeBack = () => {
    if (!leaving.current) return;
    window.clearTimeout(leaving.current.timer);
    leaving.current.undo();
    leaving.current = null;
  };
  const settle = () => {
    dwell.current?.();
    dwell.current = null;
  };
  const intend = () => {
    settle();
    setIntent(true);
  };
  const rest = () => {
    if (intent || dwell.current) return;
    const timer = window.setTimeout(intend, INTENT_DWELL_MS);
    document.addEventListener('scroll', settle, SCROLL_LISTENER);
    dwell.current = () => {
      window.clearTimeout(timer);
      document.removeEventListener('scroll', settle, SCROLL_LISTENER);
    };
  };

  // the page is usually gone with this link; if not, nothing stays receded
  // and no dwell outlives it
  useEffect(
    () => () => {
      comeBack();
      settle();
    },
    [],
  );

  useEffect(() => (warm && !intent ? afterFirstPaint(() => setIntent(true)) : undefined), [warm, intent]);

  return (
    <Link
      {...props}
      ref={anchor}
      prefetch={intent ? null : false}
      onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
        // a finger enters as it lands; its press decides
        if (event.pointerType !== 'touch') rest();
        onPointerEnter?.(event);
      }}
      onPointerMove={(event: PointerEvent<HTMLAnchorElement>) => {
        // a pointer that moves again after a scroll called its dwell off
        if (event.pointerType !== 'touch') rest();
        onPointerMove?.(event);
      }}
      onPointerLeave={(event: PointerEvent<HTMLAnchorElement>) => {
        settle();
        onPointerLeave?.(event);
      }}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        // a touch may yet become a scroll; a mouse press is a click on its way
        if (isMouse(event)) intend();
        else rest();
        onPointerDown?.(event);
      }}
      onPointerUp={(event: PointerEvent<HTMLAnchorElement>) => {
        // lifted before the dwell without scrolling: a tap
        if (!isMouse(event) && dwell.current) intend();
        onPointerUp?.(event);
      }}
      onPointerCancel={(event: PointerEvent<HTMLAnchorElement>) => {
        // the browser took the touch over as a scroll
        settle();
        onPointerCancel?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        intend();
        onFocus?.(event);
      }}
      onNavigate={() => {
        announceNavigation();
        const link = anchor.current;
        if (link === null) return;
        comeBack();
        leaving.current = { undo: recedeAround(link), timer: window.setTimeout(comeBack, NAV_RECEDE_RESET_MS) };
        if (document.activeElement === link) link.blur();
      }}
    />
  );
}
