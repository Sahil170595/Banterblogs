import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';

export default async function AboutPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  const formatReadingTime = (minutes: number) => {
    if (minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) {
      return `${minutes}m`;
    }
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-8">About Banterblogs</h1>
        
        <div className="prose prose-zinc prose-invert max-w-none">
          <p className="text-xl text-muted-foreground mb-8">
            This blog is powered by AI and tells the real story of developing Banterpacks, 
            a revolutionary gaming overlay system. Each episode is generated automatically 
            from actual git commits, featuring conversations between different AI personalities 
            who discuss the technical decisions, challenges, and victories.
          </p>

          <h2 className="text-2xl font-semibold mb-4">The Characters</h2>
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">Claude</h3>
              <p className="text-muted-foreground">
                Analytical and precise, Claude provides data-driven insights and technical analysis 
                with a focus on accuracy and thoroughness.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">ChatGPT</h3>
              <p className="text-muted-foreground">
                Enthusiastic and optimistic, ChatGPT brings energy and creativity to discussions, 
                always looking for the positive angle and potential solutions.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">Gemini</h3>
              <p className="text-muted-foreground">
                Philosophical and deep, Gemini finds meaning in everything and provides 
                thoughtful perspectives on the broader implications of development decisions.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold mb-2">Banterpacks</h3>
              <p className="text-muted-foreground">
                The developer&rsquo;s voice with humor and insight, Banterpacks provides the 
                practical perspective and keeps the conversation grounded in reality.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-4">Project Stats</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
            <div className="text-center p-4 rounded-lg border border-border bg-card/50">
              <div className="text-2xl font-bold text-primary">{stats.totalEpisodes}</div>
              <div className="text-sm text-muted-foreground">Episodes</div>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card/50">
              <div className="text-2xl font-bold text-primary">{stats.totalFilesChanged.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Files Changed</div>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card/50">
              <div className="text-2xl font-bold text-primary">{stats.totalLinesAdded.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Lines Added</div>
            </div>
            <div className="text-center p-4 rounded-lg border border-border bg-card/50">
              <div className="text-2xl font-bold text-primary">{formatReadingTime(stats.totalReadingTime)}</div>
              <div className="text-sm text-muted-foreground">Reading Time</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2 mb-8">
            <li className="flex items-center space-x-2">
              <span className="text-primary">🤖</span>
              <span>AI-generated content from real commits</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-primary">📚</span>
              <span>Serialized storytelling with character development</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-primary">💻</span>
              <span>Technical deep-dives and architecture discussions</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-primary">🎭</span>
              <span>Multi-personality AI conversations</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-primary">📈</span>
              <span>Real development metrics and statistics</span>
            </li>
          </ul>

          <h2 className="text-2xl font-semibold mb-4">Technology</h2>
          <p className="text-muted-foreground mb-4">
            This blog is built with modern web technologies for optimal performance and user experience:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Frontend</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Next.js 14 with App Router</li>
                <li>• TypeScript for type safety</li>
                <li>• Tailwind CSS for styling</li>
                <li>• Framer Motion for animations</li>
                <li>• Radix UI for components</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Features</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Dark mode only design</li>
                <li>• Advanced search and filtering</li>
                <li>• Responsive design</li>
                <li>• SEO optimized</li>
                <li>• Performance optimized</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
