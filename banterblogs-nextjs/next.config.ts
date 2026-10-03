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

// The scrollable overview that predates the galactic landing; the projects'
// first home under /work, which Gatebound's README links; the browser agent
// page's first name, which Parallax's README links.
const RETIRED_ROUTE_REDIRECTS = [
  { source: '/home', destination: '/', permanent: true },
  { source: '/work/projects', destination: '/projects', permanent: true },
  { source: '/work/projects/flight-routing', destination: '/projects/reinforcement-learning/flight-routing', permanent: true },
  {
    source: '/projects/agents-and-evaluation/workflow-observatory',
    destination: '/projects/agents-and-evaluation/browser-agent-completion',
    permanent: true,
  },
];

// The project catalog reads every project.json under this folder at request
// time in the sitemap route; the files ship with the function.
const PROJECT_FILES = ['./src/app/projects/(demos)/*/*/project.json', './src/app/projects/(demos)/*/*/page.tsx'];

// The landing poster and loop files carry a content hash in their names
// (scripts/render-scene-poster.mjs, render-scene-video.mjs), so a new render
// is a new URL and neither ever needs revalidating on a repeat visit.
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const LANDING_ART_DIRS = ['poster', 'video'];

// Unimported CSS, in bytes, worth one extra stylesheet request (Turbopack's
// default is 20000, which kept a 15 KB demo stylesheet merged into the
// reading chunk shared by every report).
const CSS_REQUEST_COST_BYTES = 4000;

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/sitemap.xml': PROJECT_FILES,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // inlineCss stays off (measured in R4): it sends the global sheet twice
    // per HTML response (<style> and the RSC payload, about +57 KB gzip on
    // every page, uncached), slowed a warm navigation (88 -> 109 ms), and
    // scored no better in local Lighthouse mobile (medians 84/92/91/90 against
    // 92/93/92/91 on /papers, /platform, /episodes and TR138).
    // The default CSS chunking merged a project demo's stylesheet into the
    // reading chunk every report page loads; graph chunking prices that
    // trade, and this cost splits a demo's own CSS out once it outweighs a
    // request, so a page downloads only the CSS it imports.
    cssChunking: { type: 'graph', requestCost: CSS_REQUEST_COST_BYTES },
  },
  async redirects() {
    return [...CONCLUSIVE_REDIRECTS, ...STUB_ROUTE_REDIRECTS, ...RETIRED_ROUTE_REDIRECTS];
  },
  async headers() {
    return LANDING_ART_DIRS.map((dir) => ({
      source: `/landing/${dir}/:file`,
      headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE }],
    }));
  },
};

export default nextConfig;
