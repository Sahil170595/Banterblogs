import { z } from 'zod';
import { COLLECTION_KEYS } from './collections';

// What a project says about itself (its project.json): the head of its page,
// its card, where it is filed and where its code lives.

/** what the numbers on a project's page come from, shown in its meta row */
export const PROJECT_EVIDENCE = {
  'synthetic-fixture': 'Synthetic fixture',
  'recorded-run': 'Recorded run',
  application: 'Live application',
} as const;

// A GitHub link names the repo, or a path on main or at a pinned commit; a
// feature branch link breaks the day the branch is deleted.
const GITHUB_LINK = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\/(?:tree|blob)\/(?:main|[0-9a-f]{40})(?:\/\S*)?)?\/?$/;

const link = z
  .object({
    label: z.string().min(1).max(40),
    url: z
      .string()
      .url()
      .refine((url) => new URL(url).protocol === 'https:', 'Links must use https')
      .refine((url) => new URL(url).hostname !== 'github.com' || GITHUB_LINK.test(url), 'GitHub links point at a repo, main or a pinned commit'),
  })
  .strict();

const collection = z.enum(COLLECTION_KEYS);

export const ProjectManifestSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1).max(60),
    /** the contribution in one sentence: the page's dek and its meta description */
    dek: z.string().min(1).max(220),
    /** the card's two lines */
    summary: z.string().min(1).max(180),
    /** the canonical collection; the project's folder sits under it */
    collection,
    /** other collections that list it, linking to the one canonical page */
    alsoIn: z.array(collection).max(3),
    /** its place in its own collection, from 1 */
    order: z.number().int().min(1),
    evidence: z.enum(Object.keys(PROJECT_EVIDENCE) as [keyof typeof PROJECT_EVIDENCE, ...(keyof typeof PROJECT_EVIDENCE)[]]),
    /** source first; the original system, a paper or a package after it */
    links: z.array(link).min(1).max(3),
  })
  .strict()
  .refine((m) => !m.alsoIn.includes(m.collection), { message: 'A project is not cross-listed into its own collection', path: ['alsoIn'] });

export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;
