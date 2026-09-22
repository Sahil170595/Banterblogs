import type { ContentStatsSummary } from '@/lib/episodes';
import { StatRow } from '@/components/ui/StatRow';

// Server component: stats are computed server-side (lib/episodes
// computeContentStats) so the article HTML never rides into a client bundle
// just to be counted. What the article holds, inline beside the change
// counts; its read time is the head's (EpisodeStats), not a second estimate.

interface ContentStatsProps {
  stats: ContentStatsSummary;
  className?: string;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export function ContentStats({ stats, className }: ContentStatsProps) {
  return (
    <StatRow
      label="What the article holds"
      className={className}
      items={[
        { value: stats.wordCount.toLocaleString('en-US'), label: plural(stats.wordCount, 'word', 'words') },
        { value: stats.headingCount, label: plural(stats.headingCount, 'section', 'sections') },
        { value: stats.imageCount, label: plural(stats.imageCount, 'image', 'images') },
        { value: stats.codeBlockCount, label: plural(stats.codeBlockCount, 'code block', 'code blocks') },
        { value: stats.linkCount, label: plural(stats.linkCount, 'link', 'links') },
      ]}
    />
  );
}
