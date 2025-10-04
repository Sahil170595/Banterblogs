> eslint

$ npm run build

> banterblogs-nextjs@0.1.0 build
> next build


> Build error occurred
[TypeError: generate is not a function]
$ cd banterblogs-nextjs
cd : Cannot find path 'C:\Users\sahil\OneDrive\Documents\GitHub\Banterblogs\banterblogs-nextjs\banterblogs-nextjs' 
because it does not exist.
At C:\Users\sahil\AppData\Local\Temp\ps-script-4ef8b346-08c3-49ce-a926-376fafb5be2b.ps1:92 char:1
+ cd banterblogs-nextjs
+ ~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\Users\sahil\...terblogs-nextjs:String) [Set-Location], ItemNotFoundE 
   xception
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.SetLocationCommand
 
$ npm run dev -- -p 3001
$ import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { Hero } from '@/components/Hero';
import { OnboardingWrapper } from '@/components/OnboardingWrapper';
import { MetricTicker } from '@/components/MetricTicker';
import { SystemsShowcase } from '@/components/SystemsShowcase';
import { EpisodeSpotlight } from '@/components/EpisodeSpotlight';
import { RoadmapRail } from '@/components/RoadmapRail';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);
  const sortedByNewest = [...episodes].sort((a, b) => b.id - a.id);
  const latestEpisode = sortedByNewest[0];

  return (
    <div className="flex flex-col">
      <OnboardingWrapper />
      <Hero stats={stats} latestEpisode={latestEpisode} />
      <MetricTicker
        totalEpisodes={stats.totalEpisodes}
        totalLines={stats.totalLinesAdded}
        avgComplexity={stats.avgComplexity}
        latestEpisode={latestEpisode}
      />
      <SystemsShowcase />
      <EpisodeSpotlight episodes={sortedByNewest} />
      <RoadmapRail />
    </div>
  );
}