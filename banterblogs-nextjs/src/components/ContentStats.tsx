import { FileText, Eye, List, Image as ImageIcon, Code, Link as LinkIcon } from 'lucide-react';
import type { ContentStatsSummary } from '@/lib/episodes';

// Server component: stats are computed server-side (lib/episodes
// computeContentStats) so the article HTML never rides into a client bundle
// just to be counted. Hover scale is CSS — no framer-motion needed here.

interface ContentStatsProps {
  stats: ContentStatsSummary;
  className?: string;
}

const TILE_CLASS =
  'text-center p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur transition-transform duration-200 hover:scale-105';

export function ContentStats({ stats, className = '' }: ContentStatsProps) {
  const tiles = [
    { icon: <FileText className="h-6 w-6 text-primary mx-auto mb-2" />, value: stats.wordCount, label: 'Words' },
    { icon: <Eye className="h-6 w-6 text-accent mx-auto mb-2" />, value: stats.readingTime, label: 'Min Read' },
    { icon: <List className="h-6 w-6 text-green-400 mx-auto mb-2" />, value: stats.headingCount, label: 'Sections' },
    { icon: <ImageIcon className="h-6 w-6 text-accent mx-auto mb-2" />, value: stats.imageCount, label: 'Images' },
    { icon: <Code className="h-6 w-6 text-primary mx-auto mb-2" />, value: stats.codeBlockCount, label: 'Code Blocks' },
    { icon: <LinkIcon className="h-6 w-6 text-orange-400 mx-auto mb-2" />, value: stats.linkCount, label: 'Links' },
  ];

  return (
    <div className={`content-stats ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className={TILE_CLASS}>
            {tile.icon}
            <div className="text-2xl font-bold text-foreground">{tile.value}</div>
            <div className="text-sm text-muted-foreground">{tile.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
