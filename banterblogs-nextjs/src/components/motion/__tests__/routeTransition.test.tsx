import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewTransitionProps } from 'react';
import { RouteTransition } from '../RouteTransition';
import {
  ARRIVING_PAGE_CLASS,
  INTERIOR_ROUTE,
  LANDING_ROUTE,
  NAV_BACK,
  NAV_FORWARD,
  ROUTE_CLASS,
  ROUTE_FROM_ATTRIBUTE,
  ROUTE_TO_ATTRIBUTE,
  routeKind,
} from '../routeTransitionTypes';

// Every page-to-page navigation moves (Phase R4, re-judge 3 P1-3). React
// animates only what a <ViewTransition> names (it cancels the root snapshot),
// so the page sits in one keyed by the path: a route change removes one
// boundary and places another, and React names the old page and the new one
// with the classes below. A same-page change keeps the key and starts no
// transition.

const { pathname, mounts } = vi.hoisted(() => ({
  pathname: { current: '/reports' },
  mounts: [] as Array<Omit<ViewTransitionProps, 'children'>>,
}));

vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

// Next bundles the React canary that exports ViewTransition; the npm React
// these tests run on has none, so a stand-in records each mount.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  function RecordingViewTransition({ children, ...props }: ViewTransitionProps) {
    actual.useEffect(() => {
      mounts.push(props);
    }, []);
    return actual.createElement(actual.Fragment, null, children);
  }
  return { ...actual, ViewTransition: RecordingViewTransition };
});

const root = () => document.documentElement;
const marks = () => [root().getAttribute(ROUTE_FROM_ATTRIBUTE), root().getAttribute(ROUTE_TO_ATTRIBUTE)];
const page = () => (
  <RouteTransition>
    <main>page</main>
  </RouteTransition>
);

beforeEach(() => {
  pathname.current = '/reports';
  mounts.length = 0;
  root().removeAttribute(ROUTE_FROM_ATTRIBUTE);
  root().removeAttribute(ROUTE_TO_ATTRIBUTE);
});

afterEach(cleanup);

describe('route transition boundary', () => {
  it('rises any page into place, slides the reading path by direction, and puts the arriving page on the top layer', () => {
    const { getByRole } = render(page());

    expect(getByRole('main').textContent).toBe('page');
    expect(mounts).toEqual([
      {
        enter: {
          [NAV_FORWARD]: `${NAV_FORWARD} ${ARRIVING_PAGE_CLASS}`,
          [NAV_BACK]: `${NAV_BACK} ${ARRIVING_PAGE_CLASS}`,
          default: `${ROUTE_CLASS} ${ARRIVING_PAGE_CLASS}`,
        },
        exit: { [NAV_FORWARD]: NAV_FORWARD, [NAV_BACK]: NAV_BACK, default: ROUTE_CLASS },
        default: 'none',
      },
    ]);
  });

  it('places a fresh boundary on every path change, so each navigation moves the page', () => {
    const view = render(page());
    pathname.current = '/tools';
    view.rerender(page());
    pathname.current = '/tools/chimeraforge';
    view.rerender(page());

    expect(mounts).toHaveLength(3);
  });

  it('keeps its boundary while the path holds, so a same-page change starts no transition', () => {
    const view = render(page());
    view.rerender(page());

    expect(mounts).toHaveLength(1);
  });

  it('marks nothing on the first render: a full page load is not a navigation', () => {
    render(page());

    expect(marks()).toEqual([null, null]);
  });

  it('marks the kind of page a navigation left and reached', () => {
    pathname.current = '/';
    const view = render(page());

    pathname.current = '/reports';
    act(() => view.rerender(page()));
    expect(marks()).toEqual([LANDING_ROUTE, INTERIOR_ROUTE]);

    pathname.current = '/tools';
    act(() => view.rerender(page()));
    expect(marks()).toEqual([INTERIOR_ROUTE, INTERIOR_ROUTE]);

    pathname.current = '/';
    act(() => view.rerender(page()));
    expect(marks()).toEqual([INTERIOR_ROUTE, LANDING_ROUTE]);
  });

  it('tells the landing from every interior page', () => {
    expect(['/', '/reports', '/reports/technical-report-138', '/show', '/tools/chimeraforge'].map(routeKind)).toEqual([
      LANDING_ROUTE,
      INTERIOR_ROUTE,
      INTERIOR_ROUTE,
      INTERIOR_ROUTE,
      INTERIOR_ROUTE,
    ]);
  });

  it('wraps the page, main and footer, and never the header, in the root layout', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf8');
    const boundary = /<RouteTransition>([\s\S]*?)<\/RouteTransition>/.exec(layout)?.[1] ?? '';
    expect(layout.match(/<RouteTransition>/g)).toHaveLength(1);
    expect(boundary).toMatch(/<main\b/);
    expect(boundary).toMatch(/<Footer\s*\/>/);
    expect(boundary).not.toMatch(/<Header\b/);
  });
});
