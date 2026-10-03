import { Reveal } from '@/components/motion/Reveal';
import { entranceItem } from '@/components/motion/entrance';
import type { ProjectManifest } from '@/lib/projects/manifest';
import { CollectionPanel } from './CollectionPanel';
import { HUB_ENTRANCE_GROUP } from './hubEntrance';
import { ProjectCard } from './ProjectCard';

/** cards that join the first-load entrance: the first row at three columns */
const ENTRANCE_CARDS = 3;

interface CollectionGridProps {
  label: string;
  projects: ProjectManifest[];
  /** the collection being shown; a project filed elsewhere names its own on the card */
  collection?: string;
}

/** A collection's cards, in the archive grid's columns and rhythm. */
export function CollectionGrid({ label, projects, collection }: CollectionGridProps) {
  return (
    <CollectionPanel label={label}>
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project, index) => (
          <Reveal
            key={project.slug}
            className="archive-card-slot"
            {...(index < ENTRANCE_CARDS ? entranceItem(index, HUB_ENTRANCE_GROUP.tabs + 1) : {})}
          >
            <ProjectCard project={project} showCollection={project.collection !== collection} />
          </Reveal>
        ))}
      </div>
    </CollectionPanel>
  );
}
