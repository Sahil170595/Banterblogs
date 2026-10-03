import { CollectionGrid } from '@/components/projects/CollectionGrid';
import { readProjectCatalog } from '@/lib/projects/catalog';
import { hubMetadata } from '@/lib/projects/metadata';

export const metadata = hubMetadata();

export default function ProjectsHub() {
  return <CollectionGrid label="All projects" projects={readProjectCatalog()} />;
}
