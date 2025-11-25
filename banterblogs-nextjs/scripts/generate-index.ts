import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../src/config/site';

// Simplified types for the index
interface IndexedEpisode {
    id: number;
    slug: string;
    title: string;
    date: string;
    platform: 'banterpacks' | 'chimera';
    tags: string[];
    preview: string;
}

const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'content-index.json');

function ensureDirectoryExistence(filePath: string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function extractPreview(content: string): string {
    // Simple preview extraction logic (simplified from episodes.ts)
    const paragraphs = content.split(/\n{2,}/).filter(p => p.trim() && !p.startsWith('#') && !p.startsWith('---'));
    return paragraphs[0]?.slice(0, 200) + '...' || '';
}

async function generateIndex() {
    console.log('Generating content index...');
    const episodes: IndexedEpisode[] = [];

    // 1. Process Banterpacks
    if (fs.existsSync(siteConfig.paths.banterpacks)) {
        const files = fs.readdirSync(siteConfig.paths.banterpacks).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const content = fs.readFileSync(path.join(siteConfig.paths.banterpacks, file), 'utf8');
            const { data, content: markdown } = matter(content);
            const id = parseInt(file.replace(/[^\d]/g, ''), 10);

            episodes.push({
                id,
                slug: data.slug || `episode-${id.toString().padStart(3, '0')}`,
                title: data.title || `Episode ${id}`,
                date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
                platform: 'banterpacks',
                tags: (data.tags as string[]) || [],
                preview: data.preview || extractPreview(markdown)
            });
        }
    }

    // 2. Process Chimera
    if (fs.existsSync(siteConfig.paths.chimera)) {
        const files = fs.readdirSync(siteConfig.paths.chimera).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const content = fs.readFileSync(path.join(siteConfig.paths.chimera, file), 'utf8');
            const { data, content: markdown } = matter(content);
            const originalId = parseInt(file.replace(/[^\d]/g, ''), 10);
            const id = originalId + 10000; // Offset

            episodes.push({
                id,
                slug: data.slug || `chimera-episode-${originalId.toString().padStart(3, '0')}`,
                title: data.title || `Chimera Episode ${originalId}`,
                date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
                platform: 'chimera',
                tags: (data.tags as string[]) || [],
                preview: data.preview || extractPreview(markdown)
            });
        }
    }

    // Sort by ID
    episodes.sort((a, b) => a.id - b.id);

    ensureDirectoryExistence(OUTPUT_PATH);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(episodes, null, 2));
    console.log(`Generated index with ${episodes.length} episodes at ${OUTPUT_PATH}`);
}

generateIndex();
