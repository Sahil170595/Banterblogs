import fs from 'node:fs';
import path from 'node:path';
import { isValidElement, type ReactElement, type ViewTransitionProps } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tailwindConfig from '../../../../tailwind.config';
import CompendiumPage from '@/app/reports/compendium/page';
import ReportDetail from '@/app/reports/[id]/page';
import ReportsIndex from '@/app/reports/page';
import {
  ARRIVING_PAGE_CLASS,
  LANDING_ROUTE,
  ROUTE_CLASS,
  ROUTE_FROM_ATTRIBUTE,
  ROUTE_TO_ATTRIBUTE,
} from '@/components/motion/routeTransitionTypes';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { reportSortRank } from '@/lib/reports/phases';
import { ReportHero } from '../ReportHead';
import * as transitions from '../ReportTransitions';
import { FIGURE_MORPH_CLASS, NAV_BACK, NAV_FORWARD, ReportFigureTransition } from '../ReportTransitions';

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
const typeName = (el: AnyElement) => (typeof el.type === 'string' ? el.type : ((el.type as { name?: string }).name ?? ''));
const boundaries = (tree: unknown) => elementsIn(tree).filter((el) => /Transition$/.test(typeName(el)));

beforeEach(() => {
  viewTransitions.length = 0;
});

afterEach(cleanup);

describe('report transition boundaries', () => {
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

  // Phase R4 (re-judge 3, P0-1): the title morph flew the card title up through
  // the figure and across the lede, clipped mid-word. The figure is the one
  // shared element; the title arrives with its page. The page itself moves
  // with every other page, from the route boundary in the root layout.
  it('shares nothing but the figure, and leaves the page to the route boundary', () => {
    expect(Object.keys(transitions).filter((key) => /title|page/i.test(key))).toEqual([]);
  });
});

