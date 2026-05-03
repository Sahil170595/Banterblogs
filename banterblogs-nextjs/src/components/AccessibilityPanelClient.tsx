'use client';

import dynamic from 'next/dynamic';

// Thin client wrapper around the heavy AccessibilityPanel so the lazy
// import (`ssr: false`) works under Next.js 16 App Router, which forbids
// `ssr: false` in server-component layouts.
//
// Effect: framer-motion + lucide icons used by AccessibilityPanel are
// pulled out of the initial site bundle and only fetched if/when this
// component actually renders on the client.
const AccessibilityPanel = dynamic(
  () => import('./AccessibilityPanel').then((m) => m.AccessibilityPanel),
  { ssr: false },
);

export function AccessibilityPanelClient() {
  return <AccessibilityPanel />;
}
