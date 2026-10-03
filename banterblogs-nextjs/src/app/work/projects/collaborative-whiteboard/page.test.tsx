import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from './page';
import project from './project.json';

describe('publication contract', () => {
  it('server-renders the article, section anchors and local fidelity limits', () => {
    const html = renderToStaticMarkup(<Page />);
    for (const id of ['demo', 'findings', 'method', 'reproduce']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('A scene graph, not a history of pixels');
    expect(html).toContain('Tabs do not synchronize');
    expect(html).toContain('/projects/collaborative-whiteboard/LICENSE.txt');
    expect(html).toContain('/projects/collaborative-whiteboard/NOTICE.txt');
  });
  it('has the exact coordinator-owned manifest interface and truthful runtime', () => {
    expect(Object.keys(project).sort()).toEqual(['categories', 'roles', 'runtime', 'slug', 'sourceUrl', 'status', 'summary', 'title']);
    expect(project.slug).toBe('collaborative-whiteboard');
    expect(project.categories).toEqual(['product', 'systems']);
    expect(project.roles).toContain('founding-engineer');
    expect(project.runtime).toBe('browser-application');
    expect(project.sourceUrl).toBe('https://github.com/Sahil170595/sceneledger');
    expect(project.title).not.toMatch(/^Banter/);
  });
});
