import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// These routes read only files that ship inside the deployment (posts/,
// PublishReady/reports/, lib/). A revalidate window would redo seconds of
// markdown rendering every 15 minutes for byte-identical output.
const BUILD_TIME_ROUTES = [
  'app/reports/page.tsx',
  'app/reports/[id]/page.tsx',
  'app/episodes/[slug]/page.tsx',
  'app/api/episodes/route.ts',
  'app/reports.json/route.ts',
  'app/search.json/route.ts',
];
const ROUTE_HANDLERS = BUILD_TIME_ROUTES.filter((route) => route.endsWith('route.ts'));

const source = (route: string) => readFileSync(path.resolve(__dirname, '..', route), 'utf8');

describe('build-time routes', () => {
  it.each(BUILD_TIME_ROUTES)('%s is not on a revalidate timer', (route) => {
    expect(source(route)).not.toMatch(/export const revalidate\b/);
  });

  it.each(ROUTE_HANDLERS)('%s stays a static route handler', (route) => {
    expect(source(route)).toMatch(/export const dynamic = 'force-static'/);
  });
});
