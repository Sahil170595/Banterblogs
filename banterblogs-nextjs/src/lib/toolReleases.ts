import { z } from 'zod';
import snapshot from './toolReleases.json';

// Each CLI's release history, read from the committed snapshot beside this
// file (written by scripts/sync-tool-releases.mjs from PyPI's JSON API and
// the GitHub release notes). Nothing here fetches: a stale snapshot is caught
// by toolReleases.test.ts, which holds its latest version to tools.ts.

const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'not a timestamp');

const releaseSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** the release's first file upload, UTC */
  uploadedAt: timestamp,
  yanked: z.boolean(),
  /** one line from the release's own notes, verbatim or trimmed; absent when it has none */
  summary: z.string().min(1).optional(),
});

const historySchema = z.object({
  slug: z.string(),
  package: z.string(),
  /** the PyPI endpoint the rows were read from */
  source: z.url(),
  /** where the one-line summaries come from */
  notesSource: z.url(),
  /** newest upload first */
  releases: z.array(releaseSchema).min(1),
});

const snapshotSchema = z.object({ fetchedAt: timestamp, tools: z.array(historySchema) });

export type ToolRelease = z.infer<typeof releaseSchema>;
export type ToolReleaseHistory = z.infer<typeof historySchema>;

export const TOOL_RELEASES = snapshotSchema.parse(snapshot);

export function releaseHistory(slug: string): ToolReleaseHistory | undefined {
  return TOOL_RELEASES.tools.find((tool) => tool.slug === slug);
}

/** orders "0.100.0" after "0.99.0": by each number, not as text */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** the highest version that is not yanked: what `pip install` resolves to */
export function latestRelease(releases: ToolRelease[]): ToolRelease | undefined {
  return releases.filter((release) => !release.yanked).sort((a, b) => compareVersions(b.version, a.version))[0];
}

export interface ReleaseMonth {
  /** "2026-11", in UTC */
  month: string;
  releases: ToolRelease[];
  newest: ToolRelease;
  oldest: ToolRelease;
}

const MONTH_KEY_CHARS = 'YYYY-MM'.length;
const monthKey = (release: ToolRelease) => new Date(release.uploadedAt).toISOString().slice(0, MONTH_KEY_CHARS);

/** Releases, newest first, as runs of one UTC month each. */
export function groupByMonth(releases: ToolRelease[]): ReleaseMonth[] {
  const groups: ReleaseMonth[] = [];
  for (const release of releases) {
    const month = monthKey(release);
    const group = groups.at(-1);
    if (group && group.month === month) {
      group.releases.push(release);
      group.oldest = release;
    } else {
      groups.push({ month, releases: [release], newest: release, oldest: release });
    }
  }
  return groups;
}

// pinned to UTC, so the server and every reader's clock write the same day
const DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
const MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long' });

/** "Nov 27, 2026" */
export const formatReleaseDate = (iso: string) => DAY.format(new Date(iso));

/** "2026-11" as "November 2026" */
export const formatReleaseMonth = (month: string) => MONTH.format(new Date(`${month}-01T00:00:00Z`));
