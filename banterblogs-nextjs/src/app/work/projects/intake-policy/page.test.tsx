import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import IntakePolicyPage from './page';
import manifest from './project.json';
import { CASES } from '@/lib/projects/intake-policy/cases';
import { evaluate } from '@/lib/projects/intake-policy/engine';
import { routeLabels } from '@/lib/projects/intake-policy/model';

vi.mock('@/components/projects/intake-policy/IntakeLab', () => ({ default: () => <section id="demo" /> }));

describe('server-rendered technical study', () => {
  it('renders original architecture and new synthetic findings independently of client JavaScript', () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<IntakePolicyPage />), 'text/html');
    for (const anchor of ['demo', 'underlying-system', 'findings', 'method', 'reproduce']) expect(document.getElementById(anchor)).toBeTruthy();
    const rows = document.querySelectorAll('#findings tbody tr');
    expect(rows.length).toBe(CASES.length);
    CASES.forEach((c, index) => {
      const r = evaluate(c.features);
      const cells = Array.from(rows[index].children).map(cell => cell.textContent);
      expect(cells).toEqual([c.title, r.priority, r.operationalScore === null ? 'Bypassed' : String(r.operationalScore), routeLabels[r.route], String(r.resources.length)]);
    });
    expect(document.getElementById('underlying-system')?.textContent).toContain('local wrappers and stubs');
    expect(document.getElementById('method')?.textContent).toContain('independently authored');
    expect(document.querySelector('article')?.textContent?.length).toBeGreaterThan(10_000);
  });
  it('has the exact public manifest contract and a demo-code source URL', () => {
    expect(Object.keys(manifest).sort()).toEqual(['slug', 'title', 'summary', 'categories', 'roles', 'status', 'runtime', 'sourceUrl'].sort());
    expect(manifest.slug).toBe('intake-policy');
    expect(manifest.runtime).toBe('browser-simulation');
    expect(manifest.sourceUrl).toContain('Banterblogs/tree/codex/demo-intake-policy');
  });
});
