import fs from 'fs';
import path from 'path';

interface ReportRoot {
  root: string;
  label: string;
}

export type ReportEntryKind = 'directory' | 'file';

export interface ReportLocation {
  slug: string;
  path: string;
  label: string;
  source: string;
  kind: ReportEntryKind;
}

const ROOT_CANDIDATES: ReportRoot[] = [
  { root: path.join(process.cwd(), 'PublishReady', 'reports'), label: 'publish-ready' },
];

// Module-level cache for the filesystem scan. Build time previously walked
// PublishReady/reports/ once per call — generateStaticParams + every
// ReportDetail render + every readReportMeta lookup. With ~60 reports that's
// 60 + 60 + N lookups → ~120+ readdirSync calls. Now: one walk, cached.
//
// Cache is keyed by an absolute path → an array of locations. Build runs in
// a fresh Node process so the cache survives across page renders within a
// single build. ISR revalidation also benefits: subsequent requests in the
// same revalidate window hit cached scans instead of touching disk.
let cachedDiscover: ReportLocation[] | null = null;
const cachedLookups = new Map<string, ReportLocation[]>();

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function listEntries(root: string) {
  try {
    return fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
}

function scanReports(): ReportLocation[] {
  const results: ReportLocation[] = [];
  for (const candidate of ROOT_CANDIDATES) {
    const entries = listEntries(candidate.root);
    for (const entry of entries) {
      const isDirectory = entry.isDirectory();
      const isMarkdownFile = entry.isFile() && entry.name.toLowerCase().endsWith('.md');
      if (!isDirectory && !isMarkdownFile) continue;

      // Skip READMEs — they are not reports
      if (entry.name.toLowerCase() === 'readme.md') continue;

      // Skip short TR alias directories (e.g. TR108/) — metadata is in the static catalog
      if (isDirectory && /^TR\d+$/i.test(entry.name)) continue;

      const label = isDirectory ? entry.name : entry.name.replace(/\.md$/i, '');
      const baseSlug = normalizeSlug(label);
      const isGenericName = ['summary', 'index'].includes(baseSlug);
      const slug = isGenericName ? normalizeSlug(`${candidate.label}-${label}`) : baseSlug;
      if (!slug) continue;
      const entryPath = path.join(candidate.root, entry.name);
      results.push({
        slug,
        path: entryPath,
        label,
        source: candidate.label,
        kind: isDirectory ? 'directory' : 'file',
      });
    }
  }
  return results.sort((a, b) => a.slug.localeCompare(b.slug) || a.path.localeCompare(b.path));
}

export function discoverReports(): ReportLocation[] {
  if (cachedDiscover) return cachedDiscover;
  cachedDiscover = scanReports();
  return cachedDiscover;
}

/**
 * Dedupe `discoverReports()` by slug. Three consumers (the /reports page, the
 * /reports/[id] detail prev/next nav, and the /reports.json manifest) all need
 * the same operation; consolidating here so a future scanner change updates
 * one place instead of three slightly-different copies.
 *
 * `preferDirectory` (default: true): when a slug exists as both a `.md` file
 * AND a same-named directory, keep the directory entry — multi-section reports
 * (summary.md + report.md inside a folder) need the directory location so
 * `readReportSections` walks the folder. Without this preference the alphabetical
 * `.md` would win and the second section silently drops.
 */
export function discoverReportsUnique({ preferDirectory = true }: { preferDirectory?: boolean } = {}): ReportLocation[] {
  const out: Record<string, ReportLocation> = {};
  for (const entry of discoverReports()) {
    const existing = out[entry.slug];
    if (!existing) {
      out[entry.slug] = entry;
      continue;
    }
    if (preferDirectory && existing.kind === 'file' && entry.kind === 'directory') {
      out[entry.slug] = entry;
    }
  }
  return Object.values(out);
}

export function findReportFolder(id: string): ReportLocation | null {
  const target = normalizeSlug(id);
  if (!target) return null;
  return discoverReports().find((entry) => entry.slug === target) ?? null;
}

export function findReportLocations(id: string): ReportLocation[] {
  const target = normalizeSlug(id);
  if (!target) return [];
  const cached = cachedLookups.get(target);
  if (cached) return cached;
  const result = discoverReports().filter((entry) => entry.slug === target);
  cachedLookups.set(target, result);
  return result;
}

export function toHumanTitle(slugOrLabel: string): string {
  const base = slugOrLabel.replace(/[_-]+/g, ' ').trim();
  if (!base) return slugOrLabel;
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}
