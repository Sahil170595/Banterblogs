'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, RotateCcw, Search } from 'lucide-react';
import { IntentLink } from '@/components/ui/IntentLink';
import { filterProjects, PROJECT_CATEGORIES, PROJECT_ROLES, PROJECT_RUNTIMES, type ProjectFilters, type ProjectManifest } from '@/lib/projectManifest';

const INPUT = 'min-h-11 w-full rounded border border-border bg-background px-3 text-copy-14 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function readFilters(): ProjectFilters {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role') ?? '';
  const category = params.get('category') ?? '';
  return {
    role: Object.hasOwn(PROJECT_ROLES, role) ? role : '',
    category: Object.hasOwn(PROJECT_CATEGORIES, category) ? category : '',
    query: params.get('q') ?? '',
  };
}

export function ProjectCatalog({ projects }: { projects: ProjectManifest[] }) {
  const [filters, setFilters] = useState<ProjectFilters>({});
  useEffect(() => {
    const restore = () => setFilters(readFilters());
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  function update(next: ProjectFilters) {
    setFilters(next);
    const url = new URL(window.location.href);
    for (const [key, value] of [['role', next.role], ['category', next.category], ['q', next.query]]) {
      if (value) url.searchParams.set(key!, value);
      else url.searchParams.delete(key!);
    }
    window.history.replaceState(window.history.state, '', url);
  }
  const visible = filterProjects(projects, filters);
  return (
    <div>
      <div className="grid gap-4 border-y border-border py-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="block text-label-13 text-muted-foreground">
          Search projects
          <span className="relative mt-2 block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-5 w-5" />
            <input type="search" value={filters.query ?? ''} onChange={(event) => update({ ...filters, query: event.target.value })} className={`${INPUT} pl-10`} />
          </span>
        </label>
        <label className="block text-label-13 text-muted-foreground">
          Role
          <select value={filters.role ?? ''} onChange={(event) => update({ ...filters, role: event.target.value })} className={`${INPUT} mt-2`}>
            <option value="">All roles</option>
            {Object.entries(PROJECT_ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="block text-label-13 text-muted-foreground">
          Domain
          <select value={filters.category ?? ''} onChange={(event) => update({ ...filters, category: event.target.value })} className={`${INPUT} mt-2`}>
            <option value="">All domains</option>
            {Object.entries(PROJECT_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => update({})} aria-label="Reset project filters" title="Reset project filters" className="flex h-11 w-11 items-center justify-center rounded border border-border text-foreground hover:bg-foreground/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <p className="py-4 text-label-13 text-muted-foreground" aria-live="polite">{visible.length} of {projects.length} projects</p>
      <ul>
        {visible.map((project) => (
          <li key={project.slug} className="grid gap-4 border-b border-border py-7 md:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="min-w-0">
              <h2 className="text-heading-24 tracking-normal text-foreground">
                <IntentLink href={`/work/projects/${project.slug}`} className="row-link [overflow-wrap:anywhere]">
                  {project.title} <ArrowRight aria-hidden="true" className="inline-block h-5 w-5" />
                </IntentLink>
              </h2>
              <p className="mt-3 max-w-[72ch] text-copy-16 text-prose">{project.summary}</p>
              <p className="mt-3 text-label-13 text-muted-foreground">{project.categories.map((category) => PROJECT_CATEGORIES[category]).join(' / ')}</p>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 md:flex-col md:justify-start">
              <span className="text-label-13 text-muted-foreground">{PROJECT_RUNTIMES[project.runtime]}</span>
              <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-copy-14 text-foreground underline underline-offset-4">
                Source <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="border-b border-border py-10 text-copy-16 text-muted-foreground">No projects match this selection.</p>}
    </div>
  );
}
