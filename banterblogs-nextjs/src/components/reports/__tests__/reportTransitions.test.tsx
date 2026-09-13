import fs from 'node:fs';
import path from 'node:path';
import { isValidElement, type ReactElement, type ViewTransitionProps } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CompendiumPage from '@/app/reports/compendium/page';
import ReportDetail from '@/app/reports/[id]/page';
import ReportsIndex from '@/app/reports/page';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { reportSortRank } from '@/lib/reports/phases';
import { ReportHero } from '../ReportHead';
import {
  DirectionalPage,
  FIGURE_MORPH_CLASS,
  NAV_BACK,
  NAV_FORWARD,
  ReportFigureTransition,
  ReportTitleTransition,
  TITLE_MORPH_CLASS,
} from '../ReportTransitions';

const { viewTransitions } = vi.hoisted(() => ({
  viewTransitions: [] as Array<Omit<ViewTransitionProps, 'children'>>,
}));

// Next's App Router bundles the React canary that exports ViewTransition; the
// npm React these tests run on is stable and has none, so a pass-through
// records what each boundary was asked to do.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children, ...props }: ViewTransitionProps) => {
      viewTransitions.push(props);
      return actual.createElement(actual.Fragment, null, children);
    },
  };
});

type AnyElement = ReactElement<Record<string, unknown>>;

// Every element of a server component's returned tree, depth first. Child
// components are not called, so what is inspected is the page's own wiring.
function elementsIn(node: unknown): AnyElement[] {
  if (Array.isArray(node)) return node.flatMap(elementsIn);
  if (!isValidElement(node)) return [];
  const element = node as AnyElement;
  return [element, ...elementsIn(element.props.children)];
}

function textIn(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textIn).join('');
  return isValidElement(node) ? textIn((node as AnyElement).props.children) : '';
}

const links = (tree: unknown) => elementsIn(tree).filter((el) => typeof el.props.href === 'string');
const href = (link: AnyElement) => link.props.href as string;

const DIRECTIONAL = { [NAV_FORWARD]: NAV_FORWARD, [NAV_BACK]: NAV_BACK, default: 'none' };
// Forward only. The archive opens at its top, so the card a back navigation
// would pair with is always below the fold: React names the outgoing heading,
// finds no visible partner, and the heading vanishes from the sliding page.
const TITLE_SHARE = { [NAV_FORWARD]: TITLE_MORPH_CLASS, default: 'none' };

beforeEach(() => {
  viewTransitions.length = 0;
});

afterEach(cleanup);

describe('report transition boundaries', () => {
  it('slides a page only on navigations typed forward or back', () => {
    render(
      <DirectionalPage className="container">
        <p>page</p>
      </DirectionalPage>,
    );

    expect(viewTransitions).toEqual([{ enter: DIRECTIONAL, exit: DIRECTIONAL, default: 'none' }]);
  });

  it('names a report title by its slug so the card and the heading pair up', () => {
    render(
      <ReportTitleTransition slug="technical-report-138">
        <h1>TR138</h1>
      </ReportTitleTransition>,
    );

    expect(viewTransitions).toEqual([
      { name: 'report-title-technical-report-138', share: TITLE_SHARE, default: 'none' },
    ]);
  });

  it('names a report figure by its slug so the card visual and the hero figure pair up, forward only', () => {
    render(
      <ReportFigureTransition slug="technical-report-138">
        <div>figure</div>
      </ReportFigureTransition>,
    );

    expect(viewTransitions).toEqual([
      { name: 'report-figure-technical-report-138', share: { [NAV_FORWARD]: FIGURE_MORPH_CLASS, default: 'none' }, default: 'none' },
    ]);
  });
});

