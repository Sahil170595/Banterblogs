'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { MOTION_ATTRIBUTE } from '@/components/motion/prePaint';

// The tab strip's motion, shared by the archive's phase tabs (ReportTabs) and
// the projects' collection tabs (CollectionTabs). The strip is a .tab-strip
// row; its highlighted copy is a [data-tab-highlight] row (globals.css).

/** --tab-strip-fade (globals.css, R4 a11y): a tab scrolled into view clears the edge fade */
export const TAB_STRIP_FADE_PX = 40;

/**
 * Clips the highlighted copy of the row to the active tab (Emil Kowalski's
 * clip-path technique); globals.css transitions the clip. The first
 * placement lands without a transition, later ones move. Without motion
 * nothing is placed and the active tab keeps its own style and underline.
 */
export function useTabHighlight(
  listRef: RefObject<HTMLElement | null>,
  highlightRef: RefObject<HTMLElement | null>,
  activeKey: string,
  activeSelector: string,
) {
  useLayoutEffect(() => {
    const list = listRef.current;
    const highlight = highlightRef.current;
    if (!list || !highlight || document.documentElement.getAttribute(MOTION_ATTRIBUTE) !== 'on') return undefined;
    const place = () => {
      const tab = list.querySelector<HTMLElement>(activeSelector);
      if (!tab) return;
      highlight.style.setProperty('--highlight-left', `${tab.offsetLeft}px`);
      highlight.style.setProperty('--highlight-right', `${highlight.offsetWidth - tab.offsetLeft - tab.offsetWidth}px`);
      if (list.hasAttribute('data-highlight')) return;
      list.setAttribute('data-highlight', 'placed');
      requestAnimationFrame(() => list.setAttribute('data-highlight', 'live'));
    };
    place();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef, highlightRef, activeKey, activeSelector]);
}

/**
 * Keeps the active tab fully in view in a strip that scrolls sideways, clear
 * of the edge fades. Reads first, then one write; the first placement, and
 * every one without motion, is instant.
 */
export function useActiveTabInView(listRef: RefObject<HTMLElement | null>, activeKey: string, activeSelector: string) {
  const placedRef = useRef(false);
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>(activeSelector);
    if (!list || !tab) return;
    const { scrollLeft, clientWidth, scrollWidth } = list;
    const start = tab.offsetLeft - TAB_STRIP_FADE_PX;
    const end = tab.offsetLeft + tab.offsetWidth + TAB_STRIP_FADE_PX;
    const first = !placedRef.current;
    placedRef.current = true;
    if (scrollWidth <= clientWidth) return;
    const left = start < scrollLeft ? start : end > scrollLeft + clientWidth ? end - clientWidth : scrollLeft;
    if (left === scrollLeft) return;
    const smooth = !first && document.documentElement.getAttribute(MOTION_ATTRIBUTE) === 'on';
    list.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
  }, [listRef, activeKey, activeSelector]);
}
