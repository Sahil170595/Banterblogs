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
  DISPLAY: '1,337,000+',
  /** Short-form display for stat tiles and pills (1.337M rounds to 1.34M; floor still holds). */
  SHORT: '1.34M+',
} as const;

export const REPORTS = {
  /**
   * Headline technical-report count. Ground-truthed from /reports.json manifest on 2026-06-15
   * after the Banterhearts Phase 8/9 sync (TR165, TR164 V3, TR167).
   *
   * 53 = 50 TR-numbered reports + 3 Phase 0 pre-TR baselines:
   *   - 50 TR: TR108-TR148 (41) + TR117_multi_agent + TR138_Study_D_Addendum + TR149 + TR152 + TR163 + TR164 + TR164_V3 + TR165 + TR167
   *   - 3 Phase 0: gemma3 + ollama-benchmark-report + performance-deep-dive (Sep-Oct 2025)
   *
   * History: a prior pass undercounted to 45 by filtering only `Technical_Report_*.md` and
   * missing the 2 reports that lived in PublishReady/docs/ (since moved to /reports/).
   * /reports.json `counts.technical_reports` + `counts.phase0` should sum to this number.
   */
  COUNT: 53,
  DISPLAY: '53',
} as const;

export const SITE_CONFIG = {
  NAME: 'Chimeraforge',
  DESCRIPTION: `Personal AI platform running on your hardware — local inference, constitutional AI governance, and ${MEASUREMENTS.SHORT} research measurements.`,
  AUTHOR: 'Sahil Kadadekar',
  TWITTER_HANDLE: '@sahilkadadekar',
} as const;
