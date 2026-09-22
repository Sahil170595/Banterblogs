// The route transition's vocabulary, outside the client module so server
// components (the reading path's links) can import the values themselves.

/** navigation types for <Link transitionTypes>: the reading path's direction */
export const NAV_FORWARD = 'nav-forward';
export const NAV_BACK = 'nav-back';
/** any other navigation: the page rises into place */
export const ROUTE_CLASS = 'route';
/** the arriving page's layer, above anything that travels between the two pages */
export const ARRIVING_PAGE_CLASS = 'nav-arrive';

/** what kind of page a navigation left and reached, for the route transitions in globals.css */
export const ROUTE_FROM_ATTRIBUTE = 'data-route-from';
export const ROUTE_TO_ATTRIBUTE = 'data-route-to';
export const LANDING_ROUTE = 'landing';
export const INTERIOR_ROUTE = 'interior';
const LANDING_PATH = '/';

export type RouteKind = typeof LANDING_ROUTE | typeof INTERIOR_ROUTE;

export function routeKind(pathname: string): RouteKind {
  return pathname === LANDING_PATH ? LANDING_ROUTE : INTERIOR_ROUTE;
}
