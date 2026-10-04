// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { COLLECTIONS, getCollection } from '../projects/collections';
import { ProjectManifestSchema, type ProjectManifest } from '../projects/manifest';
import { collectionsWithProjects, neighbours, projectHref, projectsIn, readProjectCatalog } from '../projects/catalog';
import { PROJECT_VISUALS } from '@/components/projects/visuals';

// Projects are the research archive's twin: /projects, a collection per tab,
// and one canonical page per project at /projects/<collection>/<slug>. A
// project registers itself with a project.json beside its page; the catalog
// reads them and fails the build on anything half-registered.

const roots: string[] = [];
afterEach(() => {
  for (const directory of roots.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function tempRoot(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'projects-catalog-'));
  roots.push(directory);
  return directory;
}

const manifest: ProjectManifest = {
  slug: 'flight-routing',
  title: 'Flight Routing Lab',
  dek: 'A deadline-aware routing environment.',
  summary: 'Seeded disruptions, masked actions and paired policy evaluation.',
  collection: 'reinforcement-learning',
  alsoIn: [],
  order: 1,
  evidence: 'synthetic-fixture',
  published: '2026-10-03',
  links: [{ label: 'Source', url: 'https://github.com/Sahil170595/Banterblogs/tree/main/banterblogs-nextjs' }],
};

function register(root: string, data: Partial<ProjectManifest> & { slug: string }, folder: string = data.collection ?? manifest.collection, files = ['project.json', 'page.tsx']) {
  const dir = path.join(root, folder, data.slug);
  mkdirSync(dir, { recursive: true });
  if (files.includes('project.json')) writeFileSync(path.join(dir, 'project.json'), JSON.stringify({ ...manifest, ...data }));
  if (files.includes('page.tsx')) writeFileSync(path.join(dir, 'page.tsx'), 'export default function Page() { return null; }');
}

describe('collections', () => {
  it('are the four agreed collections, in order', () => {
    expect(COLLECTIONS.map((c) => c.key)).toEqual(['reinforcement-learning', 'agents-and-evaluation', 'systems', 'product']);
    expect(getCollection('systems').label).toBe('Systems');
    expect(() => getCollection('nope')).toThrow(/collection/);
  });
});

describe('project manifest', () => {
  it('accepts a complete manifest', () => {
    expect(ProjectManifestSchema.parse(manifest)).toEqual(manifest);
  });

  it('rejects unknown fields, traversal slugs and an unknown collection', () => {
    expect(ProjectManifestSchema.safeParse({ ...manifest, status: 'interactive' }).success).toBe(false);
    expect(ProjectManifestSchema.safeParse({ ...manifest, slug: '../private' }).success).toBe(false);
    expect(ProjectManifestSchema.safeParse({ ...manifest, collection: 'misc' }).success).toBe(false);
  });

  it('keeps links on https and GitHub links on main or a pinned commit', () => {
    const withLink = (url: string) => ProjectManifestSchema.safeParse({ ...manifest, links: [{ label: 'Source', url }] }).success;
    expect(withLink('javascript:alert(1)')).toBe(false);
    expect(withLink('http://github.com/Sahil170595/gatebound-rl')).toBe(false);
    expect(withLink('https://github.com/Sahil170595/Banterblogs/blob/codex/demo-flight-routing/README.md')).toBe(false);
    expect(withLink('https://github.com/Sahil170595/gatebound-rl')).toBe(true);
    expect(withLink('https://github.com/Sahil170595/Banterblogs/tree/main/banterblogs-nextjs')).toBe(true);
    expect(withLink(`https://github.com/Sahil170595/Banterblogs/blob/${'a'.repeat(40)}/README.md`)).toBe(true);
    expect(withLink('https://pypi.org/project/chimeraforge/')).toBe(true);
  });

  it('names the original system’s stack in a short list, when it has one', () => {
    expect(ProjectManifestSchema.safeParse({ ...manifest, builtWith: ['Python', 'FastAPI', 'PostgreSQL'] }).success).toBe(true);
    expect(ProjectManifestSchema.safeParse({ ...manifest, builtWith: Array.from({ length: 9 }, (_, i) => `Tool ${i}`) }).success).toBe(false);
    expect(ProjectManifestSchema.safeParse({ ...manifest, builtWith: [''] }).success).toBe(false);
  });

  it('never cross-lists a project into its own collection', () => {
    expect(ProjectManifestSchema.safeParse({ ...manifest, alsoIn: ['reinforcement-learning'] }).success).toBe(false);
    expect(ProjectManifestSchema.safeParse({ ...manifest, alsoIn: ['systems'] }).success).toBe(true);
  });
});

describe('project catalog', () => {
  it('reads projects by collection order, then their order', () => {
    const root = tempRoot();
    register(root, { slug: 'b-systems', collection: 'systems', order: 1 });
    register(root, { slug: 'rl-second', order: 2 });
    register(root, { slug: 'rl-first', order: 1 });
    expect(readProjectCatalog(root).map((p) => p.slug)).toEqual(['rl-first', 'rl-second', 'b-systems']);
  });

  it('fails on a page without a manifest, a manifest without a page, and a stray folder', () => {
    const root = tempRoot();
    register(root, { slug: 'no-manifest' }, undefined, ['page.tsx']);
    expect(() => readProjectCatalog(root)).toThrow(/no-manifest.*project\.json/);

    const second = tempRoot();
    register(second, { slug: 'no-page' }, undefined, ['project.json']);
    expect(() => readProjectCatalog(second)).toThrow(/no-page.*page\.tsx/);

    const third = tempRoot();
    register(third, { slug: 'flight-routing' }, 'misc');
    expect(() => readProjectCatalog(third)).toThrow(/misc/);
  });

  it('fails when the folder disagrees with the manifest', () => {
    const root = tempRoot();
    register(root, { slug: 'flight-routing', collection: 'systems' }, 'reinforcement-learning');
    expect(() => readProjectCatalog(root)).toThrow(/collection/);

    const second = tempRoot();
    mkdirSync(path.join(second, 'reinforcement-learning', 'renamed'), { recursive: true });
    writeFileSync(path.join(second, 'reinforcement-learning', 'renamed', 'project.json'), JSON.stringify(manifest));
    writeFileSync(path.join(second, 'reinforcement-learning', 'renamed', 'page.tsx'), '');
    expect(() => readProjectCatalog(second)).toThrow(/slug/);
  });

  it('fails on a malformed manifest or a repeated order, naming the project', () => {
    const root = tempRoot();
    register(root, { slug: 'broken', evidence: 'vibes' as never });
    expect(() => readProjectCatalog(root)).toThrow(/broken/);

    const second = tempRoot();
    register(second, { slug: 'one', order: 1 });
    register(second, { slug: 'two', order: 1 });
    expect(() => readProjectCatalog(second)).toThrow(/order 1/);
  });

  it('lists a cross-listed project in both collections under one canonical URL', () => {
    const root = tempRoot();
    register(root, { slug: 'flight-routing', alsoIn: ['systems'] });
    register(root, { slug: 'scheduler', collection: 'systems', order: 1 });
    const catalog = readProjectCatalog(root);
    expect(projectsIn(catalog, 'systems').map((p) => p.slug)).toEqual(['scheduler', 'flight-routing']);
    expect(collectionsWithProjects(catalog).map((c) => c.key)).toEqual(['reinforcement-learning', 'systems']);
    expect(projectHref(catalog[0])).toBe('/projects/reinforcement-learning/flight-routing');
  });

  // the last project of a collection used to be a dead end
  it('pages through the whole catalog, across collections', () => {
    const root = tempRoot();
    register(root, { slug: 'a', order: 1 });
    register(root, { slug: 'b', order: 2 });
    register(root, { slug: 'c', collection: 'systems', order: 1 });
    const catalog = readProjectCatalog(root);
    const [a, b, c] = catalog;
    expect(neighbours(catalog, a)).toEqual({ previous: null, next: b });
    expect(neighbours(catalog, b)).toEqual({ previous: a, next: c });
    expect(neighbours(catalog, c)).toEqual({ previous: b, next: null });
  });
});

describe('the site catalog', () => {
  const catalog = readProjectCatalog();

  it('registers every project page with a visual for its card and hero', () => {
    expect(catalog.length).toBeGreaterThan(0);
    for (const project of catalog) expect(PROJECT_VISUALS[project.slug], project.slug).toBeDefined();
    expect(Object.keys(PROJECT_VISUALS).sort()).toEqual(catalog.map((p) => p.slug).sort());
  });

  it('keeps slugs unique across collections', () => {
    const slugs = catalog.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });});
