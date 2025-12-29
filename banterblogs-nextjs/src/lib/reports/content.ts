import fs from 'fs';
import path from 'path';
import { renderMarkdownToHtml, extractPrimaryHeading } from '@/lib/episodes';
import { findReportFolder, toHumanTitle, type ReportLocation } from './locator';

export interface ReportSection {
  id: string;
  title: string;
  html: string;
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

async function buildSection(filePath: string, sourceLabel: string, originKey: string): Promise<ReportSection> {
  const raw = readFileContent(filePath);
  const fallback = path.basename(filePath, path.extname(filePath));
  const title = extractPrimaryHeading(raw) ?? toHumanTitle(fallback);
  const html = await renderMarkdownToHtml(raw);
  return {
    id: sanitizeId(title) || sanitizeId(fallback),
    title,
    html,
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
