import '@/app/reading.css';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { ReportProgress } from '@/components/reports/ReportProgress';
import { ReportTocMobile, ReportTocSidebar } from '@/components/reports/ReportToc';
import { ReportEnd } from '@/components/reports/reportEnd';
import { NAV_BACK, NAV_FORWARD } from '@/components/reports/ReportTransitions';
import { IntentLink } from '@/components/ui/IntentLink';
import type { TocEntry } from '@/lib/episodes';
import { findProject, neighbours, projectHref, readProjectCatalog } from '@/lib/projects/catalog';
import { getCollection } from '@/lib/projects/collections';
import { PROJECT_EVIDENCE, type ProjectManifest } from '@/lib/projects/manifest';

// A project's page, the report page's twin: breadcrumb, title, dek and meta
// row; the live demo where a report has its hero figure; the findings in the
// archive's number cards; the write-up beside its contents rail; a pager
// through the project's collection.

export interface ProjectFinding {
  value: string;
  label: string;
}

export interface ProjectSection {
  id: string;
  title: string;
}

interface ProjectPageProps {
  slug: string;
  /** the live demo, opening the page */
  demo: ReactNode;
  findings: ProjectFinding[];
  /** the write-up's h2 sections, in order: the contents rail */
  sections: ProjectSection[];
  /** the write-up, whose h2s carry the sections' ids */
  children: ReactNode;
}

function ProjectMeta({ project }: { project: ProjectManifest }) {
  return (
    <ul className="report-meta" aria-label="About this project">
      <li>
        <strong>{PROJECT_EVIDENCE[project.evidence]}</strong>
      </li>
      <li>Runs in your browser</li>
      {project.links.map((link) => (
        <li key={link.url}>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="project-meta-link">
            {link.label}
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function Pager({ previous, next }: { previous: ProjectManifest | null; next: ProjectManifest | null }) {
  if (!previous && !next) return null;
  return (
    <nav className="report-pager mt-20 grid gap-4 border-t border-border/40 pt-8 sm:grid-cols-2" aria-label="Project navigation">
      {previous ? (
        <IntentLink href={projectHref(previous)} transitionTypes={[NAV_BACK]} className="block rounded-xl p-5 transition-colors duration-fast ease-standard hover:bg-card/70">
          <div className="report-pager-label">
            <ArrowLeft aria-hidden="true" className="h-3 w-3" />
            Previous
          </div>
          <div className="report-pager-title line-clamp-1">{previous.title}</div>
        </IntentLink>
      ) : (
        <div />
      )}
      {next && (
        <IntentLink href={projectHref(next)} transitionTypes={[NAV_FORWARD]} className="block rounded-xl p-5 text-right transition-colors duration-fast ease-standard hover:bg-card/70">
          <div className="report-pager-label justify-end">
            Next
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </div>
          <div className="report-pager-title line-clamp-1">{next.title}</div>
        </IntentLink>
      )}
    </nav>
  );
}

export function ProjectPage({ slug, demo, findings, sections, children }: ProjectPageProps) {
  const catalog = readProjectCatalog();
  const project = findProject(catalog, slug);
  const collection = getCollection(project.collection);
  const { previous, next } = neighbours(catalog, project);
  const headings: TocEntry[] = sections.map((s) => ({ id: s.id, text: s.title, level: 2 }));

  return (
    <div className="container pb-24 pt-8 md:pt-10">
      <ReportProgress />
      <article className="project-frame">
        <header className="report-head">
          <nav aria-label="Breadcrumb">
            <ol className="report-crumbs">
              <li>
                <IntentLink href="/projects" transitionTypes={[NAV_BACK]}>
                  Projects
                </IntentLink>
              </li>
              <li>
                <IntentLink href={`/projects/${collection.key}`} transitionTypes={[NAV_BACK]}>
                  {collection.label}
                </IntentLink>
              </li>
            </ol>
          </nav>
          <h1 className="report-title">{project.title}</h1>
          <p className="report-dek">{project.dek}</p>
          <ProjectMeta project={project} />
        </header>

        <section className="project-demo" aria-label="Live demo">
          {demo}
        </section>

        <section aria-label="Findings" className="project-findings">
          {findings.map((finding) => (
            <div key={finding.label} className="project-finding">
              <div className="project-finding-value">{finding.value}</div>
              <p>{finding.label}</p>
            </div>
          ))}
        </section>

        <div className="report-layout project-layout">
          <div className="min-w-0">
            <ReportTocMobile headings={headings} />
            <div className="report-prose prose prose-invert">{children}</div>
          </div>
          <ReportTocSidebar headings={headings} />
        </div>
        <ReportEnd />
        <Pager previous={previous} next={next} />
      </article>
    </div>
  );
}
