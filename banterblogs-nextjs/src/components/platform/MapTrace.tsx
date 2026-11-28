'use client';

import { useCallback, useRef, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { ACTIVE_ATTRIBUTE, LINKS_ATTRIBUTE, LIT_ATTRIBUTE, NODE_ATTRIBUTE, READOUT_ATTRIBUTE } from './mapAttributes';

const NODE = `[${NODE_ATTRIBUTE}]`;

export interface MapTraceProps {
  className?: string;
  /** what the readout says while nothing is traced */
  idle: string;
  children: ReactNode;
}

/**
 * The map's one client island. The drawing inside is server-rendered and
 * complete without it; this lights what a hovered or focused node touches
 * and reads out its role, by writing attributes the stylesheet answers to.
 * It reads no layout: one query for the marked elements, then the writes.
 */
export function MapTrace({ className, idle, children }: MapTraceProps) {
  const root = useRef<HTMLDivElement>(null);

  const trace = useCallback(
    (node: Element | null) => {
      const map = root.current;
      if (!map) return;
      const id = node?.getAttribute(NODE_ATTRIBUTE) ?? null;
      if ((map.getAttribute(ACTIVE_ATTRIBUTE) ?? null) === id) return;
      const marked = [...map.querySelectorAll(`[${LINKS_ATTRIBUTE}]`)];
      const readout = map.querySelector(`[${READOUT_ATTRIBUTE}]`);
      const role = node?.getAttribute('aria-label') ?? idle;
      for (const el of marked) {
        el.toggleAttribute(LIT_ATTRIBUTE, id !== null && (el.getAttribute(LINKS_ATTRIBUTE) ?? '').split(' ').includes(id));
      }
      if (id === null) map.removeAttribute(ACTIVE_ATTRIBUTE);
      else map.setAttribute(ACTIVE_ATTRIBUTE, id);
      if (readout) readout.textContent = role;
    },
    [idle],
  );

  // the node under the pointer, else the one holding focus, else none
  const focused = () => (root.current?.contains(document.activeElement) ? (document.activeElement?.closest(NODE) ?? null) : null);
  const nodeOf = (target: EventTarget) => (target instanceof Element ? target.closest(NODE) : null);

  return (
    <div
      ref={root}
      className={className}
      onPointerOver={(event: PointerEvent) => trace(nodeOf(event.target) ?? focused())}
      onPointerLeave={() => trace(focused())}
      onFocus={(event: FocusEvent) => trace(nodeOf(event.target))}
      onBlur={(event: FocusEvent) => trace(event.relatedTarget ? nodeOf(event.relatedTarget) : null)}
    >
      {children}
    </div>
  );
}
