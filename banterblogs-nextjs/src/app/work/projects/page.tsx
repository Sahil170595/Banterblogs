import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { IntentLink } from '@/components/ui/IntentLink';
import { ProjectCatalog } from '@/components/projects/ProjectCatalog';
import { readProjectCatalog } from '@/lib/projectCatalog';

const DESCRIPTION = 'Interactive engineering projects with executable environments, inspectable evaluations, technical findings, and reproducible source.';
export const dynamic = 'force-static';
export const metadata: Metadata = {
  title: 'Projects', description: DESCRIPTION, alternates: { canonical: '/work/projects' },
  openGraph: { title: 'Projects | Chimeraforge', description: DESCRIPTION, url: 'https://chimeraforge.vercel.app/work/projects', type: 'website' },
};

export default function ProjectsPage() {
  return (
    <div className="container pb-24 pt-8 md:pt-12">
      <IntentLink href="/work" className="inline-flex items-center gap-2 text-copy-14 text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Work
      </IntentLink>
      <header className="mb-8 mt-8 max-w-3xl">
        <h1 className="text-heading-32 tracking-normal text-foreground">Projects</h1>
        <p className="mt-4 text-copy-16 text-prose">Environments, agents, and evaluation systems. Each project connects an executable demonstration to its methods, findings, and source.</p>
      </header>
      <ProjectCatalog projects={readProjectCatalog()} />
    </div>
  );
}
