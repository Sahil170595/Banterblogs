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

// Robust multi-format episode metadata parser
function parseEpisodeMetadata(content: string) {
  const metadata: {
    title?: string;
    subtitle?: string;
    date?: string;
    commit?: string;
    filesChanged?: number;
    linesAdded?: number;
    complexity?: number;
  } = {};
  
  // Try multiple title formats
  const titleFormats = [
    /^# Episode \d+: "(.+)"$/m,
    /^# Episode \d+: (.+)$/m,
    /^# (.+)$/m
  ];
  
  for (const format of titleFormats) {
    const match = content.match(format);
    if (match) {
      metadata.title = match[1];
      break;
    }
  }
  
  // Try multiple subtitle formats
  const subtitleFormats = [
    /^## (.+)$/m,
    /^### (.+)$/m
  ];
  
  for (const format of subtitleFormats) {
    const match = content.match(format);
    if (match) {
      metadata.subtitle = match[1].replace(/^\*/, '').replace(/\*$/, '');
      break;
    }
  }
  
  // Try multiple date formats
  const dateFormats = [
    /### 📅 (.+?) at/m,
    /### Date: (.+?) at/m,
    /## Date: (.+?) at/m,
    /📅 (.+?) at/m
  ];
  
  for (const format of dateFormats) {
    const match = content.match(format);
    if (match) {
      try {
        metadata.date = new Date(match[1]).toISOString();
        break;
      } catch {
        // Try next format
      }
    }
  }
  
  // Try multiple commit formats
  const commitFormats = [
    /### 🔗 Commit: `(.+?)`/m,
    /### Commit: `(.+?)`/m,
    /## Commit: `(.+?)`/m,
    /🔗 Commit: `(.+?)`/m
  ];
  
  for (const format of commitFormats) {
    const match = content.match(format);
    if (match) {
      metadata.commit = match[1];
      break;
    }
  }
  
  // Try multiple files changed formats
  const filesChangedFormats = [
    /- \*\*Files Changed\*\*: (\d+)/,
    /- Files Changed: (\d+)/,
    /Files Changed: (\d+)/,
    /\*\*Files Changed\*\*: (\d+)/
  ];
  
  for (const format of filesChangedFormats) {
    const match = content.match(format);
    if (match) {
      metadata.filesChanged = parseInt(match[1]);
      break;
    }
  }
  
  // Try multiple lines added formats
  const linesAddedFormats = [
    /- \*\*Lines Added\*\*: ([\d,]+)/,
    /- Lines Added: ([\d,]+)/,
    /Lines Added: ([\d,]+)/,
    /\*\*Lines Added\*\*: ([\d,]+)/
  ];
  
  for (const format of linesAddedFormats) {
    const match = content.match(format);
    if (match) {
      metadata.linesAdded = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Try multiple complexity formats
  const complexityFormats = [
    /- \*\*Complexity Score\*\*: (\d+)/,
    /- Complexity Score: (\d+)/,
    /Complexity Score: (\d+)/,
    /\*\*Complexity Score\*\*: (\d+)/
  ];
  
  for (const format of complexityFormats) {
    const match = content.match(format);
    if (match) {
      metadata.complexity = parseInt(match[1]);
      break;
    }
  }
  
  return metadata;
}

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
          title: metadata.title || `Episode ${id}`,
          subtitle: metadata.subtitle || 'Development Update',
          date: metadata.date || new Date().toISOString(),
          commit: metadata.commit || '',
          preview: preview.length > 200 ? preview.substring(0, 200) + '...' : preview,
          content: htmlContent,
          filesChanged: metadata.filesChanged || 0,
          linesAdded: metadata.linesAdded || 0,
          complexity: metadata.complexity || 0,
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
