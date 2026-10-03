import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from './page';
import project from './project.json';
import { DEFAULT_CONFIG, evaluate, formatNumber } from '@/lib/projects/offline-policy-evaluation/engine';

describe('public server-rendered route', () => {
  it('renders the actual evaluator and substantive findings without client hydration', () => {
    const html = renderToStaticMarkup(<Page />);
    const document = new DOMParser().parseFromString(html, 'text/html');
    for (const id of ['demo', 'underlying-system', 'findings', 'method', 'reproduce']) expect(document.getElementById(id)).not.toBeNull();
    expect(document.querySelector('article')?.textContent).toContain('This implementation is neither FQE nor sequential doubly robust');
    expect(document.querySelector('#findings')?.textContent).toContain(formatNumber(evaluate(DEFAULT_CONFIG).comparisons[0].result.normalized));
    expect(document.querySelectorAll('article p').length).toBeGreaterThan(15);
    expect(document.querySelector('input[aria-label="Intervention probability"]')).not.toBeNull();
    expect(document.querySelector('a[href="/work"]')).not.toBeNull();
    const underlying = document.querySelector('#underlying-system')?.textContent;
    expect(underlying).toContain('25,200 training records');
    expect(underlying).toContain('sequential doubly robust');
    expect(underlying).toContain('not a robust winner');
    expect(underlying).toContain('omits local language-model inference');
  });
  it('has the exact discovery schema and full public evaluator source', () => {
    expect(Object.keys(project).sort()).toEqual(['slug', 'title', 'summary', 'categories', 'roles', 'status', 'runtime', 'sourceUrl'].sort());
    expect(project.runtime).toBe('browser-evaluation');
    expect(project.slug).toBe('offline-policy-evaluation');
    expect(project.sourceUrl).toBe('https://github.com/Sahil170595/counterledger-ope');
  });
});
