/**
 * Application constants and URLs
 */

export const GITHUB_URLS = {
  BANTERBLOGS: 'https://github.com/Sahil170595/Banterblogs',
  // Banterpacks repository is private
} as const;

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

export const SITE_CONFIG = {
  NAME: 'Chimeraforge',
  DESCRIPTION: 'Personal AI platform running on your hardware — local inference, constitutional AI governance, and 126K+ research measurements.',
  AUTHOR: 'Sahil Kadadekar',
  TWITTER_HANDLE: '@sahilkadadekar',
} as const;
