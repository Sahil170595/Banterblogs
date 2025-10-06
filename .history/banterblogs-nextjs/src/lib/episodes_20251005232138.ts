import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { cache } from 'react';

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
    /^# Chimera - Episode \d+: "(.+)"$/m,
    /^# Chimera - Episode \d+: (.+)$/m,
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

export const getAllEpisodes = cache(async (): Promise<Episode[]> => {
  const episodes: Episode[] = [];
  
  // Process Banterpacks episodes
  const banterpacksDir = path.join(postsDirectory, 'banterpacks');
  if (fs.existsSync(banterpacksDir)) {
    const banterpacksFiles = fs.readdirSync(banterpacksDir);
    const banterpacksEpisodes = await Promise.all(
      banterpacksFiles
        .filter(name => name.endsWith('.md'))
        .map(async (fileName) => {
          const id = parseInt(fileName.replace(/[^\d]/g, ''), 10);
          const fullPath = path.join(banterpacksDir, fileName);
          const fileContents = fs.readFileSync(fullPath, 'utf8');
          
          const episode = await processEpisodeFile(fileContents, id, 'banterpacks');
          return episode;
        })
    );
    episodes.push(...banterpacksEpisodes);
  }
  
  // Process Chimera episodes
  const chimeraDir = path.join(postsDirectory, 'chimera');
  if (fs.existsSync(chimeraDir)) {
    const chimeraFiles = fs.readdirSync(chimeraDir);
    const chimeraEpisodes = await Promise.all(
      chimeraFiles
        .filter(name => name.endsWith('.md'))
        .map(async (fileName) => {
          const originalId = parseInt(fileName.replace(/[^\d]/g, ''), 10);
          // Give Chimera episodes IDs starting from 1000 to avoid conflicts with Banterpacks
          const id = originalId + 1000;
          const fullPath = path.join(chimeraDir, fileName);
          const fileContents = fs.readFileSync(fullPath, 'utf8');
          
          const episode = await processEpisodeFile(fileContents, id, 'chimera', originalId);
          return episode;
        })
    );
    episodes.push(...chimeraEpisodes);
  }
  
  return episodes.sort((a, b) => a.id - b.id);
});

async function processEpisodeFile(fileContents: string, id: number, platform: 'banterpacks' | 'chimera', originalId?: number): Promise<Episode> {
  // Parse markdown
  const { content } = matter(fileContents);
  
  // Simple markdown-to-HTML conversion for build stability
  let htmlContent = '';
  try {
    // Basic markdown conversion using simple regex rules
    htmlContent = content
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/\n/g, '<br/>');
  } catch (error) {
    console.warn(`Content processing failed for episode ${id}:`, error);
    htmlContent = `<pre>${content}</pre>`;
  }
  
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
  if (content.includes('chimera')) tags.push('chimera');
  if (content.includes('AI') || content.includes('LLM')) tags.push('ai');
  if (content.includes('development') || content.includes('code')) tags.push('development');
  if (content.includes('architecture')) tags.push('architecture');
  if (content.includes('testing')) tags.push('testing');
  if (content.includes('deployment')) tags.push('deployment');
  
  // Generate appropriate slug based on platform
  const slug = platform === 'chimera' 
    ? `chimera-episode-${id.toString().padStart(3, '0')}`
    : `episode-${id.toString().padStart(3, '0')}`;
  
  return {
    id,
    slug,
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
