import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Page from './page';
import manifest from './project.json';

describe('server-rendered spreadsheet project', () => {
  it('includes substantive findings and reproduction without client execution', () => {
    const html = renderToStaticMarkup(<Page />);
    for (const section of ['demo', 'underlying', 'findings', 'method', 'reproduce']) expect(html).toContain(`id="${section}"`);
    expect(html).toContain('2 true positives, 1 false positive, 0 false negatives, and 8 true negatives');
    expect(html).toContain('0.80');
    expect(html).toContain('not actual model output');
    expect(html).toContain('7 July 2026');
    expect(html).toContain('task-macro F1 0.885');
    expect(html).toContain('not a pristine held-out estimate');
  });
  it('uses the exact public manifest interface and an owned source branch', () => {
    expect(Object.keys(manifest).sort()).toEqual(['slug', 'title', 'summary', 'categories', 'roles', 'status', 'runtime', 'sourceUrl'].sort());
    expect(manifest.sourceUrl).toContain('/tree/codex/demo-spreadsheet-reasoning/');
    expect(manifest.runtime).toBe('browser-evaluation');
  });
});
