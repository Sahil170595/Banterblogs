import fs from 'node:fs';
import path from 'node:path';
import { COLLECTIONS, isCollectionKey, type Collection, type CollectionKey } from './collections';
import { ProjectManifestSchema, type ProjectManifest } from './manifest';

// Project pages live at src/app/projects/(demos)/<collection>/<slug>/, each
// with the project.json that registers it. A half-registered project fails
// the build rather than vanishing from the hub.
export const PROJECTS_ROOT = path.join(process.cwd(), 'src', 'app', 'projects', '(demos)');
const MANIFEST = 'project.json';
const PAGE = 'page.tsx';

const subfolders = (dir: string) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

function readManifest(dir: string, folder: string, slug: string): ProjectManifest {
  const file = path.join(dir, MANIFEST);
  if (!fs.existsSync(file)) throw new Error(`Project ${folder}/${slug} has a page but no ${MANIFEST}`);
  if (!fs.existsSync(path.join(dir, PAGE))) throw new Error(`Project ${folder}/${slug} has a manifest but no ${PAGE}`);
  const parsed = ProjectManifestSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!parsed.success) throw new Error(`Invalid manifest for project ${folder}/${slug}: ${parsed.error.message}`);
  if (parsed.data.slug !== slug) throw new Error(`Project ${folder}/${slug}: manifest slug "${parsed.data.slug}" does not match its folder`);
  if (parsed.data.collection !== folder) throw new Error(`Project ${folder}/${slug}: manifest collection "${parsed.data.collection}" does not match its folder`);
  return parsed.data;
}

/** Every registered project, by collection order, then its order there. */
export function readProjectCatalog(root = PROJECTS_ROOT): ProjectManifest[] {
  const projects: ProjectManifest[] = [];
  for (const folder of subfolders(root)) {
    if (!isCollectionKey(folder)) throw new Error(`Unknown project collection folder: ${folder}`);
    const own = subfolders(path.join(root, folder)).map((slug) => readManifest(path.join(root, folder, slug), folder, slug));
    const seen = new Map<number, string>();
    for (const project of own) {
      const clash = seen.get(project.order);
      if (clash) throw new Error(`Projects ${clash} and ${project.slug} share order ${project.order} in ${folder}`);
      seen.set(project.order, project.slug);
    }
    projects.push(...own);
  }
  const rank = (key: CollectionKey) => COLLECTIONS.findIndex((c) => c.key === key);
  return projects.sort((a, b) => rank(a.collection) - rank(b.collection) || a.order - b.order);
}

export function projectHref(project: Pick<ProjectManifest, 'collection' | 'slug'>): string {
  return `/projects/${project.collection}/${project.slug}`;
}

/** A collection's own projects in order, then the ones cross-listed into it. */
export function projectsIn(catalog: ProjectManifest[], key: CollectionKey): ProjectManifest[] {
  return [...catalog.filter((p) => p.collection === key), ...catalog.filter((p) => p.alsoIn.includes(key))];
}

/** The collections that list at least one project; an empty one has no tab or page. */
export function collectionsWithProjects(catalog: ProjectManifest[]): Collection[] {
  return COLLECTIONS.filter((c) => projectsIn(catalog, c.key).length > 0);
}

/** The projects before and after this one in its own collection. */
export function neighbours(catalog: ProjectManifest[], project: ProjectManifest) {
  const own = catalog.filter((p) => p.collection === project.collection);
  const index = own.findIndex((p) => p.slug === project.slug);
  return { previous: own[index - 1] ?? null, next: own[index + 1] ?? null };
}

export function findProject(catalog: ProjectManifest[], slug: string): ProjectManifest {
  const project = catalog.find((p) => p.slug === slug);
  if (!project) throw new Error(`Unregistered project: ${slug}`);
  return project;
}
