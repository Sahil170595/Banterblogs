import { z } from 'zod';

export const PROJECT_CATEGORIES = {
  'reinforcement-learning': 'Reinforcement learning', agents: 'Agents', evaluation: 'Evaluation',
  retrieval: 'Retrieval', vision: 'Vision', systems: 'Systems', product: 'Product', embodied: 'Embodied AI',
} as const;
export const PROJECT_ROLES = {
  'research-engineer': 'Research engineer', 'applied-ai': 'Applied AI', 'ml-systems': 'ML systems',
  'ai-safety': 'AI safety', 'computer-vision': 'Computer vision', 'founding-engineer': 'Founding engineer',
  'embodied-ai': 'Embodied AI',
} as const;
export const PROJECT_RUNTIMES = {
  'browser-simulation': 'Interactive simulation', 'browser-evaluation': 'Interactive evaluation',
  'recorded-experiment': 'Recorded experiment', 'browser-application': 'Browser application',
} as const;
const category = z.enum(['reinforcement-learning', 'agents', 'evaluation', 'retrieval', 'vision', 'systems', 'product', 'embodied']);
const role = z.enum(['research-engineer', 'applied-ai', 'ml-systems', 'ai-safety', 'computer-vision', 'founding-engineer', 'embodied-ai']);
export const ProjectManifestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(100),
  summary: z.string().min(1).max(600),
  categories: z.array(category).min(1), roles: z.array(role).min(1),
  status: z.literal('interactive'),
  runtime: z.enum(['browser-simulation', 'browser-evaluation', 'recorded-experiment', 'browser-application']),
  sourceUrl: z.string().url().refine((url) => new URL(url).protocol === 'https:', 'Source must use HTTPS'),
}).strict();
export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;
export interface ProjectFilters { role?: string; category?: string; query?: string }
export function filterProjects(projects: ProjectManifest[], filters: ProjectFilters): ProjectManifest[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  return projects.filter((project) =>
    (!filters.role || project.roles.some((value) => value === filters.role)) &&
    (!filters.category || project.categories.some((value) => value === filters.category)) &&
    (!query || [project.title, project.summary, ...project.categories.map((value) => PROJECT_CATEGORIES[value])].join(' ').toLowerCase().includes(query)),
  );
}
