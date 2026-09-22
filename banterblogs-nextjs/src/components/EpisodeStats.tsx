import { StatRow } from '@/components/ui/StatRow';
import { formatNumber } from '@/lib/formatUtils';

// Server component taking the four numbers it prints; it used to be a client
// island that received the whole Episode, rendered article included. An
// episode head's change counts, inline (the /reports head pattern). Its read
// time sits in the head's meta row.
interface EpisodeStatsProps {
  filesChanged: number;
  linesAdded: number;
  readingTime: number;
  complexity: number;
}

// the complexity score's colour bands, on the status hues
const COMPLEXITY_HIGH = 80;
const COMPLEXITY_ELEVATED = 60;
const COMPLEXITY_MODERATE = 40;

function complexityTone(complexity: number): string {
  if (complexity >= COMPLEXITY_HIGH) return 'text-primary';
  if (complexity >= COMPLEXITY_ELEVATED) return 'text-status-amber';
  if (complexity >= COMPLEXITY_MODERATE) return 'text-foreground';
  return 'text-status-green';
}

export function EpisodeStats({ filesChanged, linesAdded, readingTime, complexity }: EpisodeStatsProps) {
  return (
    <StatRow
      label="What changed"
      items={[
        { value: filesChanged, label: 'files' },
        { value: formatNumber(linesAdded), label: 'lines' },
        { value: `${readingTime} min`, label: 'read' },
        { value: <span className={complexityTone(complexity)}>{complexity}</span>, label: 'complexity' },
      ]}
    />
  );
}