describe('reading-path wiring', () => {
  it('report page: slides as a page, morphs its heading and hero figure, tags back, previous and next', async () => {
    const order = discoverReportsUnique()
      .map((entry) => entry.slug)
      .sort((a, b) => reportSortRank(a) - reportSortRank(b) || a.localeCompare(b));
    // a report with a neighbour on each side
    const id = order[Math.floor(order.length / 2)];

    const tree = await ReportDetail({ params: Promise.resolve({ id }) });

    expect(tree.type).toBe(DirectionalPage);
    const title = elementsIn(tree).find((el) => el.type === ReportTitleTransition);
    expect(title?.props.slug).toBe(id);
    expect(elementsIn(title?.props.children).map((el) => el.type)).toContain('h1');
    // the hero figure is the far end of the card visual's morph
    expect(elementsIn(tree).filter((el) => el.type === ReportHero).map((el) => el.props.slug)).toEqual([id]);

    const byText = (text: string) => links(tree).filter((link) => textIn(link).includes(text));
    expect(byText('Research archive').map((link) => [href(link), link.props.transitionTypes])).toEqual([
      ['/reports', [NAV_BACK]],
    ]);
    expect(byText('Previous').map((link) => link.props.transitionTypes)).toEqual([[NAV_BACK]]);
    expect(byText('Next').map((link) => link.props.transitionTypes)).toEqual([[NAV_FORWARD]]);
  });

  it('archive: slides as a page, sends every report link forward, morphs card titles', async () => {
    const tree = await ReportsIndex();

    expect(tree.type).toBe(DirectionalPage);
    const reportLinks = links(tree).filter((link) => href(link).startsWith('/reports/'));
    expect(reportLinks.length).toBeGreaterThan(0);
    for (const link of reportLinks) {
      expect(link.props.transitionTypes, href(link)).toEqual([NAV_FORWARD]);
    }

    const titled = reportLinks.flatMap((link) =>
      elementsIn(link.props.children)
        .filter((el) => el.type === ReportTitleTransition)
        .map((el) => [href(link), `/reports/${el.props.slug as string}`]),
    );
    expect(titled.length).toBeGreaterThan(0);
    for (const [linkHref, titleHref] of titled) expect(titleHref).toBe(linkHref);
  });

  it('compendium: slides as a page and every link to the archive goes back', async () => {
    const tree = await CompendiumPage();

    expect(tree.type).toBe(DirectionalPage);
    const archiveLinks = links(tree).filter((link) => href(link) === '/reports');
    expect(archiveLinks.length).toBeGreaterThan(0);
    for (const link of archiveLinks) expect(link.props.transitionTypes).toEqual([NAV_BACK]);
  });
});

describe('route scroll under a transition', () => {
  it('jumps a new page to its top, so the transition captures it where it lands', () => {
    // Next 16 no longer forces scroll-behavior: auto on route changes unless
    // <html> opts in. Without it the site-wide smooth scroll is still running
    // when React captures the new page, so the page is measured off screen.
    const layout = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf8');
    expect(layout).toMatch(/<html\b[^>]*\bdata-scroll-behavior="smooth"/);
  });
});

describe('view transitions stay on the reading path', () => {
  const SRC = path.join(process.cwd(), 'src');
  const USES_VIEW_TRANSITIONS = /\bViewTransition\b|\btransitionTypes\b|\baddTransitionType\b|\bviewTransitionName\b/;

  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    });
  }

  it('never reach the landing or the /show scenes', () => {
    const users = sourceFiles(SRC)
      .filter((file) => USES_VIEW_TRANSITIONS.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'));

    // the reports components use them, so an empty list means the scan went blind
    expect(users).toContain('components/reports/ReportTransitions.tsx');
    for (const file of users) {
      expect(file).toMatch(/^(app\/reports\/|components\/reports\/|components\/Header\.tsx$)/);
    }
  });
});

