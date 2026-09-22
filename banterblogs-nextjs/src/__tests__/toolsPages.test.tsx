import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ToolsIndexPage from '@/app/tools/page';
import { ENTRANCE_GROUP_CLASS, ENTRANCE_ITEM_ATTRIBUTE } from '@/components/motion/entrance';
import { ToolPage } from '@/components/ToolPage';
import { TOOLS } from '@/lib/tools';

// /tools and /tools/[slug] on the primitives (Phase R3-B): the index as two
// interactive cards with a drawn visual each, the product template as a
// PageHeader with the install chip, features as rows, the evidence as a
// table and the stated limits; every fact and link of main's copy intact,
// and every version read from lib/tools.ts.

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const MAX_BORDERED = 12;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const bordered = (root: Element) => [...root.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)));
const hrefs = (root: Element) => [...root.querySelectorAll('a')].map((a) => a.getAttribute('href'));
const groupsOf = (root: Element) =>
  [...new Set([...root.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)].map((g) => g.style.getPropertyValue('--group')))].sort();

describe('/tools', () => {
  const page = () => render(<ToolsIndexPage />).container;

  it('keeps every sentence and link of the index', () => {
    const el = page();
    const all = text(el);
    expect(el.querySelector('h1')?.textContent).toBe('Tools');
    for (const sentence of [
      'Shipped',
      'The parts of this program you can install and run today. Both are command-line tools on PyPI, both come out of the research archive, and both are built to say what they do not know.',
      'quantfit is an independent tool, not one of the nine Chimera repositories — it productizes the safety-under-quantization research line.',
      'See the platform',
      'for the ecosystem itself.',
    ]) {
      expect(all, sentence).toContain(sentence);
    }
    expect(el.querySelector('a[href="/platform"]')?.textContent).toBe('See the platform');
  });

  it('shows each CLI as an interactive card: its visual, facts, install chip with a copy button, and its links', () => {
    const el = page();
    const cards = [...el.querySelectorAll('article.card-depth')];
    expect(cards).toHaveLength(TOOLS.length);
    TOOLS.forEach((tool, i) => {
      const card = cards[i];
      const all = text(card);
      for (const fact of [`v${tool.version}`, tool.license, tool.name, tool.tagline, tool.summary, tool.install]) expect(all, fact).toContain(fact);
      expect(all.includes('Standalone'), tool.slug).toBe(!tool.ecosystem);
      expect(card.querySelector('svg.rv'), `${tool.slug} visual`).not.toBeNull();
      expect(card.querySelector(`button[aria-label="Copy ${tool.name} install command"]`)).not.toBeNull();
      // the title leads to the tool page, over the whole card
      expect(card.querySelector('h2 a.card-link')?.getAttribute('href')).toBe(`/tools/${tool.slug}`);
      const links = [...card.querySelectorAll('a:not(.card-link)')].map((a) => [text(a), a.getAttribute('href')]);
      expect(links).toEqual([
        ['Details', `/tools/${tool.slug}`],
        ['PyPI', tool.pypi],
        ['Source', tool.repo],
      ]);
    });
  });

  it('draws each visual from the generator seeded by the tool, so each card has its own', () => {
    const [a, b] = [...page().querySelectorAll('article svg.rv')].map((svg) => svg.innerHTML);
    expect(a).not.toBe(b);
  });

  it('opens on the title, the cards following it; the lede, the largest text in the fold, paints at once', () => {
    const el = page();
    expect(groupsOf(el)).toEqual(['0']);
    const lede = [...el.querySelectorAll('header p')].find((p) => text(p).startsWith('The parts of this program'))!;
    expect(lede.closest(`.${ENTRANCE_GROUP_CLASS}`)).toBeNull();
    const cards = [...el.querySelectorAll<HTMLElement>(`li[${ENTRANCE_ITEM_ATTRIBUTE}]`)];
    expect(cards.map((li) => li.querySelector('article.card-depth'))).toHaveLength(TOOLS.length);
    for (const li of cards) expect(li.style.getPropertyValue('--entrance-items-after')).toBe('1');
  });

  it('draws no boxed panels', () => {
    const el = page();
    expect(renderToStaticMarkup(<ToolsIndexPage />)).not.toMatch(/signal-(panel|pill|divider)/);
    expect(bordered(el).length).toBeLessThanOrEqual(MAX_BORDERED);
  });
});

