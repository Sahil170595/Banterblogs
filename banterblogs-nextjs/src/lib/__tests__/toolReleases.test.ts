import { describe, expect, it } from 'vitest';
import { SYNC_TOOLS, releaseSummary, releasesFromPypi } from '../../../scripts/sync-tool-releases.mjs';
import {
  TOOL_RELEASES,
  compareVersions,
  formatReleaseDate,
  formatReleaseMonth,
  groupByMonth,
  latestRelease,
  releaseHistory,
  type ToolRelease,
} from '../toolReleases';
import { TOOLS } from '../tools';

// The tool pages show each CLI's release history from a committed snapshot
// of PyPI (src/lib/toolReleases.json, written by scripts/sync-tool-releases.mjs);
// the site never fetches it at build or request time. These tests hold the
// snapshot to tools.ts, so neither can move without the other.

const SYNC_COMMAND = 'node scripts/sync-tool-releases.mjs';
const release = (version: string, uploadedAt: string, extra: Partial<ToolRelease> = {}): ToolRelease => ({ version, uploadedAt, yanked: false, ...extra });

describe('the committed release snapshot', () => {
  it('covers exactly the tools in tools.ts, each from its own PyPI package and repository', () => {
    expect(TOOL_RELEASES.tools.map((tool) => tool.slug)).toEqual(TOOLS.map((tool) => tool.slug));
    for (const tool of TOOLS) {
      const history = releaseHistory(tool.slug)!;
      expect(history.source).toBe(`https://pypi.org/pypi/${tool.slug}/json`);
      expect(history.notesSource).toBe(`${tool.repo}/releases`);
      expect(history.releases.length).toBeGreaterThan(0);
    }
    expect(releaseHistory('nope')).toBeUndefined();
  });

  it('syncs the same packages and repositories tools.ts names', () => {
    expect(SYNC_TOOLS.map((tool) => [tool.slug, `https://pypi.org/project/${tool.package}/`, `https://github.com/${tool.repo}`])).toEqual(
      TOOLS.map((tool) => [tool.slug, tool.pypi, tool.repo]),
    );
  });

  it('dates the snapshot and every release with a timestamp that parses, none after the snapshot', () => {
    const fetched = Date.parse(TOOL_RELEASES.fetchedAt);
    expect(Number.isNaN(fetched)).toBe(false);
    for (const { slug, releases } of TOOL_RELEASES.tools) {
      for (const item of releases) {
        const uploaded = Date.parse(item.uploadedAt);
        expect(Number.isNaN(uploaded), `${slug} ${item.version} uploadedAt "${item.uploadedAt}"`).toBe(false);
        expect(uploaded, `${slug} ${item.version} is dated after the snapshot`).toBeLessThanOrEqual(fetched);
      }
    }
  });

  it('lists each version once, newest upload first', () => {
    for (const { slug, releases } of TOOL_RELEASES.tools) {
      const versions = releases.map((item) => item.version);
      expect(new Set(versions).size, `${slug} repeats a version`).toBe(versions.length);
      for (const version of versions) expect(version, slug).toMatch(/^\d+\.\d+\.\d+$/);
      const times = releases.map((item) => Date.parse(item.uploadedAt));
      expect(times, `${slug} is not newest first`).toEqual([...times].sort((a, b) => b - a));
    }
  });

  // The snapshot may run ahead of tools.ts (both CLIs release several times a
  // week, and a bump there means re-checking the facts transcribed from that
  // version); it may never fall behind it. The page marks the release it
  // describes, so a reader sees the newer ones above it.
  it('is never older than tools.ts: the version every surface states is in it, not yanked, and nothing newer is missing', () => {
    const stale: string[] = [];
    const fix = `the snapshot is stale: run \`${SYNC_COMMAND}\` and commit src/lib/toolReleases.json`;
    for (const tool of TOOLS) {
      const { releases } = releaseHistory(tool.slug)!;
      const stated = releases.find((item) => item.version === tool.version);
      if (!stated) stale.push(`${tool.slug}: tools.ts states v${tool.version}, which the release snapshot does not list; ${fix}`);
      else if (stated.yanked) stale.push(`${tool.slug}: tools.ts states v${tool.version}, which PyPI has yanked; state a release that installs`);
      const latest = latestRelease(releases)?.version;
      if (latest === undefined || compareVersions(latest, tool.version) < 0) {
        stale.push(`${tool.slug}: tools.ts states v${tool.version}, newer than the snapshot's latest release v${latest}; ${fix}`);
      }
    }
    expect(stale).toEqual([]);
  });

  it('keeps a summary short, on one line, and never empty', () => {
    for (const { slug, releases } of TOOL_RELEASES.tools) {
      for (const item of releases) {
        if (item.summary === undefined) continue;
        expect(item.summary.trim(), `${slug} ${item.version}`).toBe(item.summary);
        expect(item.summary, `${slug} ${item.version}`).toMatch(/^[^\n]{1,141}$/);
      }
    }
  });
});