describe('view transition styles', () => {
  const GLOBALS_CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
  const start = GLOBALS_CSS.indexOf('/* view transitions');
  const end = GLOBALS_CSS.indexOf('/* end view transitions */');
  const BLOCK = start >= 0 && end > start ? GLOBALS_CSS.slice(start, end) : '';
  const CSS = BLOCK.replace(/\/\*[\s\S]*?\*\//g, '');

  function braceBody(css: string, openAt: number): string {
    let depth = 0;
    for (let i = openAt; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) return css.slice(openAt + 1, i);
    }
    return '';
  }

  // declarations of every rule whose selector list names `selector`
  function declarationsFor(css: string, selector: string): string {
    return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selectors]) => selectors.split(',').map((s) => s.trim()).includes(selector))
      .map(([, , body]) => body)
      .join(';');
  }

  it('lives in one delimited block of globals.css', () => {
    expect(BLOCK).not.toBe('');
  });

  it('moves nothing under reduced motion: groups stand still and pages crossfade on the fast token', () => {
    const at = CSS.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at).toBeGreaterThanOrEqual(0);
    const reduced = braceBody(CSS, CSS.indexOf('{', at));
    expect(declarationsFor(reduced, '::view-transition-group(*)')).toMatch(/animation:\s*none/);
    const outgoing = declarationsFor(reduced, '::view-transition-old(*)');
    const incoming = declarationsFor(reduced, '::view-transition-new(*)');
    expect(outgoing).toMatch(/var\(--vt-duration-fast\)[^;]*vt-fade-out/);
    expect(incoming).toMatch(/var\(--vt-duration-fast\)[^;]*vt-fade-in/);
    for (const body of [outgoing, incoming]) expect(body).not.toMatch(/vt-slide|vt-morph/);
    // the header and unnamed content still swap in place
    expect(declarationsFor(reduced, '::view-transition-new(site-header)')).toMatch(/animation:\s*none/);
    expect(declarationsFor(reduced, '::view-transition-new(root)')).toMatch(/animation:\s*none/);
  });

  it('lets clicks through the transition overlay', () => {
    expect(declarationsFor(CSS, '::view-transition')).toMatch(/pointer-events:\s*none/);
  });

  it('styles every class the reports components hand to React', () => {
    for (const cls of [NAV_FORWARD, NAV_BACK]) {
      expect(declarationsFor(CSS, `::view-transition-old(.${cls})`), cls).toMatch(/animation:/);
      expect(declarationsFor(CSS, `::view-transition-new(.${cls})`), cls).toMatch(/animation:/);
    }
    expect(declarationsFor(CSS, `::view-transition-new(.${TITLE_MORPH_CLASS})`)).toMatch(/object-fit:\s*none/);
  });

  it('clips a travelling title to its own box and cross-fades the two titles at native size', () => {
    const group = declarationsFor(CSS, `::view-transition-group(.${TITLE_MORPH_CLASS})`);
    const outgoing = declarationsFor(CSS, `::view-transition-old(.${TITLE_MORPH_CLASS})`);
    const incoming = declarationsFor(CSS, `::view-transition-new(.${TITLE_MORPH_CLASS})`);
    // the heading is about twice the card title; unclipped, it paints over the neighbouring cards
    expect(group).toMatch(/clip-path:\s*inset\(0\)/);
    for (const [pseudo, body] of [['old', outgoing], ['new', incoming]] as const) {
      expect(body, pseudo).toMatch(/object-fit:\s*none/);
      expect(body, pseudo).not.toMatch(/display:\s*none/);
    }
    expect(outgoing).toMatch(/vt-fade-out/);
    expect(incoming).toMatch(/vt-fade-in/);
    // both titles blur at the midpoint, so they never read as two objects
    expect(group).toMatch(/animation-duration:\s*var\(--vt-duration-morph\)/);
    expect(outgoing).toMatch(/var\(--vt-duration-morph\)[^;,]*vt-morph-blur/);
    expect(incoming).toMatch(/var\(--vt-duration-morph\)[^;,]*vt-morph-blur/);
  });

  // Phase R2: the card visual opens into the hero figure on the gentle spring
  // (740ms, no overshoot); the card's snapshot is contained and the hero's
  // covered, so the drawing holds its place and size while the plate widens.
  it('moves a report figure on the gentle spring, clipped to its rounded box, with the drawing held in place', () => {
    const group = declarationsFor(CSS, `::view-transition-group(.${FIGURE_MORPH_CLASS})`);
    expect(group).toMatch(/animation-duration:\s*var\(--vt-duration-figure\)/);
    expect(group).toMatch(/animation-timing-function:\s*var\(--vt-ease-figure\)/);
    expect(group).toMatch(/clip-path:\s*inset\(0 round/);
    expect(CSS).toMatch(/--vt-duration-figure:\s*var\(--duration-spring-gentle\)/);
    expect(CSS).toMatch(/--vt-ease-figure:\s*var\(--ease-spring-gentle\)/);
    expect(GLOBALS_CSS).toMatch(/--duration-spring-gentle:\s*740ms;/);
    expect(declarationsFor(CSS, `::view-transition-old(.${FIGURE_MORPH_CLASS})`)).toMatch(/object-fit:\s*contain/);
    expect(declarationsFor(CSS, `::view-transition-new(.${FIGURE_MORPH_CLASS})`)).toMatch(/object-fit:\s*cover/);
    // the browser's own cross-fade, so the pair blends without dimming
    for (const pseudo of ['old', 'new']) {
      expect(declarationsFor(CSS, `::view-transition-${pseudo}(.${FIGURE_MORPH_CLASS})`), pseudo).not.toMatch(/animation/);
    }
  });

  // Phase R1 (motion brief): the page slide grew from 12-16px on base and
  // standard to the 32px route distance on the route duration and move curve;
  // the old page leaves on the exit token and the new one fades in after the
  // handoff, and the shared title gains a midpoint blur.
  it('slides the route distance on the route tokens, the new page after a handoff, moving only opacity, transform and the title blur', () => {
    expect(CSS).toMatch(/--vt-slide:\s*var\(--motion-route\)/);
    expect(GLOBALS_CSS).toMatch(/--motion-route:\s*32px;/);
    expect(CSS).toMatch(/--vt-duration:\s*theme\(['"]transitionDuration\.route['"]\)/);
    expect(CSS).toMatch(/--vt-ease:\s*theme\(['"]transitionTimingFunction\.move['"]\)/);
    expect(CSS).toMatch(/--vt-duration-exit:\s*theme\(['"]transitionDuration\.exit['"]\)/);
    expect(CSS).toMatch(/--vt-delay-enter:\s*theme\(['"]transitionDuration\.handoff['"]\)/);
    expect(CSS).toMatch(/--vt-duration-morph:\s*theme\(['"]transitionDuration\.morph['"]\)/);
    expect(declarationsFor(CSS, '::view-transition-old(.nav-forward)')).toMatch(/var\(--vt-duration-exit\)[^,]*vt-fade-out/);
    expect(declarationsFor(CSS, '::view-transition-new(.nav-forward)')).toMatch(
      /var\(--vt-duration-enter\) var\(--vt-ease-out\) var\(--vt-delay-enter\) both vt-fade-in/,
    );
    // every duration and curve goes through the tokens
    expect(CSS).not.toMatch(/\d+m?s\b|cubic-bezier|(?<![\w-])(?:ease(?:-in-out|-in|-out)?|linear)(?![\w-])/);

    const keyframes = [...CSS.matchAll(/@keyframes\s+[\w-]+\s*\{/g)].map((m) =>
      braceBody(CSS, (m.index ?? 0) + m[0].length - 1),
    );
    expect(keyframes.length).toBeGreaterThan(0);
    const animated = new Set(keyframes.flatMap((body) => [...body.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1])));
    expect([...animated].sort()).toEqual(['filter', 'opacity', 'transform']);
  });
});
