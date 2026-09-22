import type { Metadata } from 'next';
import { entranceItem } from '@/components/motion/entrance';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ListRow } from '@/components/ui/ListRow';
import { PageHeader } from '@/components/ui/PageHeader';
import { REPORTS } from '@/lib/constants';
import { TOOLS } from '@/lib/tools';

export const metadata: Metadata = {
  title: 'Page not found',
};

const DESTINATIONS = [
  {
    href: '/reports',
    title: 'Research archive',
    blurb: `${REPORTS.DISPLAY} technical reports, the phase whitepapers and the research compendium.`,
  },
  {
    href: '/papers',
    title: 'Papers',
    blurb: 'The workshop paper presented at ICML 2026, the papers under peer review and the ones in preparation.',
  },
  {
    href: '/tools',
    title: 'Tools',
    blurb: `${TOOLS.map((tool) => tool.name).join(' and ')}, the command-line tools built on the research.`,
  },
];
// the rows follow the head's two groups (it has no meta row) into the entrance
const ROWS_AFTER = 2;

// Unboxed, in the /show register: eyebrow, headline, one sentence, then rows.
export default function NotFound() {
  return (
    <div className="container max-w-5xl pb-24">
      <PageHeader
        eyebrow={<Eyebrow dot="ember">Error 404 · Page not found</Eyebrow>}
        title={
          <>
            Nothing lives{' '}
            <br />
            at this <span className="text-primary">address</span>.
          </>
        }
        lede="The link may be out of date or the URL mistyped; everything published here is reachable from these three places."
      />

      <ol className="mt-12 md:mt-16">
        {DESTINATIONS.map((destination, index) => (
          <li key={destination.href} {...entranceItem(index, ROWS_AFTER)}>
            <ListRow
              href={destination.href}
              index={String(index + 1).padStart(2, '0')}
              title={destination.title}
              titleAs="h2"
              description={destination.blurb}
            />
          </li>
        ))}
      </ol>

      <p className="list-row mt-12 pt-8 text-copy-14 text-muted-foreground">
        Looking for a particular report, tool or episode? Use the search in the site header (inside the menu on small
        screens).
      </p>
    </div>
  );
}
