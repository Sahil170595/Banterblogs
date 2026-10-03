import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Page from './page';
import project from './project.json';

describe('published retrieval project contract', () => {
  it('renders a substantial article and all deep links on the server', () => {
    const html = renderToStaticMarkup(<Page />);
    for (const id of ['demo', 'findings', 'method', 'reproduce']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('href="/work"');
    expect(html).toContain('Voyage');
    expect(html).toContain('Turbopuffer');
    expect(html).toContain('pre-scorer');
    expect(html).toContain('not a held-out relevance evaluation');
    expect(html).not.toMatch(/https:\/\/api\.|Authorization|rerankSummary|config_path/);
    expect(html.length).toBeGreaterThan(15000);
  });
  it('has only the exact manifest keys and an honest runtime', () => {
    expect(Object.keys(project).sort()).toEqual(['slug', 'title', 'summary', 'categories', 'roles', 'status', 'runtime', 'sourceUrl'].sort());
    expect(project.slug).toBe('retrieval-ranking');
    expect(project.runtime).toBe('browser-application');
    expect(project.categories).toEqual(['retrieval', 'systems']);
    expect(project.title).not.toMatch(/^Banter/);
    expect(project.sourceUrl).toContain('codex/demo-retrieval-ranking/banterblogs-nextjs/src/lib/projects/retrieval-ranking');
  });
});
