import fs from 'fs';
import path from 'path';
import { summarizeMarkdown } from '@/lib/episodes';
import { findReportLocations, toHumanTitle } from './locator';

export interface ReportMeta {
  title?: string;
  description?: string;
  tags?: string[];
  source?: string;
}

function summarizeFile(filePath: string, fallbackTitle: string) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const summary = summarizeMarkdown(raw, fallbackTitle);
    return {
      title: summary.title ?? fallbackTitle,
      description: summary.description,
    };
  } catch {
    return { title: fallbackTitle, description: undefined };
  }
}

export function readReportMeta(id: string): ReportMeta | null {
  const locations = findReportLocations(id);
  if (!locations.length) return null;

  // 1. Look for explicit metadata in directory locations.
  for (const location of locations) {
    if (location.kind !== 'directory') continue;
    const metaPath = path.join(location.path, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    try {
      const raw = fs.readFileSync(metaPath, 'utf8');
      const parsed = JSON.parse(raw) as ReportMeta;
      return { ...parsed, source: location.source };
    } catch {
      // ignore invalid JSON and continue searching
    }
  }

  const markdownCandidates = ['SUMMARY.md', 'README.md', 'index.md'];
  let fallback: ReportMeta | null = null;

  for (const location of locations) {
    if (location.kind === 'file') {
      const summary = summarizeFile(location.path, toHumanTitle(location.label));
      const candidate: ReportMeta = {
        title: summary.title,
        description: summary.description,
        source: location.source,
      };
      if (candidate.description) return candidate;
      if (!fallback) fallback = candidate;
      continue;
    }

    for (const candidateName of markdownCandidates) {
      const candidatePath = path.join(location.path, candidateName);
      if (!fs.existsSync(candidatePath)) continue;
      const summary = summarizeFile(candidatePath, toHumanTitle(location.label));
      const candidate: ReportMeta = {
        title: summary.title,
        description: summary.description,
        source: location.source,
      };
      if (candidate.description) return candidate;
      if (!fallback) fallback = candidate;
    }
  }

  if (fallback) return fallback;

  const first = locations[0];
  return {
    title: toHumanTitle(first.label),
    source: first.source,
  };
}
