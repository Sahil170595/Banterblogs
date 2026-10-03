import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionGrid } from '@/components/projects/CollectionGrid';
import { collectionsWithProjects, projectsIn, readProjectCatalog } from '@/lib/projects/catalog';
import { getCollection, isCollectionKey } from '@/lib/projects/collections';
import { collectionMetadata } from '@/lib/projects/metadata';

// One page per collection that lists a project. Any other path renders
// notFound() below: dynamicParams = false would 404 too, but logs an internal
// NoFallbackError on the server for every miss.
export function generateStaticParams() {
  return collectionsWithProjects(readProjectCatalog()).map((c) => ({ collection: c.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }): Promise<Metadata> {
  const { collection } = await params;
  return isCollectionKey(collection) ? collectionMetadata(getCollection(collection)) : {};
}

export default async function CollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection: key } = await params;
  if (!isCollectionKey(key)) notFound();
  const collection = getCollection(key);
  const projects = projectsIn(readProjectCatalog(), key);
  if (projects.length === 0) notFound();
  // the head above the tabs titles and describes the collection (HubHead)
  return <CollectionGrid label={collection.label} projects={projects} collection={key} />;
}
