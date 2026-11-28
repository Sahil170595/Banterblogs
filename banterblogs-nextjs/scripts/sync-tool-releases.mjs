// Snapshots each CLI's release history into src/lib/toolReleases.json, which
// the tool pages read (src/lib/toolReleases.ts). The site never fetches this
// at build or request time: re-run the script and commit the file.
//
// Versions, upload dates and yanked flags come from PyPI's JSON API. Each
// release's one line comes from its own GitHub release notes, verbatim or
// trimmed (releaseSummary); a release without notes has no line.
//
// usage (from banterblogs-nextjs/):
//   node scripts/sync-tool-releases.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'src', 'lib', 'toolReleases.json');

// the packages and repositories src/lib/tools.ts names (toolReleases.test.ts holds the two together)
export const SYNC_TOOLS = [
  { slug: 'chimeraforge', package: 'chimeraforge', repo: 'Sahil170595/Chimeraforge' },
  { slug: 'quantfit', package: 'quantfit', repo: 'Sahil170595/quantfit' },
];

// names the client only: no person, project or contact detail
const USER_AGENT = 'tool-release-snapshot/1.0';
const FETCH_TIMEOUT_MS = 30_000;
const GITHUB_PAGE_SIZE = 100;
// a guard against a paging loop that never ends: 50 pages is 5,000 releases
const GITHUB_MAX_PAGES = 50;
// the longest line a row shows before it is trimmed, with an ellipsis after
export const SUMMARY_MAX_CHARS = 140;
const ELLIPSIS = '…';

const pypiUrl = (name) => `https://pypi.org/pypi/${name}/json`;
const notesUrl = (repo) => `https://github.com/${repo}/releases`;
// "2026-03-09T00:51:52.192981Z" to the second
const toSecond = (iso) => iso.replace(/\.\d+Z$/, 'Z');

/** PyPI's `releases` map as rows, newest upload first; a release with no files has no date and is left out. */
export function releasesFromPypi(pypi) {
  const rows = [];
  for (const [version, files] of Object.entries(pypi.releases)) {
    if (files.length === 0) continue;
    const uploads = files.map((file) => file.upload_time_iso_8601).sort();
    rows.push({ version, uploadedAt: toSecond(uploads[0]), yanked: files.every((file) => file.yanked) });
  }
  return rows.sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
}

const BLOCK_MARKER = /^(?:#{1,6}\s+|[-*+]\s+|>\s*|\d+\.\s+)/;
// blocks that say nothing about the release: Keep a Changelog's section
// names, the notes' own version heading, the compare link, the note on which
// release this one extends
const BOILERPLATE = [
  /^(?:added|changed|fixed|removed|deprecated|security|highlights|what's changed|what's new)$/i,
  /^\[?v?\d+\.\d+\.\d+\]?(?:\s+[-–—]\s+\d{4}-\d{2}-\d{2})?$/,
  /^full changelog:/i,
  /^release context:/i,
];
// the release-process sentence some notes open with ("Releases PR #155
// individually as chimeraforge 0.85.0."); what follows it is the line
const PROCESS_SENTENCE = /^.*?\breleases? PR #\d+ individually(?: as \S+ \d+\.\d+\.\d+)?[.:]\s*/i;

// `code`, **bold**, __bold__, *italic* and [text](url) down to their text
const plain = (text) =>
  text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/\*(\S(?:[^*]*\S)?)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

/** A body's blocks: a heading or list item on its own, a hard-wrapped paragraph joined. */
function blocks(body) {
  const out = [];
  let open = null;
  for (const raw of body.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) {
      open = null;
      continue;
    }
    const marked = BLOCK_MARKER.test(line);
    if (marked || open === null) {
      out.push(line.replace(BLOCK_MARKER, ''));
      // a heading is one line; a paragraph or a list item may wrap
      open = /^#/.test(line) ? null : out.length - 1;
    } else {
      out[open] += ` ${line}`;
    }
  }
  return out.map((block) => plain(block).replace(PROCESS_SENTENCE, '')).filter(Boolean);
}

function trim(text) {
  if (text.length <= SUMMARY_MAX_CHARS) return text;
  // the first sentences that fit, else whole words and an ellipsis
  const sentences = text.slice(0, SUMMARY_MAX_CHARS + 1).match(/^.*[.!?](?=\s)/);
  if (sentences) return sentences[0];
  return `${text.slice(0, SUMMARY_MAX_CHARS).replace(/\s+\S*$/, '')}${ELLIPSIS}`;
}

/** One line for a release from its GitHub notes, verbatim or trimmed; undefined when the notes say nothing. */
export function releaseSummary(body) {
  const first = blocks(body ?? '').find((block) => !BOILERPLATE.some((pattern) => pattern.test(block)));
  return first ? trim(first) : undefined;
}

async function getJson(url, accept) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  return response.json();
}

/** Every published GitHub release of `repo`, as a map from version to its notes. */
async function githubNotes(repo) {
  const notes = new Map();
  for (let page = 1; page <= GITHUB_MAX_PAGES; page++) {
    const releases = await getJson(`https://api.github.com/repos/${repo}/releases?per_page=${GITHUB_PAGE_SIZE}&page=${page}`, 'application/vnd.github+json');
    for (const release of releases) {
      if (!release.draft) notes.set(release.tag_name.replace(/^v/, ''), release.body);
    }
    if (releases.length < GITHUB_PAGE_SIZE) return notes;
  }
  throw new Error(`${repo} has more than ${GITHUB_MAX_PAGES * GITHUB_PAGE_SIZE} releases; raise GITHUB_MAX_PAGES`);
}

async function snapshotTool(tool) {
  const [pypi, notes] = await Promise.all([getJson(pypiUrl(tool.package), 'application/json'), githubNotes(tool.repo)]);
  const releases = releasesFromPypi(pypi).map((release) => {
    const summary = releaseSummary(notes.get(release.version));
    return summary ? { ...release, summary } : release;
  });
  if (releases.length === 0) throw new Error(`${tool.package}: PyPI lists no release with files`);
  const withNotes = releases.filter((release) => release.summary).length;
  console.log(`${tool.package}: ${releases.length} releases, ${releases.at(-1).uploadedAt} to ${releases[0].uploadedAt}; ${withNotes} with a line from their notes`);
  return { slug: tool.slug, package: tool.package, source: pypiUrl(tool.package), notesSource: notesUrl(tool.repo), releases };
}

async function main() {
  const fetchedAt = toSecond(new Date().toISOString());
  const tools = [];
  for (const tool of SYNC_TOOLS) tools.push(await snapshotTool(tool));
  writeFileSync(SNAPSHOT, `${JSON.stringify({ fetchedAt, tools }, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, SNAPSHOT)} (fetched ${fetchedAt})`);
}

// run only as a script: the tests import the pure parts above
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
