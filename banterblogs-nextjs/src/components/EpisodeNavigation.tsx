import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface EpisodeLink {
  slug: string;
  title: string;
}

interface EpisodeNavigationProps {
  prevEpisode: EpisodeLink | null;
  nextEpisode: EpisodeLink | null;
}

/** the pager's id: the phone's floating prev/next pill leaves once it is reached */
export const EPISODE_PAGER_ID = 'episode-pager';

/** Previous and next, as the report page's pager: a hairline above, the titles lighting ember. */
export function EpisodeNavigation({ prevEpisode, nextEpisode }: EpisodeNavigationProps) {
  if (!prevEpisode && !nextEpisode) return null;
  return (
    <nav id={EPISODE_PAGER_ID} className="report-pager mt-20 grid gap-4 border-t border-border/40 pt-8 sm:grid-cols-2" aria-label="Episode navigation">
      {prevEpisode ? (
        <Link href={`/episodes/${prevEpisode.slug}`} className="block rounded-xl p-5 transition-colors duration-fast ease-standard hover:bg-card/70">
          <div className="report-pager-label">
            <ArrowLeft aria-hidden="true" className="h-3 w-3" />
            Previous Episode
          </div>
          <div className="report-pager-title line-clamp-1">{prevEpisode.title}</div>
        </Link>
      ) : (
        <div />
      )}
      {nextEpisode && (
        <Link
          href={`/episodes/${nextEpisode.slug}`}
          className="block rounded-xl p-5 text-right transition-colors duration-fast ease-standard hover:bg-card/70"
        >
          <div className="report-pager-label justify-end">
            Next Episode
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </div>
          <div className="report-pager-title line-clamp-1">{nextEpisode.title}</div>
        </Link>
      )}
    </nav>
  );
}
