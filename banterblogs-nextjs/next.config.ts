import type { NextConfig } from "next";

// Conclusive reports were renamed from TR-range slugs (108-116, 117-122, etc.)
// to integer-clean Phase-N slugs (Phase1, Phase2, ...) in commit 0afab79.
// 15 permanent redirects to preserve external links, Google index entries, and
// bookmarks for /reports/technical-report-conclusive-{108-116,117-122,123-133,
// 134-137,138-143}{,-extended-appendices,-whitepaper}.
const CONCLUSIVE_REDIRECTS = [
  ['108-116', 'phase1'],
  ['117-122', 'phase2'],
  ['123-133', 'phase3'],
  ['134-137', 'phase4'],
  ['138-143', 'phase5'],
].flatMap(([oldRange, newPhase]) =>
  ['', '-extended-appendices', '-whitepaper'].map((suffix) => ({
    source: `/reports/technical-report-conclusive-${oldRange}${suffix}`,
    destination: `/reports/technical-report-conclusive-${newPhase}${suffix}`,
    permanent: true,
  }))
);

// /benchmarks, /roadmap, and /technology were `redirect()` page stubs (307 at
// runtime); they are redirects proper now, so the destination is cacheable.
const STUB_ROUTE_REDIRECTS = [
  { source: '/benchmarks', destination: '/reports', permanent: true },
  { source: '/roadmap', destination: '/platform', permanent: true },
  { source: '/technology', destination: '/platform', permanent: true },
];

// The scrollable overview that predates the galactic landing.
const RETIRED_ROUTE_REDIRECTS = [{ source: '/home', destination: '/', permanent: true }];

// The landing poster files carry a content hash in their names
// (scripts/render-scene-poster.mjs), so a new render is a new URL and the
// phone's LCP image never needs revalidating on a repeat visit.
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // inlineCss stays off (measured in R4): it sends the global sheet twice
    // per HTML response (<style> and the RSC payload, about +57 KB gzip on
    // every page, uncached), slowed a warm navigation (88 -> 109 ms), and
    // scored no better in local Lighthouse mobile (medians 84/92/91/90 against
    // 92/93/92/91 on /papers, /platform, /episodes and TR138).
  },
  async redirects() {
    return [...CONCLUSIVE_REDIRECTS, ...STUB_ROUTE_REDIRECTS, ...RETIRED_ROUTE_REDIRECTS];
  },
  async headers() {
    return [{ source: '/landing/poster/:file', headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE }] }];
  },
};

export default nextConfig;
