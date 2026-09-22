'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ENTRANCE_ATTRIBUTE } from './prePaint';

/**
 * Closes the first-load entrance window on the first client-side navigation.
 * The route and its new page commit together, and a layout effect runs before
 * that commit paints, so the next page's entrance groups never start.
 */
export function EntranceWindow() {
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useLayoutEffect(() => {
    if (pathname !== firstPath.current) document.documentElement.removeAttribute(ENTRANCE_ATTRIBUTE);
  }, [pathname]);
  return null;
}
