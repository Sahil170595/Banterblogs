import type { ReactNode } from 'react';
import { CollectionTabs, type CollectionTab } from '@/components/projects/CollectionTabs';
import { HubHead } from '@/components/projects/HubHead';
import { entranceGroup } from '@/components/motion/entrance';
import { HUB_ENTRANCE_GROUP } from '@/components/projects/hubEntrance';
import { cn } from '@/lib/cn';
import { collectionsWithProjects, projectsIn, readProjectCatalog } from '@/lib/projects/catalog';

// The projects hub, the research archive's twin: one head over a tab strip of
// collections. The head and the strip live here, in the layout the hub and
// every collection page share, so a tab switch swaps only the grid and the
// head's words (HubHead).

/** an entrance group's props with the element's own classes */
function entrance(group: number, className: string) {
  const props = entranceGroup(group);
  return { ...props, className: cn(className, props.className) };
}

export default function ProjectsHubLayout({ children }: { children: ReactNode }) {
  const catalog = readProjectCatalog();
  const collections = collectionsWithProjects(catalog);
  const tabs: CollectionTab[] = [
    { key: 'all', label: 'All', href: '/projects', count: catalog.length },
    ...collections.map((c) => ({ key: c.key, label: c.label, href: `/projects/${c.key}`, count: projectsIn(catalog, c.key).length })),
  ];

  return (
    <div className="container pb-24 pt-6 md:pt-10">
      <div>
        <HubHead
          collections={collections.map(({ key, title, description }) => ({ key, title, description, count: projectsIn(catalog, key).length }))}
          total={catalog.length}
          titleProps={entrance(HUB_ENTRANCE_GROUP.title, 'text-heading-48')}
          introProps={entrance(HUB_ENTRANCE_GROUP.intro, 'mt-3 max-w-4xl text-copy-16 text-muted-foreground md:mt-4 md:text-copy-17')}
          countsProps={entrance(HUB_ENTRANCE_GROUP.tabs, 'mt-3 flex flex-wrap gap-x-5 gap-y-1 text-label-13 text-muted-foreground')}
          intro={
            <>
              Working demos of systems I built: environments that score decision-making programs, checks on software agents and
              automated decisions, search, scheduling and rule engines, and a shared whiteboard. Each runs in your browser on made-up
              sample data and says where its numbers come from. Most end the same way: something that looks like success until a
              stricter check reads what actually happened. Built by <span className="text-foreground">Sahil Kadadekar</span>.
            </>
          }
        />
      </div>

      <section aria-labelledby="projects-heading" className="mt-6 md:mt-8">
        <h2 id="projects-heading" className="sr-only">
          Projects by collection
        </h2>
        <CollectionTabs tabs={tabs} />
        {children}
      </section>
    </div>
  );
}
