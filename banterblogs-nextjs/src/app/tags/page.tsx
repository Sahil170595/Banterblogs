import { getAllEpisodes } from '@/lib/episodes';
import Link from 'next/link';
import { Tag } from 'lucide-react';

export default async function TagsPage() {
  const episodes = await getAllEpisodes();
  
  // Get all unique tags with counts
  const tagCounts = episodes.reduce((acc, episode) => {
    episode.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Tags</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Explore episodes by topic and technology.
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedTags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="group flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Tag className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                <span className="font-medium">{tag}</span>
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-accent-foreground">
                {count} episode{count !== 1 ? 's' : ''}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
