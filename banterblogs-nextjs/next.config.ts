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

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async redirects() {
    return [...CONCLUSIVE_REDIRECTS, ...STUB_ROUTE_REDIRECTS];
  },
};

export default nextConfig;
