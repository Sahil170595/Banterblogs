import type { ToolDef } from './tools';

// schema.org payload for a tool page. Sibling of reports/[id]/schema.org.json.ts
// and components/galactic/landingJsonLd.ts — derived from tools.ts so the
// structured data cannot drift from the rendered page.

const SITE = 'https://chimeraforge.vercel.app';

export function toolJsonLd(tool: ToolDef) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.summary,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Linux, macOS, Windows',
    softwareVersion: tool.version,
    url: `${SITE}/tools/${tool.slug}`,
    mainEntityOfPage: `${SITE}/tools/${tool.slug}`,
    downloadUrl: tool.pypi,
    codeRepository: tool.repo,
    programmingLanguage: 'Python',
    license:
      tool.license === 'MIT'
        ? 'https://opensource.org/licenses/MIT'
        : 'https://opensource.org/licenses/Apache-2.0',
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
    // free and installable — state it rather than leaving price ambiguous
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: tool.commands.map((command) => `${command.name} — ${command.summary}`),
  };
}