describe('reading-path wiring', () => {
  it('report page: morphs only its hero figure, and tags back, previous and next', async () => {
    const order = discoverReportsUnique()
      .map((entry) => entry.slug)
      .sort((a, b) => reportSortRank(a) - reportSortRank(b) || a.localeCompare(b));
    // a report with a neighbour on each side
    const id = order[Math.floor(order.length / 2)];

    const tree = await ReportDetail({ params: Promise.resolve({ id }) });

    expect(tree.type).toBe('div');
    // the heading sits in the head as it is, with no boundary around it
    const head = elementsIn(tree).find((el) => el.props.className === 'report-head');
    const headChildren = ([] as unknown[]).concat(head?.props.children).filter(isValidElement) as AnyElement[];
    expect(headChildren.map(typeName)).toContain('h1');
    // the hero figure is the far end of the card visual's morph, and the only shared element
    expect(elementsIn(tree).filter((el) => el.type === ReportHero).map((el) => el.props.slug)).toEqual([id]);
    expect(boundaries(tree)).toEqual([]);

    const byText = (text: string) => links(tree).filter((link) => textIn(link).includes(text));
    expect(byText('Research archive').map((link) => [href(link), link.props.transitionTypes])).toEqual([
      ['/reports', [NAV_BACK]],
    ]);
    expect(byText('Previous').map((link) => link.props.transitionTypes)).toEqual([[NAV_BACK]]);
    expect(byText('Next').map((link) => link.props.transitionTypes)).toEqual([[NAV_FORWARD]]);
  });

  it('archive: sends every report link forward, with no travelling titles', async () => {
    const tree = await ReportsIndex();

    expect(boundaries(tree)).toEqual([]);
    const reportLinks = links(tree).filter((link) => href(link).startsWith('/reports/'));
    expect(reportLinks.length).toBeGreaterThan(0);
    for (const link of reportLinks) expect(link.props.transitionTypes, href(link)).toEqual([NAV_FORWARD]);
  });

  it('compendium: every link to the archive goes back', async () => {
    const tree = await CompendiumPage();

    expect(boundaries(tree)).toEqual([]);
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

describe('where view transitions come from', () => {
  const SRC = path.join(process.cwd(), 'src');
  const USES_VIEW_TRANSITIONS = /\bViewTransition\b|\btransitionTypes\b|\baddTransitionType\b|\bviewTransitionName\b/;

  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    });
  }

  // Phase R4: every navigation moves, from one route boundary in the root
  // layout; only the reading path names elements or types its links, the
  // header names its frame, and the intent link passes types through.
  it('only the route boundary, the reading path, the header and the intent link', () => {
    const users = sourceFiles(SRC)
      .filter((file) => USES_VIEW_TRANSITIONS.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'));

    // the reports components use them, so an empty list means the scan went blind
    expect(users).toContain('components/reports/ReportTransitions.tsx');
    expect(users).toContain('components/motion/RouteTransition.tsx');
    for (const file of users) {
      expect(file).toMatch(
        /^(app\/reports\/|components\/reports\/|components\/Header\.tsx$|components\/motion\/(RouteTransition\.tsx|routeTransitionTypes\.ts)$|components\/ui\/IntentLink\.tsx$)/,
      );
    }
  });
});

describe('view transition styles', () => {
  const GLOBALS_CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
  const start = GLOBALS_CSS.indexOf('/* view transitions');
  const end = GLOBALS_CSS.indexOf('/* end view transitions */');
  const BLOCK = start >= 0 && end > start ? GLOBALS_CSS.slice(start, end) : '';
  const CSS = BLOCK.replace(/\/\*[\s\S]*?\*\//g, '');
  const DURATIONS = tailwindConfig.theme?.extend?.transitionDuration as Record<string, string>;
  const tokenMs = (name: string) => Number(DURATIONS[name].replace('ms', ''));
  const FROM_LANDING = `html[${ROUTE_FROM_ATTRIBUTE}="${LANDING_ROUTE}"]`;
  const TO_LANDING = `html[${ROUTE_TO_ATTRIBUTE}="${LANDING_ROUTE}"]`;

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

  // the token a custom property is defined from: --vt-x: theme('transitionDuration.<token>')
  const durationToken = (property: string) => new RegExp(`${property}:\\s*theme\\(['"]transitionDuration\\.(\\w+)['"]\\)`).exec(CSS)?.[1] ?? '';

  it('lives in one delimited block of globals.css', () => {
    expect(BLOCK).not.toBe('');
  });

  it('lets clicks through the transition overlay', () => {
    expect(declarationsFor(CSS, '::view-transition')).toMatch(/pointer-events:\s*none/);
  });

  // Phase R4 (re-judge 3, P1-3): every other navigation was an instant cut.
  it('moves every navigation: the old page fades out on the exit token, the new one rises out of a blur on the enter token after the handoff', () => {
    expect(declarationsFor(CSS, `::view-transition-old(.${ROUTE_CLASS})`)).toMatch(/var\(--vt-duration-exit\) var\(--vt-ease-out\) both vt-fade-out/);
    expect(declarationsFor(CSS, `::view-transition-new(.${ROUTE_CLASS})`)).toMatch(
      /var\(--vt-duration-rise\) var\(--vt-ease-out\) var\(--vt-delay-enter\) both vt-rise-in/,
    );
    expect(durationToken('--vt-duration-exit')).toBe('exit');
    expect(durationToken('--vt-duration-rise')).toBe('enter');
    expect(durationToken('--vt-delay-enter')).toBe('handoff');
    expect(CSS).toMatch(/--vt-ease-out:\s*theme\(['"]transitionTimingFunction\.strong-out['"]\)/);
    expect(CSS).toMatch(/--vt-rise:\s*var\(--motion-rise\)/);
    expect(CSS).toMatch(/--vt-rise-blur:\s*var\(--blur-route\)/);
    expect(GLOBALS_CSS).toMatch(/--motion-rise:\s*12px;/);
    expect(GLOBALS_CSS).toMatch(/--blur-route:\s*4px;/);
    const rise = braceBody(CSS, CSS.indexOf('{', CSS.indexOf('@keyframes vt-rise-in')));
    expect(rise).toMatch(/opacity:\s*0/);
    expect(rise).toMatch(/transform:\s*translateY\(var\(--vt-rise\)\)/);
    expect(rise).toMatch(/filter:\s*blur\(var\(--vt-rise-blur\)\)/);
    // the whole move lands inside the brief's 150-400ms response band
    expect(tokenMs('handoff') + tokenMs('enter')).toBeLessThanOrEqual(400);
  });

  it('puts the arriving page on the top layer', () => {
    expect(Number(/z-index:\s*(\d+)/.exec(declarationsFor(CSS, `::view-transition-group(.${ARRIVING_PAGE_CLASS})`))?.[1])).toBeGreaterThan(0);
  });

  it('holds the header still above the pages, painted solid so no page reads through it, clear only over the landing', () => {
    const group = declarationsFor(CSS, '::view-transition-group(site-header)');
    expect(group).toMatch(/animation:\s*none/);
    expect(group).toMatch(/z-index:\s*100/);
    expect(group).toMatch(/background-color:\s*hsl\(var\(--background\)\)/);
    expect(declarationsFor(CSS, '::view-transition-old(site-header)')).toMatch(/display:\s*none/);
    expect(declarationsFor(CSS, '::view-transition-new(site-header)')).toMatch(/animation:\s*none/);
    for (const edge of [FROM_LANDING, TO_LANDING]) {
      expect(declarationsFor(CSS, `${edge}::view-transition-group(site-header)`), edge).toMatch(/background-color:\s*transparent/);
    }
  });

  it('slides the reading path: forward leaves left and arrives from the right, back mirrors it', () => {
    for (const cls of [NAV_FORWARD, NAV_BACK]) {
      expect(declarationsFor(CSS, `::view-transition-old(.${cls})`), cls).toMatch(/var\(--vt-duration-exit\) var\(--vt-ease-out\) both vt-fade-out/);
      expect(declarationsFor(CSS, `::view-transition-old(.${cls})`), cls).toMatch(/var\(--vt-duration\) var\(--vt-ease\) both vt-slide-out/);
      expect(declarationsFor(CSS, `::view-transition-new(.${cls})`), cls).toMatch(
        /var\(--vt-duration-enter\) var\(--vt-ease-out\) var\(--vt-delay-enter\) both vt-fade-in/,
      );
      expect(declarationsFor(CSS, `::view-transition-new(.${cls})`), cls).toMatch(/var\(--vt-duration\) var\(--vt-ease\) both vt-slide-in/);
    }
    expect(declarationsFor(CSS, `::view-transition-old(.${NAV_FORWARD})`)).toMatch(/--vt-to:\s*calc\(-1 \* var\(--vt-slide\)\)/);
    expect(declarationsFor(CSS, `::view-transition-new(.${NAV_FORWARD})`)).toMatch(/--vt-from:\s*var\(--vt-slide\)/);
    expect(declarationsFor(CSS, `::view-transition-old(.${NAV_BACK})`)).toMatch(/--vt-to:\s*var\(--vt-slide\)/);
    expect(declarationsFor(CSS, `::view-transition-new(.${NAV_BACK})`)).toMatch(/--vt-from:\s*calc\(-1 \* var\(--vt-slide\)\)/);
  });

  // Phase R1 set the route slide; Phase R4 cut the handoff 100 -> 40ms so the
  // new page shows before the figure is far from its card.
  it('slides the route distance on the route tokens, the new page after a 40ms handoff', () => {
    expect(CSS).toMatch(/--vt-slide:\s*var\(--motion-route\)/);
    expect(GLOBALS_CSS).toMatch(/--motion-route:\s*32px;/);
    expect(durationToken('--vt-duration')).toBe('route');
    expect(CSS).toMatch(/--vt-ease:\s*theme\(['"]transitionTimingFunction\.move['"]\)/);
    expect(durationToken('--vt-duration-enter')).toBe('hover');
    expect(DURATIONS.handoff).toBe('40ms');
  });

  // Phase R2 set the figure morph; Phase R4 made it the one travelling element
  // (re-judge 3, P0-1): 740 -> 400ms on the same spring, above the leaving
  // page and beneath the arriving one, so no text is ever drawn under it.
  it('moves a report figure on the gentle spring over the morph token, clipped to its rounded box, beneath the arriving page', () => {
    const group = declarationsFor(CSS, `::view-transition-group(.${FIGURE_MORPH_CLASS})`);
    expect(group).toMatch(/animation-duration:\s*var\(--vt-duration-figure\)/);
    expect(group).toMatch(/animation-timing-function:\s*var\(--vt-ease-figure\)/);
    expect(group).toMatch(/clip-path:\s*inset\(0 round/);
    expect(CSS).toMatch(/--vt-duration-figure:\s*var\(--duration-morph\)/);
    expect(CSS).toMatch(/--vt-ease-figure:\s*var\(--ease-spring-gentle\)/);
    expect(declarationsFor(CSS, `::view-transition-old(.${FIGURE_MORPH_CLASS})`)).toMatch(/object-fit:\s*contain/);
    expect(declarationsFor(CSS, `::view-transition-new(.${FIGURE_MORPH_CLASS})`)).toMatch(/object-fit:\s*cover/);
    // the browser's own cross-fade, so the pair blends without dimming
    for (const pseudo of ['old', 'new']) {
      expect(declarationsFor(CSS, `::view-transition-${pseudo}(.${FIGURE_MORPH_CLASS})`), pseudo).not.toMatch(/animation/);
    }
    const figureLayer = Number(/z-index:\s*(\d+)/.exec(group)?.[1]);
    const arrivingLayer = Number(/z-index:\s*(\d+)/.exec(declarationsFor(CSS, `::view-transition-group(.${ARRIVING_PAGE_CLASS})`))?.[1]);
    expect(figureLayer).toBeGreaterThan(0);
    expect(arrivingLayer).toBeGreaterThan(figureLayer);
    // a report opens inside 600ms of the click: 120ms to start, the rest to move
    const REPORT_OPEN_MOTION_MAX_MS = 480;
    expect(Math.max(tokenMs('morph'), tokenMs('route'), tokenMs('handoff') + tokenMs('hover'))).toBeLessThanOrEqual(
      REPORT_OPEN_MOTION_MAX_MS,
    );
  });

  it('keeps no title morph', () => {
    expect(CSS).not.toMatch(/text-morph|vt-morph-blur|--vt-duration-morph/);
  });

  // Phase R4: the landing into the interior is the one loud handoff.
  it('hands the landing into the interior louder: the scene pushes in as it dissolves and the page rises from further, inside 450ms', () => {
    expect(declarationsFor(CSS, `${FROM_LANDING}::view-transition-old(.${ROUTE_CLASS})`)).toMatch(
      /var\(--vt-duration-push\) var\(--vt-ease-out\) both vt-push-out/,
    );
    const arriving = declarationsFor(CSS, `${FROM_LANDING}::view-transition-new(.${ROUTE_CLASS})`);
    expect(arriving).toMatch(/var\(--vt-duration-rise\) var\(--vt-ease-out\) var\(--vt-delay-landing\) both vt-rise-in/);
    expect(arriving).toMatch(/--vt-rise:\s*var\(--vt-rise-landing\)/);
    expect(arriving).toMatch(/--vt-rise-blur:\s*var\(--vt-rise-blur-landing\)/);
    expect(CSS).toMatch(/--vt-rise-landing:\s*var\(--motion-route\)/);
    expect(CSS).toMatch(/--vt-rise-blur-landing:\s*var\(--blur-enter\)/);
    expect(CSS).toMatch(/--vt-push-scale:\s*var\(--scale-push\)/);
    expect(GLOBALS_CSS).toMatch(/--scale-push:\s*1\.08;/);
    const push = braceBody(CSS, CSS.indexOf('{', CSS.indexOf('@keyframes vt-push-out')));
    expect(push).toMatch(/opacity:\s*0/);
    expect(push).toMatch(/transform:\s*scale\(var\(--vt-push-scale\)\)/);
    expect(durationToken('--vt-duration-push')).toBe('morph');
    expect(durationToken('--vt-delay-landing')).toBe('exit');
    const LANDING_MAX_MS = 450;
    expect(tokenMs('morph')).toBeLessThanOrEqual(LANDING_MAX_MS);
    expect(tokenMs('exit') + tokenMs('enter')).toBeLessThanOrEqual(LANDING_MAX_MS);
  });

  it('crosses the landing bar over to the interior bar, which settles into place', () => {
    for (const selector of [`${FROM_LANDING}::view-transition-old(site-header)`, `${TO_LANDING}::view-transition-old(site-header)`]) {
      expect(declarationsFor(CSS, selector), selector).toMatch(/display:\s*block/);
      expect(declarationsFor(CSS, selector), selector).toMatch(/vt-fade-out/);
    }
    expect(declarationsFor(CSS, `${FROM_LANDING}::view-transition-new(site-header)`)).toMatch(/vt-settle-in/);
    expect(declarationsFor(CSS, `${TO_LANDING}::view-transition-new(site-header)`)).toMatch(/vt-fade-in/);
    const settle = braceBody(CSS, CSS.indexOf('{', CSS.indexOf('@keyframes vt-settle-in')));
    expect(settle).toMatch(/transform:\s*translateY\(calc\(-1 \* var\(--vt-settle\)\)\)/);
  });

  it('crossfades every navigation under reduced motion on the fast token, and moves nothing', () => {
    const at = CSS.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at).toBeGreaterThanOrEqual(0);
    const reduced = braceBody(CSS, CSS.indexOf('{', at));
    expect(declarationsFor(reduced, '::view-transition-group(*)')).toMatch(/animation:\s*none/);
    const outgoing = declarationsFor(reduced, '::view-transition-old(*)');
    const incoming = declarationsFor(reduced, '::view-transition-new(*)');
    expect(outgoing).toMatch(/var\(--vt-duration-fast\)[^;]*vt-fade-out/);
    expect(incoming).toMatch(/var\(--vt-duration-fast\)[^;]*vt-fade-in/);
    for (const body of [outgoing, incoming]) expect(body).not.toMatch(/vt-slide|vt-rise|vt-push|vt-settle/);
    // the header swaps in place
    expect(declarationsFor(reduced, '::view-transition-new(site-header)')).toMatch(/animation:\s*none/);
    expect(declarationsFor(reduced, '::view-transition-old(site-header)')).toMatch(/display:\s*none/);
    expect(durationToken('--vt-duration-fast')).toBe('fast');
  });

  it('styles every class the route boundary and the reading path hand to React', () => {
    for (const cls of [ROUTE_CLASS, NAV_FORWARD, NAV_BACK]) {
      expect(declarationsFor(CSS, `::view-transition-old(.${cls})`), cls).toMatch(/animation:/);
      expect(declarationsFor(CSS, `::view-transition-new(.${cls})`), cls).toMatch(/animation:/);
    }
    expect(declarationsFor(CSS, `::view-transition-group(.${ARRIVING_PAGE_CLASS})`)).toMatch(/z-index:/);
    expect(declarationsFor(CSS, `::view-transition-group(.${FIGURE_MORPH_CLASS})`)).toMatch(/z-index:/);
  });

  it('keeps every duration and curve on the tokens and moves only opacity, transform and blur', () => {
    expect(CSS).not.toMatch(/\d+m?s\b|cubic-bezier|(?<![\w-])(?:ease(?:-in-out|-in|-out)?|linear)(?![\w-])/);

    const keyframes = [...CSS.matchAll(/@keyframes\s+[\w-]+\s*\{/g)].map((m) =>
      braceBody(CSS, (m.index ?? 0) + m[0].length - 1),
    );
    expect(keyframes.length).toBeGreaterThan(0);
    const animated = new Set(keyframes.flatMap((body) => [...body.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1])));
    expect([...animated].sort()).toEqual(['filter', 'opacity', 'transform']);
  });
});
