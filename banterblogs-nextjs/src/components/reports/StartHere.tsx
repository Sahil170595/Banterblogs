import { entranceGroup } from '@/components/motion/entrance';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { IntentLink } from '@/components/ui/IntentLink';
import { cn } from '@/lib/cn';
import { toHumanTitle } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';
import { START_HERE } from '@/lib/reports/startHere';
import { describeReport } from './reportIdentity';
import { NAV_FORWARD } from './ReportTransitions';

const COLOR_TRANSITION = 'transition-colors duration-fast ease-standard';
// the site's inline text link (episodes, tools, work)
const INLINE_LINK = cn('text-foreground underline decoration-foreground/35 underline-offset-4 hover:decoration-primary', COLOR_TRANSITION);

export interface StartHereProps {
  /** the head entrance group the strip rises with */
  group?: number;
  className?: string;
}

/**
 * Three reports to read first, one compact row above the archive's tabs.
 * Which three is START_HERE's rule; each line is the report's own catalog
 * title and description, so the strip claims nothing the report page does not.
 */
export function StartHere({ group, className }: StartHereProps) {
  const items = START_HERE.entries.flatMap((entry) => {
    const meta = readReportMeta(entry.slug);
    // a paper may name a report this build does not carry: leave it out
    if (!meta) return [];
    const { heading } = describeReport(entry.slug, meta.title ?? toHumanTitle(entry.slug));
    return [{ slug: entry.slug, label: entry.label, heading, description: meta.description ?? '' }];
  });
  if (items.length === 0) return null;

  const entrance = group === undefined ? null : entranceGroup(group);
  return (
    <section aria-label="Start here" style={entrance?.style} className={cn(entrance?.className, 'mt-5 md:mt-6', className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Eyebrow as="h2" className="text-foreground">
          Start here
        </Eyebrow>
        <p className="text-label-13 text-muted-foreground">
          {START_HERE.rule}{' '}
          {/* from sm: on a phone it wraps the caption onto a second line */}
          <IntentLink href="/papers" className={cn('hidden sm:inline', INLINE_LINK)}>
            See the papers
          </IntentLink>
        </p>
      </div>
      <ol className="mt-1 grid gap-x-8 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.slug} className="min-w-0">
            <IntentLink
              href={`/reports/${item.slug}`}
              transitionTypes={[NAV_FORWARD]}
              className={cn('group -mx-3 block rounded-lg px-3 py-1.5 hover:bg-card/70', COLOR_TRANSITION)}
            >
              <span className="flex items-baseline gap-2">
                <span className="shrink-0 text-label-12-mono text-muted-foreground">{item.label}</span>
                <span className={cn('min-w-0 truncate text-copy-14 font-medium text-foreground group-hover:text-primary', COLOR_TRANSITION)}>{item.heading}</span>
              </span>
              {/* from sm: a phone's line holds too little of it to earn the height */}
              {item.description && <span className="hidden truncate text-label-13 text-muted-foreground sm:block">{item.description}</span>}
            </IntentLink>
          </li>
        ))}
      </ol>
    </section>
  );
}
