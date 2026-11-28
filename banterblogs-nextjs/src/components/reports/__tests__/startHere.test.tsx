import { isValidElement, type ReactElement, type ViewTransitionProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import ReportsIndex from '@/app/reports/page';
import { ENTRANCE_GROUP_CLASS } from '@/components/motion/entrance';
import { ACCEPTED, PUBLIC_PREPRINTS } from '@/lib/papers';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';
import { extractTRNumber, phasePublishedLabel } from '@/lib/reports/phases';
import { START_HERE, START_HERE_LIMIT } from '@/lib/reports/startHere';
import { describeReport } from '../reportIdentity';
import { ReportTabs, TABS_ENTRANCE_GROUP, type ReportTabGroup } from '../ReportTabs';
import { StartHere } from '../StartHere';

// Next's App Router bundles the React canary that exports ViewTransition; the
// npm React these tests run on is stable and has none.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children }: ViewTransitionProps) => actual.createElement(actual.Fragment, null, children),
  };
});

type AnyElement = ReactElement<Record<string, unknown>>;

// the page's own tree, depth first; child components are not called
function elementsIn(node: unknown): AnyElement[] {
  if (Array.isArray(node)) return node.flatMap(elementsIn);
  if (!isValidElement(node)) return [];
  const element = node as AnyElement;
  return [element, ...elementsIn(element.props.children)];
}

const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const PUBLIC_PAPERS = [...ACCEPTED, ...PUBLIC_PREPRINTS];

describe('start-here rule', () => {
  it('is the lead evidence report of each public paper, in /papers order, up to the limit', () => {
    const leads = PUBLIC_PAPERS.filter((paper) => paper.trs.length > 0).map((paper) => paper.trs[0].slug);

    expect(START_HERE.slugs).toEqual([...new Set(leads)].slice(0, START_HERE_LIMIT));
    expect(START_HERE.slugs.length).toBeGreaterThan(0);
    expect(START_HERE.slugs.length).toBeLessThanOrEqual(START_HERE_LIMIT);
    expect(new Set(START_HERE.slugs).size).toBe(START_HERE.slugs.length);
  });

  it('names only reports that exist in the archive, each with a catalog title and description', () => {
    const published = new Set(discoverReportsUnique().map((entry) => entry.slug));
    for (const slug of START_HERE.slugs) {
      expect(published.has(slug), slug).toBe(true);
      const meta = readReportMeta(slug);
      expect(meta?.title, slug).toBeTruthy();
      expect(meta?.description, slug).toBeTruthy();
    }
  });

  it('pairs each report with the public paper that cites it as evidence', () => {
    for (const entry of START_HERE.entries) {
      expect(PUBLIC_PAPERS).toContain(entry.paper);
      expect(entry.paper.trs[0]).toEqual({ label: entry.label, slug: entry.slug });
      // public means a reader can open it
      expect(entry.paper.arxiv, entry.slug).toMatch(/^https:\/\/arxiv\.org\/abs\//);
    }
  });
});

describe('start-here strip', () => {
  const markup = renderToStaticMarkup(<StartHere group={TABS_ENTRANCE_GROUP} />);
  const items = [...markup.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

  it('links each report in rule order, complete in server HTML', () => {
    const hrefs = items.map((item) => /href="([^"]*)"/.exec(item)?.[1]);
    expect(hrefs).toEqual(START_HERE.slugs.map((slug) => `/reports/${slug}`));
  });

  it('says of each report only what its catalog entry says: TR id, title, description', () => {
    START_HERE.entries.forEach((entry, index) => {
      const meta = readReportMeta(entry.slug)!;
      const { heading } = describeReport(entry.slug, meta.title!);
      expect(textOf(items[index])).toBe(textOf(`${entry.label} ${heading} ${meta.description}`));
    });
  });

  it('states its rule and points to the papers', () => {
    const head = markup.slice(0, markup.indexOf('<ol'));
    expect(textOf(head)).toBe(`Start here ${START_HERE.rule} See the papers`);
    expect(head).toMatch(/<h2[^>]*>Start here<\/h2>/);
    expect(head).toMatch(/<a[^>]*href="\/papers"/);
    expect(markup).toMatch(/^<section aria-label="Start here"/);
  });

  it('rises with the head entrance group it is given, and draws no bordered box', () => {
    const section = /^<section[^>]*>/.exec(markup)?.[0] ?? '';
    expect(section).toContain(ENTRANCE_GROUP_CLASS);
    expect(section).toContain(`--group:${TABS_ENTRANCE_GROUP}`);
    const classes = [...markup.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(classes.filter((c) => BORDER_WIDTH.test(c))).toEqual([]);
    // one row at desktop
    expect(classes).toContain('lg:grid-cols-3');
  });
});

describe('archive entry wiring', () => {
  let page: AnyElement[];
  let tabs: AnyElement;

  beforeAll(async () => {
    page = elementsIn(await ReportsIndex());
    tabs = page.find((el) => el.type === ReportTabs)!;
  });

  it('seats the strip between the head and the tabs, in the stats entrance group', () => {
    const strip = page.filter((el) => el.type === StartHere);
    const stats = page.find((el) => el.type === 'ul' && String(el.props.className).includes(ENTRANCE_GROUP_CLASS))!;

    expect(strip).toHaveLength(1);
    expect(page.indexOf(stats)).toBeLessThan(page.indexOf(strip[0]));
    expect(page.indexOf(strip[0])).toBeLessThan(page.indexOf(tabs));
    expect(strip[0].props.group).toBe(TABS_ENTRANCE_GROUP);
  });

  it('labels every phase tab with the TR numbers its own reports carry', () => {
    const groups = tabs.props.groups as ReportTabGroup[];
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      const slugs = group.reports.map((report) => report.slug);
      expect(group.label, group.key).toBe(phasePublishedLabel(group.key, slugs) ?? group.label);
    }
    // a phase with one TR-numbered report names that report alone, never a range
    const lone = groups.filter((group) => group.reports.length === 1 && extractTRNumber(group.reports[0].slug) !== null);
    for (const group of lone) expect(group.label, group.key).toMatch(/\(TR\d+\)$/);
  });
});
