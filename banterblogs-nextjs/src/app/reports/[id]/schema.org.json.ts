export function reportJsonLd({ id, title, description }: { id: string; title: string; description?: string }) {
  const url = `https://chimeraforge.vercel.app/reports/${encodeURIComponent(id)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: title,
    description: description ?? '',
    url,
    mainEntityOfPage: url,
    author: {
      '@type': 'Person',
      name: 'Sahil Kadadekar',
      url: 'https://chimeraforge.vercel.app/about',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Chimeraforge',
      url: 'https://chimeraforge.vercel.app',
    },
    isPartOf: {
      '@type': 'ResearchProject',
      name: 'Banterhearts LLM Inference Research',
    },
  };
}



