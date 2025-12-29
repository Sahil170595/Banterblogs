import { getAllEpisodes } from '@/lib/episodes';
import Link from 'next/link';
import { Tag } from 'lucide-react';

export default async function TagsPage() {
  const episodes = await getAllEpisodes();

  const tagCounts = episodes.reduce((acc, episode) => {
    episode.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-10 p-8 md:p-10">
        <span className="signal-pill">Topic Map</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">Chimera Tags</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Explore the full signal surface by topic, platform, and technology.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedTags.map(({ tag, count }) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className="signal-panel group flex items-center justify-between gap-4 p-5 transition hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-primary">
                <Tag className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">{tag}</div>
                <div className="text-xs text-muted-foreground">Signal cluster</div>
              </div>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {count} episode{count !== 1 ? 's' : ''}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
