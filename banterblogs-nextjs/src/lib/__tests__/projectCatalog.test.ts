import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readProjectCatalog } from '../projectCatalog';
import { filterProjects, ProjectManifestSchema } from '../projectManifest';

const roots: string[] = [];
function root() {
  const directory = mkdtempSync(path.join(tmpdir(), 'portfolio-catalog-'));
  roots.push(directory);
  return directory;
}
const project = {
  slug: 'flight-routing', title: 'Flight Routing Lab', summary: 'A seeded routing environment.',
  categories: ['reinforcement-learning', 'evaluation'], roles: ['research-engineer'],
  status: 'interactive', runtime: 'browser-simulation',
  sourceUrl: 'https://github.com/Sahil170595/Banterblogs/tree/main',
};
function fixture(directory: string, slug: string, data: unknown) {
  mkdirSync(path.join(directory, slug));
  writeFileSync(path.join(directory, slug, 'project.json'), JSON.stringify(data));
  writeFileSync(path.join(directory, slug, 'page.tsx'), 'export default function Page() { return null; }');
}
afterEach(() => { for (const directory of roots.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('project catalog', () => {
  it('discovers only registered routes and sorts by title', () => {
    const directory = root();
    mkdirSync(path.join(directory, 'unfinished'));
    fixture(directory, 'flight-routing', project);
    fixture(directory, 'customer-service', { ...project, slug: 'customer-service', title: 'Customer Service' });
    expect(readProjectCatalog(directory).map((entry) => entry.slug)).toEqual(['customer-service', 'flight-routing']);
  });
  it('fails visibly for malformed manifests instead of hiding a broken project', () => {
    const directory = root();
    fixture(directory, 'flight-routing', { ...project, runtime: 'live-llm' });
    expect(() => readProjectCatalog(directory)).toThrow(/flight-routing/);
  });
  it('requires matching folder and slug and an actual page', () => {
    const directory = root();
    fixture(directory, 'different', project);
    expect(() => readProjectCatalog(directory)).toThrow(/slug/);
    rmSync(path.join(directory, 'different'), { recursive: true });
    fixture(directory, 'flight-routing', project);
    rmSync(path.join(directory, 'flight-routing', 'page.tsx'));
    expect(() => readProjectCatalog(directory)).toThrow(/page/);
  });
  it('rejects non-HTTPS evidence URLs and traversal slugs', () => {
    expect(ProjectManifestSchema.safeParse({ ...project, sourceUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(ProjectManifestSchema.safeParse({ ...project, slug: '../private' }).success).toBe(false);
  });
  it('combines role, category and case-insensitive search without changing source data', () => {
    const entries = [ProjectManifestSchema.parse(project)];
    expect(filterProjects(entries, { role: 'research-engineer', category: 'evaluation', query: '  FLIGHT  ' })).toEqual(entries);
    expect(filterProjects(entries, { role: 'applied-ai' })).toEqual([]);
    expect(filterProjects(entries, { query: 'missing' })).toEqual([]);
    expect(entries).toHaveLength(1);
  });
});