describe.each(TOOLS.map((tool) => [tool.slug, tool] as const))('/tools/%s', (_slug, tool) => {
  const page = () => render(<ToolPage tool={tool} />).container;

  it('heads the page with the name, the tagline, the facts, the summary, the install chip and the links', () => {
    const el = page();
    const header = el.querySelector('header')!;
    expect(text(header.querySelector('h1')!)).toBe(tool.name);
    const all = text(header);
    for (const fact of ['CLI', tool.tagline, `v${tool.version}`, tool.license, `Python ${tool.python}`, tool.summary]) expect(all, fact).toContain(fact);
    expect(all.includes('Standalone tool'), 'standalone').toBe(!tool.ecosystem);
    expect(header.querySelector(`.command-chip button[aria-label="Copy ${tool.name} install command"]`)).not.toBeNull();
    expect(text(header.querySelector('.command-chip code')!)).toBe(tool.install);
    const links = [...header.querySelectorAll('a')].map((a) => [text(a), a.getAttribute('href')]);
    expect(links).toEqual([['PyPI', tool.pypi], ['Source', tool.repo], ...(tool.changelog ? [['Changelog', tool.changelog]] : [])]);
  });

  it('follows the head with the quickstart, copyable, and stages title, facts and links, then the quickstart; the summary paints at once', () => {
    const el = page();
    const quickstart = [...el.querySelectorAll('.command-chip')].find((chip) => text(chip).includes(tool.quickstart))!;
    expect(quickstart).toBeDefined();
    expect(quickstart.querySelector(`button[aria-label="Copy ${tool.name} quickstart command"]`)).not.toBeNull();
    const group = (node: Element) => node.closest<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)?.style.getPropertyValue('--group');
    expect(group(el.querySelector('h1')!)).toBe('0');
    expect(group(el.querySelector('header .command-chip')!)).toBe('1');
    expect(group(quickstart)).toBe('2');
    const summary = [...el.querySelectorAll('header p')].find((p) => text(p) === tool.summary)!;
    expect(group(summary)).toBeUndefined();
  });

  // R4 design re-judge: the fold used only its left 500px and the page had
  // no figure. The empty half now draws how the tool decides.
  it('draws how the tool decides as a figure beside the head: its steps in order, before the principle', () => {
    const el = page();
    const figure = el.querySelector('figure.flow')!;
    expect(figure).not.toBeNull();
    expect([...figure.querySelectorAll('.flow-label')].map(text)).toEqual(tool.pipeline!.steps.map((s) => s.label));
    expect(text(figure.querySelector('figcaption')!)).toContain(tool.pipeline!.title);
    // it shares the head's grid with the header, and comes before the page's sections
    expect(figure.closest('.tool-head')?.querySelector('header')).not.toBeNull();
    expect(figure.compareDocumentPosition(el.querySelector('#principle')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the principle, and sets the highlights as rows', () => {
    const el = page();
    expect(text(el)).toContain(tool.principle.title);
    expect(text(el)).toContain(tool.principle.body);
    const rows = [...el.querySelectorAll('#features .list-row')];
    expect(rows.map((row) => text(row.querySelector('h3')!))).toEqual(tool.highlights.map((h) => h.title));
    tool.highlights.forEach((h, i) => expect(text(rows[i])).toContain(h.body));
  });

  it('lists every command, with the count and the README link', () => {
    const el = page();
    const section = el.querySelector('#commands')!;
    expect(text(section)).toContain(`${tool.commands.length} commands. Full flags and output samples live in the README.`);
    expect(section.querySelector(`a[href="${tool.repo}"]`)?.textContent).toBe('README');
    const cells = [...section.querySelectorAll('li')];
    expect(cells.map((cell) => text(cell.querySelector('code')!))).toEqual(tool.commands.map((c) => c.name));
    tool.commands.forEach((c, i) => expect(text(cells[i])).toContain(c.summary));
  });

  it('sets the evidence as a table with tabular figures: each claim, its detail and its reports', () => {
    const el = page();
    const table = el.querySelector('#evidence table')!;
    expect(table.className).toContain('evidence-table');
    expect([...table.querySelectorAll('thead th')].map(text)).toEqual(['Capability', 'What it rests on', 'Reports']);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(tool.evidence.length);
    tool.evidence.forEach((item, i) => {
      const cells = rows[i].querySelectorAll('td');
      expect(text(cells[0])).toBe(item.claim);
      expect(text(cells[1])).toBe(item.detail);
      expect(hrefs(cells[2])).toEqual(item.reports.map((slug) => `/reports/${slug}`));
      expect([...cells[2].querySelectorAll('a')].map(text)).toEqual(item.reports.map((slug) => slug.replace('technical-report-', 'TR')));
    });
    // the stacked phone layout keeps the table's roles
    expect(table.getAttribute('role')).toBe('table');
    expect(rows.every((row) => row.getAttribute('role') === 'row')).toBe(true);
    expect(text(el)).toContain('Each capability traces to the measurements behind it. These are the published reports, not a summary of them.');
  });

  it('keeps the stated limits and the links onward', () => {
    const el = page();
    const section = el.querySelector('#limits')!;
    expect(text(section)).toContain('What it does not do');
    expect(text(section)).toContain('The limits the tool states about itself.');
    expect([...section.querySelectorAll('li')].map(text)).toEqual(tool.limits);
    for (const [label, href] of [['All tools', '/tools'], ['Research archive', '/reports']]) {
      expect([...el.querySelectorAll(`a[href="${href}"]`)].map(text), href).toContain(label);
    }
  });

  it('reveals the lists, and draws no boxed panels', () => {
    const el = page();
    expect(el.querySelectorAll('[data-reveal]').length).toBeGreaterThanOrEqual(tool.highlights.length + tool.commands.length);
    expect(renderToStaticMarkup(<ToolPage tool={tool} />)).not.toMatch(/signal-(panel|pill|divider)|backdrop-blur/);
    expect(bordered(el).length).toBeLessThanOrEqual(MAX_BORDERED);
  });
});
