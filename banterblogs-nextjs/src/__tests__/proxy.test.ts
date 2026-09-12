// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getMiddlewareMatchers } from 'next/dist/build/analysis/get-page-static-info';
import proxy, { config } from '../proxy';

// exported at runtime (the build calls it for every proxy matcher) but
// missing from Next's published .d.ts
declare module 'next/dist/build/analysis/get-page-static-info' {
  export function getMiddlewareMatchers(
    matcher: string,
    nextConfig: { basePath?: string; i18n?: unknown },
  ): Array<{ regexp: string; originalSource: string }>;
}

// Next compiles config.matcher (appending its .json / .rsc / .segments
// transport suffixes) and tests requests with new RegExp(regexp). Running the
// same compilation here means the test sees exactly what the runtime sees.
const [compiled] = getMiddlewareMatchers(config.matcher, {});
const invokesProxy = (pathname: string) => new RegExp(compiled.regexp).test(pathname);

// '%A' is a truncated escape: decodeURIComponent throws a URIError on it
const MALFORMED_SLUG_PATH = '/reports/%E0%A4%A';

describe('report slug proxy matcher', () => {
  it.each([
    '/reports/technical-report-134',
    '/reports/technical-report-134.rsc',
    '/reports/technical-report-134.segments/_tree.segment.rsc',
    '/reports/compendium',
  ])('lets canonical %s skip the proxy', (pathname) => {
    expect(invokesProxy(pathname)).toBe(false);
  });

  it.each([
    '/reports/Technical_Report_134',
    '/reports/Technical_Report_134.rsc',
    '/reports/Technical-Report-134',
    '/reports/technical_report_134',
    '/reports/Technical%20Report%20134',
    '/reports/-technical-report-134',
    '/reports/technical-report-134-',
    '/reports/technical--report-134',
  ])('sends alias %s through the proxy', (pathname) => {
    expect(invokesProxy(pathname)).toBe(true);
  });

  it('sends a malformed percent-encoded slug through the proxy too', () => {
    expect(invokesProxy(MALFORMED_SLUG_PATH)).toBe(true);
  });
});

describe('report slug proxy', () => {
  const run = (pathname: string) =>
    proxy(new NextRequest(new URL(pathname, 'https://chimeraforge.vercel.app')));

  it('308s an alias to its canonical slug', () => {
    const response = run('/reports/Technical_Report_134');
    expect(response.status).toBe(308);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/reports/technical-report-134');
  });

  it('passes a canonical slug straight through', () => {
    expect(run('/reports/technical-report-134').headers.get('x-middleware-next')).toBe('1');
  });

  it('passes a malformed percent-encoding through instead of throwing a 500', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const response = run(MALFORMED_SLUG_PATH);

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(warn).toHaveBeenCalledWith('[proxy] malformed percent-encoding in report slug:', MALFORMED_SLUG_PATH);
    warn.mockRestore();
  });
});
