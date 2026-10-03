import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Page from './page';
import manifest from './project.json';

describe('server-rendered scheduling article', () => {
  it('ships original architecture, truthful execution limits and computed fixture findings', () => {
    const html = renderToStaticMarkup(<Page />);
    for (const id of ['demo', 'underlying', 'findings', 'method', 'reproduce']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('handlers only log');
    expect(html).toContain('delivery and clock advancement are simulated only');
    expect(html).toContain('do not assert the advertised percentile threshold');
    expect(html).toContain('not NumPy-compatible');
    expect(html).toContain('invariant violations');
  });
  it('uses the exact public project contract', () => {
    expect(Object.keys(manifest).sort()).toEqual(['slug', 'title', 'summary', 'categories', 'roles', 'status', 'runtime', 'sourceUrl'].sort());
    expect(manifest.runtime).toBe('browser-simulation');
    expect(manifest.sourceUrl).toContain('codex/demo-scheduling-lab');
  });
});
