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
  { root: path.join(process.cwd(), 'reports'), label: 'reports' },
  { root: path.join(process.cwd(), 'PublishReady', 'reports'), label: 'publish-ready' },
  { root: path.join(process.cwd(), 'PublishReady', 'notebooks', 'exports'), label: 'publish-ready-exports' },
  { root: path.join(process.cwd(), '..', 'Banterhearts', 'reports'), label: 'banterhearts' },
  { root: path.join(process.cwd(), '..', 'Banterhearts', 'PublishReady', 'notebooks', 'exports'), label: 'banterhearts-exports' },
];

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

export function discoverReports(): ReportLocation[] {
  const results: ReportLocation[] = [];
  for (const candidate of ROOT_CANDIDATES) {
    const entries = listEntries(candidate.root);
    for (const entry of entries) {
      const isDirectory = entry.isDirectory();
      const isMarkdownFile = entry.isFile() && entry.name.toLowerCase().endsWith('.md');
      if (!isDirectory && !isMarkdownFile) continue;

      const label = isDirectory ? entry.name : entry.name.replace(/\.md$/i, '');
      const slug = normalizeSlug(label);
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

export function findReportFolder(id: string): ReportLocation | null {
  const target = normalizeSlug(id);
  if (!target) return null;
  const entries = discoverReports();
  return entries.find((entry) => entry.slug === target) ?? null;
}

export function findReportLocations(id: string): ReportLocation[] {
  const target = normalizeSlug(id);
  if (!target) return [];
  return discoverReports().filter((entry) => entry.slug === target);
}

export function toHumanTitle(slugOrLabel: string): string {
  const base = slugOrLabel.replace(/[_-]+/g, ' ').trim();
  if (!base) return slugOrLabel;
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}
