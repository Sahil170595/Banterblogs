import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolPage } from '@/components/ToolPage';
import { toolJsonLd } from '@/lib/toolJsonLd';
import { TOOLS, toolBySlug } from '@/lib/tools';

export const runtime = 'nodejs';

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) return { title: 'Tool not found' };

  const url = `https://chimeraforge.vercel.app/tools/${tool.slug}`;
  const description = `${tool.name} v${tool.version} — ${tool.tagline}. ${tool.summary}`;
  return {
    title: `${tool.name} — ${tool.tagline}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      images: ['/opengraph-image.png'], title: `${tool.name} — ${tool.tagline}`, description, url, type: 'website' },
  };
}

export default async function ToolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd(tool)) }}
      />
      <ToolPage tool={tool} />
    </>
  );
}
