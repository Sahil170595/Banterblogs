import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from '@/app/work/projects/code-verification/page';
import manifest from '@/app/work/projects/code-verification/project.json';
import { SOURCE_URL } from '@/lib/projects/code-verification/engine';

describe('public route contract', () => {
  it('server renders the substantive article and all collection anchor targets', () => {
    const html = renderToStaticMarkup(<Page />);
    for (const id of ['demo', 'findings', 'method', 'reproduce']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('Synthesis is differential evaluation, not model generation');
    expect(html).toContain('Failure cases and limits');
    expect(html).toContain('Underlying system: isolated repository verification');
    expect(html).toContain('Historical saved-run findings');
    expect(html).toContain('288/288');
    expect(html).toContain('neutral-v1');
    const tables = html.match(/<tbody>[\s\S]*?<\/tbody>/g);
    expect(tables).toHaveLength(2);
    expect(tables?.[0].match(/<tr>/g)).toHaveLength(5);
    expect(tables?.[1].match(/<tr>/g)).toHaveLength(8);
    expect(html).not.toContain('function interval');
  });
  it('links the full public repository separately from browser engine sources', () => {
    expect(Object.keys(manifest).sort()).toEqual(['slug', 'title', 'summary', 'categories', 'roles', 'status', 'runtime', 'sourceUrl'].sort());
    expect(manifest.slug).toBe('code-verification');
    expect(manifest.status).toBe('interactive');
    expect(manifest.runtime).toBe('browser-evaluation');
    expect(manifest.sourceUrl).toBe('https://github.com/Sahil170595/patchglass');
    expect(SOURCE_URL).toContain('/tree/codex/demo-code-verification/banterblogs-nextjs/src/lib/projects/code-verification');
  });
});
