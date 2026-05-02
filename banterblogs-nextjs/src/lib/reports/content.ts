import fs from 'fs';
import path from 'path';
import { renderMarkdownToHtml, extractPrimaryHeading } from '@/lib/episodes';
import { findReportFolder, toHumanTitle, type ReportLocation } from './locator';

export interface ReportSection {
  id: string;
  title: string;
  html: string;
  markdown: string;
  sourceLabel: string;
  originKey: string;
}

function isMarkdownFile(fileName: string) {
  return /\.md$/i.test(fileName);
}

function readFileContent(filePath: string) {
  return fs.readFileSync(filePath, 'utf8');
}

function sanitizeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function sectionWeight(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower === 'summary.md') return 0;
  if (lower.endsWith('_summary.md')) return 1;
  if (lower.includes('report')) return 2;
  if (lower === 'readme.md') return 3;
  return 10;
}

// Rewrite inline markdown links like [TR134](Technical_Report_134.md) or
// (Technical_Report_134_v2.md) or (../../reports/Technical_Report_119v1.md)
// to absolute /reports/<slug> routes.
// Strips:
//   - any path prefix (../../reports/, etc.)
//   - any version marker matching [_]?v\d+(\.\d+)? (handles _v2, _v2.2, v1)
//   - the .md extension
// Site has one canonical file per TR; all version variants resolve to the same slug.
function rewriteReportLinks(markdown: string): string {
  return markdown.replace(/\(([^)]*Technical_Report_[^)]+\.md)\)/gi, (_match, target: string) => {
    const basename = target.replace(/^.*[\\/]/, '');
    const stripped = basename
      .replace(/\.md$/i, '')
      .replace(/_?v\d+(\.\d+)?/gi, '');
    const slug = stripped
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `(/reports/${slug})`;
  });
}

async function buildSection(filePath: string, sourceLabel: string, originKey: string): Promise<ReportSection> {
  const raw = readFileContent(filePath);
  const fallback = path.basename(filePath, path.extname(filePath));
  const title = extractPrimaryHeading(raw) ?? toHumanTitle(fallback);
  const processed = rewriteReportLinks(raw);
  const html = await renderMarkdownToHtml(processed);
  return {
    id: sanitizeId(title) || sanitizeId(fallback),
    title,
    html,
    markdown: raw,
    sourceLabel,
    originKey,
  };
}

interface MarkdownEntry {
  path: string;
  weight: number;
  displayLabel: string;
  dedupeKey: string;
}

function listMarkdownFiles(location: ReportLocation): MarkdownEntry[] {
  if (location.kind === 'file') {
    return [
      {
        path: location.path,
        weight: 0,
        displayLabel: `${location.source} - ${path.basename(location.path)}`,
        dedupeKey: `${location.source}:${path.basename(location.path)}`,
      },
    ];
  }

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(location.path, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && isMarkdownFile(entry.name))
    .map((entry) => {
      const filePath = path.join(location.path, entry.name);
      const relative = path.relative(location.path, filePath) || entry.name;
      const normalized = relative.replace(/\\/g, '/');
      return {
        path: filePath,
        weight: sectionWeight(entry.name),
        displayLabel: `${location.source} - ${normalized}`,
        dedupeKey: `${location.source}:${normalized}`,
      };
    })
    .sort((a, b) => {
      if (a.weight !== b.weight) return a.weight - b.weight;
      return a.dedupeKey.localeCompare(b.dedupeKey);
    });
}

export async function readReportSections(id: string, locationOverride?: ReportLocation): Promise<ReportSection[]> {
  const location = locationOverride ?? findReportFolder(id);
  if (!location) return [];

  const files = listMarkdownFiles(location);
  const sections: ReportSection[] = [];
  for (const entry of files) {
    try {
      const section = await buildSection(entry.path, entry.displayLabel, entry.dedupeKey);
      sections.push(section);
    } catch {
      // ignore malformed markdown files
    }
  }
  return sections;
}
