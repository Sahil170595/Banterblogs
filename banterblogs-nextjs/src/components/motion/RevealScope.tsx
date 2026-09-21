'use client';

import { createElement, useCallback } from 'react';
import { armRevealScope } from './revealObserver';

type ScopeTag = 'div' | 'section' | 'article';

export interface RevealScopeProps {
  as?: ScopeTag;
  className?: string;
  /** server HTML whose reveal targets carry REVEAL_TARGET */
  html: string;
}

/**
 * Renders server HTML exactly as given and fades up, the first time each
 * scrolls into view, the reveal targets marked in it: <Reveal>'s states and
 * shared observer for markup React only sets as a string, so the whole block
 * hydrates as one element. The server renders every target at rest;
 * revealObserver.ts decides whether it is held back.
 */
export function RevealScope({ as = 'div', className, html }: RevealScopeProps) {
  // stable, so it runs on mount and its cleanup on unmount only
  const attach = useCallback((el: HTMLElement | null) => (el ? armRevealScope(el) : undefined), []);
  return createElement(as, { ref: attach, className, dangerouslySetInnerHTML: { __html: html } });
}
