import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { NAV_RECEDE_ATTRIBUTE, recedeAround } from '../navRecede';

// Phase R4 (re-judge 3, P0-1): the next page cannot be drawn before it is
// rendered, so the page a followed link leaves answers at once. Everything
// but the kept element recedes: a report card keeps only its figure, the
// element the next page shares; a row keeps itself.

const receded = () => [...document.querySelectorAll(`[${NAV_RECEDE_ATTRIBUTE}]`)].map((el) => el.id);

function mountArchive() {
  document.body.innerHTML = `
    <header id="header"><a id="nav" href="/tools">Tools</a></header>
    <main id="main">
      <h1 id="title">Archive</h1>
      <div id="grid">
        <div id="slot-a"><a id="card-a" href="/reports/a"><div id="lift-a">
          <div id="figure-a" class="card-visual"></div><h3 id="heading-a">A</h3><p id="dek-a">a</p>
        </div></a></div>
        <div id="slot-b"><a id="card-b" href="/reports/b"><div id="lift-b">
          <div id="figure-b" class="card-visual"></div><h3 id="heading-b">B</h3>
        </div></a></div>
      </div>
      <ol id="rows"><li id="row-1"><a id="link-1" href="/show/1">1</a></li><li id="row-2"><a href="/show/2">2</a></li></ol>
    </main>
    <footer id="footer"></footer>`;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the page a followed link leaves', () => {
  it('recedes everything in the page but a card figure, once each, and nothing outside the page', () => {
    mountArchive();
    recedeAround(document.getElementById('card-a')!);

    expect(receded().sort()).toEqual(['dek-a', 'heading-a', 'rows', 'slot-b', 'title'].sort());
  });

  it('keeps a whole row when the link has no figure', () => {
    mountArchive();
    recedeAround(document.getElementById('link-1')!);

    expect(receded().sort()).toEqual(['grid', 'row-2', 'title'].sort());
  });

  it('undoes itself', () => {
    mountArchive();
    const undo = recedeAround(document.getElementById('card-a')!);
    undo();

    expect(receded()).toEqual([]);
  });

  it('touches nothing for a link outside the page', () => {
    mountArchive();
    recedeAround(document.getElementById('nav')!);

    expect(receded()).toEqual([]);
  });

  it('recedes on the exit token, only under the motion gate, to a level still legible', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = new RegExp(`html\\[data-motion="on"\\] \\[${NAV_RECEDE_ATTRIBUTE}\\]\\s*\\{([^}]*)\\}`).exec(css);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/opacity:\s*var\(--nav-recede-opacity\)/);
    expect(rule![1]).toMatch(/transition:\s*opacity var\(--duration-exit\) var\(--ease-strong-out\)/);
    const opacity = Number(/--nav-recede-opacity:\s*([\d.]+);/.exec(css)?.[1]);
    expect(opacity).toBeGreaterThanOrEqual(0.2);
    expect(opacity).toBeLessThanOrEqual(0.6);
    // one flat rule: no :has() scanning the page on every style recalculation
    expect(css).not.toMatch(/:has\(\[data-nav-/);
  });
});
