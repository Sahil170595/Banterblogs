export function reportJsonLd({ id, title, description }: { id: string; title: string; description?: string }) {
  const url = `https://banterblogs.vercel.app/reports/${encodeURIComponent(id)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description ?? '',
    url,
    mainEntityOfPage: url,
  };
}



