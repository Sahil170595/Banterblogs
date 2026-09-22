import { describe, it, expect } from 'vitest';
import {
    getEpisodeStats,
    extractPrimaryHeading,
    extractHeadings,
    extractHtmlHeadings,
    renderMarkdownToHtml,
    cleanHeading,
    Episode,
} from '../episodes';

// One markdown document with a page-owned title, an in-body TOC between two
// rules, and three real sections.
const TOC_DOC = [
    '# Report', '', '---', '',
    '## 2. Table of Contents', '', '- [Intro](#intro)', '- [Results](#results)', '', '---', '',
    '## Intro', '', 'Body.', '', '## Results', '', 'More.', '', '## Discussion', '', 'End.',
].join('\n');

describe('markdown reading surface', () => {
    describe('tables', () => {
        it('wraps every table in its own horizontal scroll container', async () => {
            const html = await renderMarkdownToHtml('| a | b |\n|---|---|\n| x | 1 |\n\n| c |\n|---|\n| y |\n');
            expect(html.match(/<div class="table-scroll"[^>]*><table>/g)).toHaveLength(2);
        });

        // re-judge P1-8: WebKit will not focus a scroll box without a
        // tabindex, so the columns past its edge were out of keyboard reach
        it('makes each scroll box a named region the keyboard can reach, numbered in reading order', async () => {
            const host = document.createElement('div');
            host.innerHTML = await renderMarkdownToHtml('| a | b |\n|---|---|\n| x | 1 |\n\nText.\n\n| c |\n|---|\n| y |\n');
            const boxes = [...host.querySelectorAll('.table-scroll')];
            expect(boxes.map((box) => box.getAttribute('role'))).toEqual(['region', 'region']);
            expect(boxes.map((box) => box.getAttribute('tabindex'))).toEqual(['0', '0']);
            expect(boxes.map((box) => box.getAttribute('aria-label'))).toEqual(['Table 1', 'Table 2']);
        });

        it('marks numeric columns, header included, and leaves text columns alone', async () => {
            const html = await renderMarkdownToHtml([
                '| Model | Rate | Delta | Note |',
                '|---|---|---|---|',
                '| llama3.2-1b | 1.68% | +4.2 pp | ok |',
                '| qwen2.5-7b | 0.42% | −3.1pp | 12 ms |',
                '| phi-4 | 1,348,000 | 0.69 ± 0.03 | n/a |',
                '| mistral-7b | 2.1× | 1.2e-5 | fine |',
                '| gemma3 | 12 GB | — | slow |',
            ].join('\n'));
            // Rate and Delta: header + 5 body cells each ("—" is a blank, not a miss).
            expect(html.match(/class="num"/g)).toHaveLength(12);
            expect(html).toContain('<th class="num">Rate</th>');
            expect(html).toContain('<th class="num">Delta</th>');
            expect(html).toContain('<th>Model</th>');
            expect(html).toContain('<td>12 ms</td>');
        });

        it('right-aligns a column at exactly the 80% threshold but not below it', async () => {
            const column = (cells: string[]) => ['| v |', '|---|', ...cells.map((c) => `| ${c} |`)].join('\n');
            expect(await renderMarkdownToHtml(column(['1', '2', '3', '4', 'x']))).toContain('<th class="num">v</th>');
            expect(await renderMarkdownToHtml(column(['1', '2', '3', 'x', 'y']))).toContain('<th>v</th>');
        });

        it('keeps an author-set column alignment instead of inferring one', async () => {
            const html = await renderMarkdownToHtml('| n |\n|:---:|\n| 1 |\n| 2 |\n');
            expect(html).not.toContain('class="num"');
            expect(html).toContain('align="center"');
        });
    });

    describe('one title per page', () => {
        it('demotes markdown h1 to h2 when the page renders its own title', async () => {
            const html = await renderMarkdownToHtml('# Title\n\n## Section\n\ntext', { demoteH1: true });
            expect(html).not.toMatch(/<h1[\s>]/);
            expect(html).toMatch(/<h2 id="title"[^>]*>Title<\/h2>/);
        });

        it('keeps the h1 for pages that take their title from the markdown', async () => {
            expect(await renderMarkdownToHtml('# Title\n\ntext')).toContain('<h1 id="title">Title</h1>');
        });

        it('keeps a demoted title out of the in-page heading list', async () => {
            const html = await renderMarkdownToHtml('# Title\n\n## Section\n', { demoteH1: true });
            expect(extractHtmlHeadings(html).map((h) => h.text)).toEqual(['Section']);
        });

        // the contents list is text: "Quality &#x26; Standards" showed its entity
        it('reads heading text as text, entities decoded', async () => {
            const html = await renderMarkdownToHtml('## Quality & Standards\n\n## A < B "quoted"\n');
            expect(extractHtmlHeadings(html).map((h) => h.text)).toEqual(['Quality & Standards', 'A < B "quoted"']);
        });
    });

    // 267 of the 291 episode titles end in a quoted name; stripping every
    // trailing quote left them unbalanced (Episode 1: "The Architect's Blueprint)
    describe('episode titles', () => {
        it('keeps a quoted name whole', () => {
            expect(cleanHeading('Episode 1: "The Architect\'s Blueprint"')).toBe('Episode 1: "The Architect\'s Blueprint"');
            expect(cleanHeading('Episode 001: Preliminary Data Review')).toBe('Episode 001: Preliminary Data Review');
        });

        it('still unwraps a heading set wholly in quotes or bold', () => {
            expect(cleanHeading('"The Title"')).toBe('The Title');
            expect(cleanHeading('**The Title**')).toBe('The Title');
            expect(cleanHeading('**"The Title"**')).toBe('The Title');
        });
    });

    describe('one table of contents per page', () => {
        it('drops the markdown TOC through the end of its list and merges the rules around it', async () => {
            const html = await renderMarkdownToHtml(TOC_DOC, { dropInlineToc: true });
            expect(html).not.toMatch(/table of contents/i);
            expect(html).not.toContain('href="#intro"');
            expect(html.match(/<hr>/g)).toHaveLength(1);
            expect(html).toContain('<h2 id="intro">Intro</h2>');
        });

        it('drops grouped TOCs (label paragraphs between lists) under an h3', async () => {
            const html = await renderMarkdownToHtml([
                '### Table of Contents', '', '**Part I**', '', '1. [A](#a)', '', '**Part II**', '', '2. [B](#b)',
                '', '---', '', '## A', '', 'x', '', '## B', '', 'y',
            ].join('\n'), { dropInlineToc: true });
            expect(html).not.toContain('Part I');
            expect(html).not.toContain('href="#b"');
            expect(html).toContain('<hr>');
            expect(html).toContain('<h2 id="b">B</h2>');
        });

        it('keeps blocks after the list that are not part of the TOC', async () => {
            const html = await renderMarkdownToHtml(
                '## Table of Contents\n\n- [A](#a)\n\n> A note that stays.\n\n## A\n\nx',
                { dropInlineToc: true },
            );
            expect(html).toContain('A note that stays.');
            expect(html).not.toContain('href="#a"');
        });

        it('leaves the markdown TOC in place when the page shows no TOC of its own', async () => {
            expect(await renderMarkdownToHtml(TOC_DOC)).toContain('2. Table of Contents');
        });

        it('omits the markdown TOC heading from the sidebar headings', () => {
            expect(extractHeadings(TOC_DOC).map((h) => h.id)).toEqual(['intro', 'results', 'discussion']);
        });
    });
});

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
