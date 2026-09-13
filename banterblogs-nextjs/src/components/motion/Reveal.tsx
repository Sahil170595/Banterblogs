'use client';

import { createElement, useCallback, type CSSProperties, type ReactNode } from 'react';
import { armReveal, REVEAL_ATTRIBUTE } from './revealObserver';

type RevealTag = 'div' | 'li' | 'section' | 'article';

export interface RevealProps {
  as?: RevealTag;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  [dataAttribute: `data-${string}`]: string | undefined;
}

/**
 * Fades its content up 8px the first time it scrolls into view. The server
 * renders it visible; revealObserver.ts decides whether it is held back.
 */
export function Reveal({ as = 'div', className, style, children, ...data }: RevealProps) {
  // stable, so it runs on mount and its cleanup on unmount only
  const attach = useCallback((el: HTMLElement | null) => (el ? armReveal(el) : undefined), []);
  return createElement(as, { ref: attach, [REVEAL_ATTRIBUTE]: '', className, style, ...data }, children);
}
