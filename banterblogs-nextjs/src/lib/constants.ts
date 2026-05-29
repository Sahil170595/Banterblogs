/**
 * Application constants and URLs
 */

export const GITHUB_URLS = {
  // Identity / nav GitHub links should point at the profile README, not this repo
  PROFILE: 'https://github.com/Sahil170595',
  BANTERBLOGS: 'https://github.com/Sahil170595/Banterblogs',
  CHIMERAFORGE: 'https://github.com/Sahil170595/Chimeraforge',
  // Banterpacks repository is private
} as const;

export const PYPI_URL = 'https://pypi.org/project/chimeraforge/' as const;

export const SITE_URLS = {
  HOME: '/',
  EPISODES: '/episodes',
  ABOUT: '/about',
  TAGS: '/tags',
} as const;

export const EXTERNAL_LINKS = {
  TWITTER: 'https://twitter.com/sahilkadadekar',
  LINKEDIN: 'https://linkedin.com/in/sahilkadadekar',
} as const;

/**
 * Research-program headline counts — single source of truth.
 * Bump these when Banterhearts BANTERHEARTS_MEASUREMENT_COUNT.md changes;
 * every public surface (Hero, RoadmapRail, SystemsShowcase, /about, /papers,
 * /platform, /reports, /reports/compendium, /work, llms.txt, rss.xml) imports
 * these constants instead of carrying its own literal copy.
 */
export const MEASUREMENTS = {
  /** Long-form display, e.g. metadata descriptions and prose. Mirrors Banterhearts canonical exactly. */
  DISPLAY: '1,041,000+',
  /** Short-form display for stat tiles and pills (1.041M rounds to 1.04M; floor still holds). */
  SHORT: '1.04M+',
} as const;

export const REPORTS = {
  /**
   * Headline technical-report count. Ground-truthed from `ls PublishReady/reports/Technical_Report_*.md`
   * minus conclusive/whitepaper/appendices entries on 2026-05-28.
   *
   * 45 = TR108-TR148 (41) + TR117_multi_agent variant + TR138 Study D Addendum + TR149 + TR152.
   *
   * Prior "48" was a 3-report inflation inherited from a stale baseline and propagated through
   * the TR149+TR152 sync commit (9984bc8). The auto-generated /reports.json manifest's
   * counts.technical_reports filter (phase-bucket entries) is the canonical check — they must match.
   */
  COUNT: 45,
  DISPLAY: '45',
} as const;

export const SITE_CONFIG = {
  NAME: 'Chimeraforge',
  DESCRIPTION: `Personal AI platform running on your hardware — local inference, constitutional AI governance, and ${MEASUREMENTS.SHORT} research measurements.`,
  AUTHOR: 'Sahil Kadadekar',
  TWITTER_HANDLE: '@sahilkadadekar',
} as const;