describe('reading a release list', () => {
  it('orders versions by their numbers, not as text', () => {
    expect(compareVersions('0.100.0', '0.99.0')).toBeGreaterThan(0);
    expect(compareVersions('0.12.2', '0.12.10')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('takes the highest version that is not yanked as the latest', () => {
    const releases = [
      release('0.3.0', '2026-03-03T00:00:00Z', { yanked: true }),
      release('0.2.1', '2026-03-02T00:00:00Z'),
      release('0.2.0', '2026-03-01T00:00:00Z'),
    ];
    expect(latestRelease(releases)?.version).toBe('0.2.1');
    expect(latestRelease([release('0.1.0', '2026-01-01T00:00:00Z', { yanked: true })])).toBeUndefined();
  });

  it('groups releases by the UTC month they were uploaded in, newest month first, with each group’s span', () => {
    const groups = groupByMonth([
      release('0.4.0', '2026-11-02T10:00:00Z'),
      // 23:30 on Oct 31 in New York is already November in UTC
      release('0.3.1', '2026-11-01T03:30:00Z'),
      release('0.3.0', '2026-10-20T10:00:00Z'),
      release('0.2.0', '2026-10-01T00:00:00Z'),
    ]);
    expect(groups.map((group) => [group.month, group.releases.map((item) => item.version)])).toEqual([
      ['2026-11', ['0.4.0', '0.3.1']],
      ['2026-10', ['0.3.0', '0.2.0']],
    ]);
    expect([groups[1].newest.version, groups[1].oldest.version]).toEqual(['0.3.0', '0.2.0']);
  });

  it('writes dates and months in UTC, whatever the reader’s clock', () => {
    expect(formatReleaseDate('2026-11-01T03:30:00Z')).toBe('Nov 1, 2026');
    expect(formatReleaseDate('2026-10-31T23:59:59Z')).toBe('Oct 31, 2026');
    expect(formatReleaseMonth('2026-11')).toBe('November 2026');
  });
});

describe('the sync script', () => {
  it('reads a PyPI response into one row per release: its first upload, yanked only when every file is', () => {
    const rows = releasesFromPypi({
      releases: {
        '0.2.0': [
          { upload_time_iso_8601: '2026-03-09T00:51:55.000000Z', yanked: false },
          { upload_time_iso_8601: '2026-03-09T00:51:52.192981Z', yanked: false },
        ],
        '0.10.0': [{ upload_time_iso_8601: '2026-08-01T12:00:00.000000Z', yanked: true }],
        '0.9.0': [{ upload_time_iso_8601: '2026-07-01T12:00:00.000000Z', yanked: false }],
        // a release with no files has no upload date to show
        '0.1.0': [],
      },
    });
    expect(rows).toEqual([
      { version: '0.10.0', uploadedAt: '2026-08-01T12:00:00Z', yanked: true },
      { version: '0.9.0', uploadedAt: '2026-07-01T12:00:00Z', yanked: false },
      { version: '0.2.0', uploadedAt: '2026-03-09T00:51:52Z', yanked: false },
    ]);
  });

  // bodies in the shapes the two repositories' notes take (CRLF as GitHub returns them)
  it('takes a release’s one line from its own notes: the first heading or sentence, markers off', () => {
    expect(releaseSummary('### Minimum audit coverage\r\n\r\n- Add an optional floor for cells contributing to the prediction scorecard while retaining the full audit on insufficient coverage.\r\n')).toBe(
      'Minimum audit coverage',
    );
    expect(releaseSummary('- Require selected original annotation parts in staged returns and distinguish them from other absent parts in JSON and JUnit.\r\n')).toBe(
      'Require selected original annotation parts in staged returns and distinguish them from other absent parts in JSON and JUnit.',
    );
    expect(releaseSummary('**Heterogeneous GPU fleets: `plan --fleet "H100 80GB,A100 80GB,L4 24GB"`.**\n\nThe planner has always sized N identical replicas')).toBe(
      'Heterogeneous GPU fleets: plan --fleet "H100 80GB,A100 80GB,L4 24GB".',
    );
  });

  it('skips a notes’ boilerplate: the release-process line, a bare section heading, the compare link', () => {
    expect(releaseSummary('Releases PR #155 individually as chimeraforge 0.85.0.\n\n### Read-only original Kubernetes inspection\n\n- Add deploy-inspect')).toBe(
      'Read-only original Kubernetes inspection',
    );
    expect(releaseSummary('### Added\n\n- **`chimeraforge contribute export|verify|import|list`** share bench results.')).toBe(
      'chimeraforge contribute export|verify|import|list share bench results.',
    );
    expect(
      releaseSummary('Releases PR #165 individually as quantfit 0.51.0.\n\nRelease context: 0.51.0 extends released 0.50.0. Candidate-stage\nstatements retained below.\n\n- Add frozen `ProbeCorpus` to *verify-safety*.'),
    ).toBe('Add frozen ProbeCorpus to verify-safety.');
    expect(releaseSummary('Quantfit 0.20.0 releases PR #123 individually: observed Inspect GGUF provider.')).toBe('observed Inspect GGUF provider.');
    expect(releaseSummary('**Full Changelog**: https://github.com/Sahil170595/Chimeraforge/compare/v0.0.1...v0.2.2')).toBeUndefined();
    expect(releaseSummary('')).toBeUndefined();
    expect(releaseSummary(null)).toBeUndefined();
  });

  it('joins a hard-wrapped paragraph, and trims a long one at a sentence or a word, saying so', () => {
    expect(releaseSummary('Four correctness defects, found by probing the published package the way an outside\nuser meets it rather than by reading the source. All four produced a confident wrong answer.')).toBe(
      'Four correctness defects, found by probing the published package the way an outside user meets it rather than by reading the source.',
    );
    const long = `- ${'word '.repeat(60).trim()}`;
    const trimmed = releaseSummary(long)!;
    expect(trimmed.length).toBeLessThanOrEqual(141);
    expect(trimmed).toMatch(/^(word )+word…$/);
  });
});
