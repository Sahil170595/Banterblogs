import { ArrowRight } from 'lucide-react';
import { IntentLink } from '@/components/ui/IntentLink';
import { NAV_FORWARD } from '@/components/reports/ReportTransitions';
import { getCollection } from '@/lib/projects/collections';
import { projectHref } from '@/lib/projects/catalog';
import { PROJECT_EVIDENCE, type ProjectManifest } from '@/lib/projects/manifest';
import { ProjectFigureTransition } from './ProjectTransitions';
import { PROJECT_VISUALS } from './visuals';

export interface ProjectCardProps {
  project: ProjectManifest;
  /** name the project's collection in the meta line: on All, or where it is cross-listed */
  showCollection?: boolean;
}

/**
 * A project on the hub: the archive card's anatomy (ReportCard) with the
 * project's own picture in the 16:9 frame, which opens into the figure at the
 * top of its page.
 */
export function ProjectCard({ project, showCollection = false }: ProjectCardProps) {
  const Visual = PROJECT_VISUALS[project.slug];
  return (
    <IntentLink href={projectHref(project)} transitionTypes={[NAV_FORWARD]} className="card-depth group block rounded-xl">
      <div className="card-lift">
        <ProjectFigureTransition slug={project.slug}>
          <div className="card-visual aspect-video">{Visual && <Visual accent />}</div>
        </ProjectFigureTransition>
        <h3 className="mt-4 text-heading-20 text-foreground">{project.title}</h3>
        <p className="mt-2 line-clamp-3 text-copy-16 text-muted-foreground">{project.summary}</p>
        <div data-card-meta="" className="mt-3 flex items-center gap-2 text-label-13 text-muted-foreground/80">
          {showCollection && <span>{getCollection(project.collection).label} ·</span>}
          <span>{PROJECT_EVIDENCE[project.evidence]}</span>
          <ArrowRight aria-hidden="true" className="card-arrow h-3.5 w-3.5" />
        </div>
      </div>
    </IntentLink>
  );
}
