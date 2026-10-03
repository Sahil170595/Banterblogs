// the reading routes' two sheets, imported together everywhere so the
// bundler keeps them one chunk (e2e/routes.spec.ts counts the sheets)
import 'highlight.js/styles/github-dark.css';
import '@/app/reading.css';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { ReportProgress } from '@/components/reports/ReportProgress';
import { ReportTocMobile, ReportTocSidebar } from '@/components/reports/ReportToc';
import { ReportEnd } from '@/components/reports/reportEnd';
import { NAV_BACK, NAV_FORWARD } from '@/components/reports/ReportTransitions';
import { IntentLink } from '@/components/ui/IntentLink';
import type { TocEntry } from '@/lib/episodes';
import { findProject, neighbours, projectHref, readProjectCatalog } from '@/lib/projects/catalog';
import { getCollection, type Collection } from '@/lib/projects/collections';
import { PROJECT_EVIDENCE, type ProjectManifest } from '@/lib/projects/manifest';

// A project's page, in the order a first-time visitor needs it: what the
// system is (the dek) and who built it; what was found, in the archive's
// number cards; the live demo; the write-up beside its contents rail, plain
// sections first and the engineering part set apart under its own heading;
// a pager through the whole catalog.

const AUTHOR = 'Sahil Kadadekar';

export interface ProjectFinding {
  value: string;
  label: string;
}

export interface ProjectSection {
  id: string;
  title: string;
  /** 3 for a section inside the engineering part */
  level?: 2 | 3;
}

export const ENGINEERS_ID = 'engineers';

/**
 * The contents rail for a write-up: its plain sections, then the engineering
 * part's heading and its sections one level in.
 */
export function projectSections(plain: Record<string, string>, engineers: Record<string, string>): ProjectSection[] {
  return [
    ...Object.entries(plain).map(([id, title]) => ({ id, title })),
    { id: ENGINEERS_ID, title: 'For engineers' },
    ...Object.entries(engineers).map(([id, title]) => ({ id, title, level: 3 as const })),
  ];
}

interface ProjectPageProps {
  slug: string;
  /** the live demo */
  demo: ReactNode;
  /** what the demo found, read before it */
  findings: ProjectFinding[];
  /** how the port was checked against the original, computed by the page */
  checked?: string;
  /** the write-up's sections, in order: the contents rail */
  sections: ProjectSection[];
  /** the write-up, whose headings carry the sections' ids */
  children: ReactNode;
}

export function ProjectMeta({ project, checked }: { project: ProjectManifest; checked?: string }) {
  return (
    <>
      <ul className="report-meta" aria-label="About this project">
        <li>Built by {AUTHOR}</li>
        <li>
          <strong>{PROJECT_EVIDENCE[project.evidence]}</strong>
        </li>
        <li>Runs in your browser</li>
        {checked && (
          <li className="project-meta-check">
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
            {checked}
          </li>
        )}
        {project.links.map((link) => (
          <li key={link.url}>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="project-meta-link">
              {link.label}
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </li>
        ))}
      </ul>
      {project.builtWith && (
        <p className="project-stack">
          <span>Original built with</span> {project.builtWith.join(' · ')}
        </p>
      )}
    </>
  );
}

/**
 * The write-up's engineering part: how it works, how the port was checked and
 * how to reproduce it, under its own heading so a visitor who only wants the
 * story knows where to stop. Its sections are h3s.
 */
export function ForEngineers({ lede, children }: { lede: string; children: ReactNode }) {
  return (
    <section className="project-engineers" aria-labelledby={ENGINEERS_ID}>
      <h2 id={ENGINEERS_ID}>For engineers</h2>
      <p className="project-engineers-lede">{lede}</p>
      {children}
    </section>
  );
}

function Pager({ previous, next, collection }: { previous: ProjectManifest | null; next: ProjectManifest | null; collection: Collection }) {
  return (
    <nav className="report-pager mt-20 border-t border-border/40 pt-8" aria-label="Project navigation">
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      <IntentLink href={`/projects/${collection.key}`} transitionTypes={[NAV_BACK]} className="project-pager-all">
        All projects in {collection.label}
      </IntentLink>
    </nav>
  );
}

export function ProjectPage({ slug, demo, findings, checked, sections, children }: ProjectPageProps) {
  const catalog = readProjectCatalog();
  const project = findProject(catalog, slug);
  const collection = getCollection(project.collection);
  const { previous, next } = neighbours(catalog, project);
  const headings: TocEntry[] = sections.map((s) => ({ id: s.id, text: s.title, level: s.level ?? 2 }));

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
          <ProjectMeta project={project} checked={checked} />
        </header>

        <section aria-labelledby="findings" className="project-findings-block">
          <h2 id="findings" className="project-block-title">
            What I found
          </h2>
          <div className="project-findings">
            {findings.map((finding) => (
              <div key={finding.label} className="project-finding">
                <div className="project-finding-value">{finding.value}</div>
                <p>{finding.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="project-demo" aria-labelledby="demo">
          <h2 id="demo" className="project-block-title">
            Try it
          </h2>
          {demo}
        </section>

        <div className="report-layout project-layout">
          <div className="min-w-0">
            <ReportTocMobile headings={headings} />
            <div className="report-prose prose prose-invert">{children}</div>
          </div>
          <ReportTocSidebar headings={headings} />
        </div>
        <ReportEnd />
        <Pager previous={previous} next={next} collection={collection} />
      </article>
    </div>
  );
}
