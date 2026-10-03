import fs from 'node:fs';
import path from 'node:path';
import { ProjectManifestSchema, type ProjectManifest } from './projectManifest';

const PROJECT_ROOT = path.join(process.cwd(), 'src', 'app', 'work', 'projects');

/** Each independently merged demo registers itself alongside its route. */
export function readProjectCatalog(root = PROJECT_ROOT): ProjectManifest[] {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, entry.name, 'project.json')))
    .map((entry) => {
      const file = path.join(root, entry.name, 'project.json');
      const parsed = ProjectManifestSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
      if (!parsed.success) throw new Error(`Invalid project manifest ${entry.name}: ${parsed.error.message}`);
      if (parsed.data.slug !== entry.name) throw new Error(`Project slug does not match folder: ${entry.name}`);
      if (!fs.existsSync(path.join(root, entry.name, 'page.tsx'))) throw new Error(`Project has no page: ${entry.name}`);
      return parsed.data;
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}
