import { describe, it, expect } from 'vitest';
import { getEpisodeStats, extractPrimaryHeading, Episode } from '../episodes';

describe('episodes.ts', () => {
    describe('extractPrimaryHeading', () => {
        it('should extract the first h1 heading', () => {
            const markdown = '# Hello World\nSome content';
            expect(extractPrimaryHeading(markdown)).toBe('Hello World');
        });

        it('should return undefined if no h1 is found', () => {
            const markdown = '## Subheading\nSome content';
            expect(extractPrimaryHeading(markdown)).toBeUndefined();
        });
    });

    describe('getEpisodeStats', () => {
        it('should correctly calculate total stats', () => {
            const episodes: Episode[] = [
                {
                    id: 1,
                    slug: 'ep-1',
                    title: 'Ep 1',
                    subtitle: 'Sub 1',
                    date: '2023-01-01',
                    commit: 'abcdef',
                    preview: 'preview',
                    content: 'content',
                    filesChanged: 10,
                    linesAdded: 100,
                    complexity: 5,
                    tags: [],
                    readingTime: 5,
                },
                {
                    id: 2,
                    slug: 'ep-2',
                    title: 'Ep 2',
                    subtitle: 'Sub 2',
                    date: '2023-01-02',
                    commit: '123456',
                    preview: 'preview',
                    content: 'content',
                    filesChanged: 20,
                    linesAdded: 50,
                    complexity: 15,
                    tags: [],
                    readingTime: 10,
                },
            ];

            const stats = getEpisodeStats(episodes);

            expect(stats).toEqual({
                totalEpisodes: 2,
                totalFilesChanged: 30, // 10 + 20
                totalLinesAdded: 150, // 100 + 50
                avgComplexity: 10, // (5 + 15) / 2
                totalReadingTime: 15, // 5 + 10
            });
        });

        it('should handle empty episode list', () => {
            const stats = getEpisodeStats([]);
            expect(stats).toEqual({
                totalEpisodes: 0,
                totalFilesChanged: 0,
                totalLinesAdded: 0,
                avgComplexity: 0,
                totalReadingTime: 0,
            });
        });
    });
});
