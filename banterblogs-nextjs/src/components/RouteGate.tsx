'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Hides server-rendered children on specific routes. Used to drop the Footer
// on the full-page galactic landing ('/') so header + scene = exactly one
// viewport with no scroll. usePathname resolves during prerender, so the
// landing's static HTML never contains the footer (no flash).

interface RouteGateProps {
  hideOn: string[];
  children: ReactNode;
}

export function RouteGate({ hideOn, children }: RouteGateProps) {
  const pathname = usePathname();
  if (hideOn.includes(pathname)) return null;
  return <>{children}</>;
}
