import { NextRequest, NextResponse } from 'next/server';

// Canonicalize /reports/<id> slug aliases at the edge with a true 308 —
// e.g. /reports/Technical_Report_134 -> /reports/technical-report-134.
// The page-level permanentRedirect remains as a safety net, but an edge
// redirect keeps real HTTP semantics independent of render streaming.
//
// The slug transform mirrors lib/reports/locator.ts normalizeSlug — inlined
// because the edge runtime cannot import the fs-backed locator module.
const CANONICAL_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/reports\/([^/]+)$/);
  if (!match) return NextResponse.next();

  let raw: string;
  try {
    raw = decodeURIComponent(match[1]);
  } catch {
    // malformed percent-encoding: let the route answer instead of a 500 here
    console.warn('[proxy] malformed percent-encoding in report slug:', request.nextUrl.pathname);
    return NextResponse.next();
  }
  if (CANONICAL_SLUG.test(raw)) return NextResponse.next();

  const normalized = normalizeSlug(raw);
  if (!normalized || normalized === raw) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/reports/${normalized}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Only slugs that are NOT the CANONICAL_SLUG shape reach the proxy, so
  // canonical report requests skip it — including the .rsc and
  // .segments/*.segment.rsc transport forms Next appends to every matcher.
  // Next compiles this without the `i` flag, so uppercase aliases still match.
  matcher: '/reports/:id((?![a-z0-9]+(?:-[a-z0-9]+)*(?:\\.rsc|\\.segments/.+\\.segment\\.rsc)?$)[^/]+)',
};
