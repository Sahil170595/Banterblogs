import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { CORE_SELECTION, STAR_SYSTEMS } from './systems';

// schema.org payload for the landing page — the machine-readable twin of the
// 3D scene. Derives everything from systems.ts so the atlas and the metadata
// can never drift apart. Sibling of reports/[id]/schema.org.json.ts.

const SITE = 'https://chimeraforge.vercel.app';

function absolute(href: string): string {
  return href.startsWith('/') ? `${SITE}${href}` : href;
}

export function landingJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Chimeraforge — Chimera system atlas',
    description:
      `Nine repositories orbiting one constitutional AI core — an interactive galactic map of the ` +
      `Chimera ecosystem. ${REPORTS.DISPLAY} technical reports, ${MEASUREMENTS.DISPLAY} measurements.`,
    url: `${SITE}/`,
    mainEntityOfPage: `${SITE}/`,
    author: {
      '@type': 'Person',
      name: 'Sahil Kadadekar',
      url: `${SITE}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Chimeraforge',
      url: SITE,
    },
    about: {
      '@type': 'Thing',
      name: CORE_SELECTION.name,
      description: CORE_SELECTION.blurb,
      url: absolute(CORE_SELECTION.href),
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Systems orbiting the Chimera core',
      numberOfItems: STAR_SYSTEMS.length,
      itemListElement: STAR_SYSTEMS.map((system, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'SoftwareSourceCode',
          name: system.name,
          description: system.blurb,
          url: absolute(system.href),
        },
      })),
    },
  };
}
