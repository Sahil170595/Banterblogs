import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

export interface Episode {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  commit: string;
  preview: string;
  content: string;
  filesChanged: number;
  linesAdded: number;
  complexity: number;
  tags: string[];
  readingTime: number;
}

const postsDirectory = path.join(process.cwd(), 'posts');

export async function getAllEpisodes(): Promise<Episode[]> {
  const fileNames = fs.readdirSync(postsDirectory);
  const episodes = await Promise.all(
    fileNames
      .filter(name => name.endsWith('.md'))
      .map(async (fileName) => {
        const id = parseInt(fileName.replace(/[^\d]/g, ''), 10);
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        
        // Parse markdown
        const { content } = matter(fileContents);
        
        // Process content with enhanced markdown pipeline
        const processedContent = await unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkRehype)
          .use(rehypeHighlight, { 
            detect: true,
            subset: false,
            ignoreMissing: true
          })
          .use(rehypeStringify)
          .process(content);
        
        const htmlContent = processedContent.toString();
        
        // Extract metadata using robust multi-format parser
        const metadata = parseEpisodeMetadata(content);
        
        // Extract preview text
        const whyItMattersIndex = content.indexOf('### Why It Matters');
        let preview = '';
        if (whyItMattersIndex !== -1) {
          const previewStart = content.indexOf('\n', whyItMattersIndex) + 1;
          const previewEnd = content.indexOf('---', previewStart);
          if (previewEnd !== -1) {
            preview = content.substring(previewStart, previewEnd).trim();
          }
        }
        
        // Calculate reading time (average 200 words per minute)
        const wordCount = content.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200);
        
        // Extract tags from content
        const tags: string[] = [];
        if (content.includes('banterpacks')) tags.push('banterpacks');
        if (content.includes('AI') || content.includes('LLM')) tags.push('ai');
        if (content.includes('development') || content.includes('code')) tags.push('development');
        if (content.includes('architecture')) tags.push('architecture');
        if (content.includes('testing')) tags.push('testing');
        if (content.includes('deployment')) tags.push('deployment');
        
        return {
          id,
          slug: `episode-${id.toString().padStart(3, '0')}`,
          title: titleMatch ? titleMatch[1] : `Episode ${id}`,
          subtitle: subtitleMatch ? subtitleMatch[1].replace(/^\*/, '').replace(/\*$/, '') : 'Development Update',
          date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
          commit: commitMatch ? commitMatch[1] : '',
          preview: preview.length > 200 ? preview.substring(0, 200) + '...' : preview,
          content: htmlContent,
          filesChanged: filesChangedMatch ? parseInt(filesChangedMatch[1]) : 0,
          linesAdded: linesAddedMatch ? parseInt(linesAddedMatch[1].replace(/,/g, '')) : 0,
          complexity: complexityMatch ? parseInt(complexityMatch[1]) : 0,
          tags,
          readingTime,
        };
      })
  );
  
  return episodes.sort((a, b) => a.id - b.id);
}

export async function getEpisode(slug: string): Promise<Episode | null> {
  const episodes = await getAllEpisodes();
  return episodes.find(episode => episode.slug === slug) || null;
}

export function getEpisodeStats(episodes: Episode[]) {
  const totalEpisodes = episodes.length;
  const totalFilesChanged = episodes.reduce((sum, ep) => sum + ep.filesChanged, 0);
  const totalLinesAdded = episodes.reduce((sum, ep) => sum + ep.linesAdded, 0);
  const totalComplexity = episodes.reduce((sum, ep) => sum + ep.complexity, 0);
  const totalReadingTime = episodes.reduce((sum, ep) => sum + ep.readingTime, 0);
  const avgComplexity = totalEpisodes === 0 ? 0 : Math.round(totalComplexity / totalEpisodes);
  
  return {
    totalEpisodes,
    totalFilesChanged,
    totalLinesAdded,
    avgComplexity,
    totalReadingTime,
  };
}
