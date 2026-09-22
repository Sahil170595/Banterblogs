'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentProps, type FocusEvent, type PointerEvent } from 'react';
import { recedeAround } from '@/components/motion/navRecede';

export type IntentLinkProps = Omit<ComponentProps<typeof Link>, 'prefetch' | 'ref' | 'onNavigate'>;

/**
 * A navigation that has not replaced the page by then did not happen, or led
 * back to this same page: the page comes back. Prefetched pages replace it
 * within a few hundred milliseconds.
 */
export const NAV_RECEDE_RESET_MS = 2000;

/**
 * A list or card link that prefetches its page on intent, not on sight: the
 * first time the pointer rests on it, it takes focus, or it is pressed (the
 * floor for a tap or a click with no hover). Viewport prefetch fetched every
 * row a dense list scrolled past and decoded those payloads mid-scroll. From
 * then on it is Next's own prefetch (`prefetch={null}`), so a full static
 * page arrives, and later hovers re-prefetch at intent priority.
 *
 * When it is followed, the page it leaves answers at once: everything but
 * the link (or its card's figure) recedes while the next page is rendered.
 * It also lets go of focus, because removing a focused element makes the
 * browser restyle the whole leaving page inside the transition; focus lands
 * on the document either way.
 */
export function IntentLink({ onPointerEnter, onPointerDown, onFocus, ...props }: IntentLinkProps) {
  const [intent, setIntent] = useState(false);
  const anchor = useRef<HTMLAnchorElement>(null);
  const leaving = useRef<{ undo: () => void; timer: number } | null>(null);

  const comeBack = () => {
    if (!leaving.current) return;
    window.clearTimeout(leaving.current.timer);
    leaving.current.undo();
    leaving.current = null;
  };
  // the page is usually gone with this link; if not, nothing stays receded
  useEffect(() => comeBack, []);

  return (
    <Link
      {...props}
      ref={anchor}
      prefetch={intent ? null : false}
      onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onPointerEnter?.(event);
      }}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onPointerDown?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onNavigate={() => {
        const link = anchor.current;
        if (link === null) return;
        comeBack();
        leaving.current = { undo: recedeAround(link), timer: window.setTimeout(comeBack, NAV_RECEDE_RESET_MS) };
        if (document.activeElement === link) link.blur();
      }}
    />
  );
}
