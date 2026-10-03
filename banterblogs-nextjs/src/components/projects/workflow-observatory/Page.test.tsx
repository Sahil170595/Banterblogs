import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from '@/app/work/projects/workflow-observatory/page';
import manifest from '@/app/work/projects/workflow-observatory/project.json';
import { DEMO_SOURCE, ORIGINAL_SOURCE } from '@/lib/projects/workflow-observatory/engine';

describe('server-rendered portfolio contract', () => {
  it('renders underlying engineering, fresh counterexamples and anchor targets', () => {
    const html = renderToStaticMarkup(<Page />);
    for (const id of ['demo', 'findings', 'method', 'reproduce']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('Underlying system: Parallax');
    expect(html).toContain('Fallback navigation is not autonomous planning.');
    expect(html).toContain('Source-derived findings, not a new benchmark');
    expect(html).toContain(ORIGINAL_SOURCE);
    expect(html).toContain(DEMO_SOURCE);
    expect(html.match(/<tbody>[\s\S]*?<\/tbody>/g)?.at(-1)?.match(/<tr>/g)).toHaveLength(5);
  });
  it('uses exactly the manifest schema and full public source repository', () => {
    expect(Object.keys(manifest).sort()).toEqual(['slug', 'title', 'summary', 'categories', 'roles', 'status', 'runtime', 'sourceUrl'].sort());
    expect(manifest.slug).toBe('workflow-observatory');
    expect(manifest.runtime).toBe('browser-application');
    expect(manifest.sourceUrl).toBe('https://github.com/Sahil170595/Parallax');
  });
});
