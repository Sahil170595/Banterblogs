import { FileText, GitCommit, Clock, Activity } from 'lucide-react';
import { formatNumber } from '@/lib/formatUtils';

// Server component taking the four numbers it prints; it used to be a client
// island that received the whole Episode, rendered article included.
interface EpisodeStatsProps {
  filesChanged: number;
  linesAdded: number;
  readingTime: number;
  complexity: number;
}

export function EpisodeStats({ filesChanged, linesAdded, readingTime, complexity }: EpisodeStatsProps) {
  const getComplexityColor = (complexity: number) => {
    if (complexity >= 80) return 'text-red-400';
    if (complexity >= 60) return 'text-yellow-400';
    if (complexity >= 40) return 'text-accent';
    return 'text-green-400';
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
      <div className="flex items-center space-x-2 text-sm">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Files:</span>
        <span className="font-medium">{filesChanged}</span>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <GitCommit className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Lines:</span>
        <span className="font-medium">{formatNumber(linesAdded)}</span>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Read:</span>
        <span className="font-medium">{readingTime} min</span>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Complexity:</span>
        <span className={`font-medium ${getComplexityColor(complexity)}`}>{complexity}</span>
      </div>
    </div>
  );
}
