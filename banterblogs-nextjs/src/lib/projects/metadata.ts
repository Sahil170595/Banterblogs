import type { Metadata } from 'next';
import type { Collection } from './collections';
import { projectHref } from './catalog';
import type { ProjectManifest } from './manifest';

// Every projects page's metadata from one place: canonical URL, Open Graph
// and Twitter cards, all on the site's own image.

const SITE = 'https://chimeraforge.vercel.app';
const SITE_NAME = 'Chimeraforge';
const OG_IMAGE = '/opengraph-image.png';

export const PROJECTS_TITLE = 'Projects';
export const PROJECTS_DESCRIPTION =
  'Interactive builds by Sahil Kadadekar across reinforcement learning, agent evaluation and systems. Each page runs the system live and says where its numbers come from.';

function pageMetadata(path: string, title: string, description: string, type: 'website' | 'article'): Metadata {
  const social = `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { images: [OG_IMAGE], title: social, description, url: `${SITE}${path}`, type },
    twitter: { card: 'summary_large_image', title: social, description },
  };
}

export function hubMetadata(): Metadata {
  return pageMetadata('/projects', PROJECTS_TITLE, PROJECTS_DESCRIPTION, 'website');
}

export function collectionMetadata(collection: Collection): Metadata {
  return pageMetadata(`/projects/${collection.key}`, collection.title, collection.description, 'website');
}

export function projectMetadata(project: ProjectManifest): Metadata {
  return pageMetadata(projectHref(project), project.title, project.dek, 'article');
}
