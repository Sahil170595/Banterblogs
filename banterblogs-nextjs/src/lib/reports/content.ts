import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import type { Element, ElementContent, Root } from 'hast';
import {
  extractHeadings,
  extractPrimaryHeading,
  extractTreeHeadings,
  hastToHtml,
  MIN_TOC_HEADINGS,
  renderMarkdownTree,
  textOf,
  type TocEntry,
} from '@/lib/episodes';
import { findReportFolder, normalizeSlug, toHumanTitle, type ReportLocation } from './locator';

/** A piece of a report's title block, as rendered HTML and as plain text. */
export interface FoldedText {
  html: string;
  text: string;
}

/** One key/value line of a report's leading metadata. */
export interface ReportField {
  label: string;
  html: string;
  text: string;
}

/**
 * A report's title block, folded out of the body for the page head: the
 * document's own title, its subtitles, its leading metadata, and the date it
 * states (yyyy-mm-dd) if it states one.
 */
export interface ReportFrontMatter {
  title: FoldedText;
  subtitles: FoldedText[];
  fields: ReportField[];
  date: string | null;
}

/** Tables, code blocks and figures rise into view; prose never moves. */
export type RevealKind = 'table' | 'code' | 'figure';

/**
 * One top-level element of a report body, which ReportMarkdown renders as the
 * same element with the same attributes. A table block is the <table> inside
 * its scroll box.
 */
export interface ReportBlock {
  tag: string;
  props: Record<string, string>;
  html: string;
  reveal: RevealKind | null;
}

export interface ReportSection {
  id: string;
  title: string;
  html: string;
  markdown: string;
  sourceLabel: string;
  originKey: string;
  headings: TocEntry[];
  blocks: ReportBlock[];
  frontMatter: ReportFrontMatter | null;
}

export interface ReportRenderOptions {
  /** Fold the title block into front matter (the page's primary document). */
  foldTitleBlock?: boolean;
  /** The page renders its own TOC: drop the markdown's. */
  dropInlineToc?: boolean;
}

export interface RenderedReport {
  html: string;
  headings: TocEntry[];
  blocks: ReportBlock[];
  frontMatter: ReportFrontMatter | null;
}

function isMarkdownFile(fileName: string) {
  return /\.md$/i.test(fileName);
}

function readFileContent(filePath: string): Promise<string> {
  return fsp.readFile(filePath, 'utf8');
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
//   - the .md extension
//   - any version marker matching [_]?v\d+(\.\d+)? — UNLESS the versioned slug
//     is itself a canonical report on disk (TR164_V3/V4/V5 are distinct reports,
//     not stale variants of technical-report-164).
function rewriteReportLinks(markdown: string): string {
  return markdown.replace(/\(([^)]*Technical_Report_[^)]+\.md)\)/gi, (_match, target: string) => {
    const basename = target.replace(/^.*[\\/]/, '').replace(/\.md$/i, '');
    const versionedSlug = normalizeSlug(basename);
    if (findReportFolder(versionedSlug)) {
      return `(/reports/${versionedSlug})`;
    }
    const slug = normalizeSlug(basename.replace(/_?v\d+(\.\d+)?/gi, ''));
    return `(/reports/${slug})`;
  });
}

// Markdown image refs into upstream research trees (../../scripts/…,
// ../data/…, ../../research/…) can never resolve on the site — relative
// report-adjacent files have no static route, and the plots live in the
// source research repo. Render an honest placeholder instead of a broken
// <img> with a dangling caption (39 such refs across TR119/120/122/123).
function rewriteDanglingFigures(markdown: string): string {
  return markdown.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/|\/)[^)]+\)/gi,
    (_match, alt: string) =>
      `*[Figure \`${alt || 'plot'}\` — artifact lives in the upstream research repository and is not bundled with the web build.]*`,
  );
}

/** A report's markdown as the site renders it: report links routed, dangling figures replaced. */
export function prepareReportMarkdown(raw: string): string {
  return rewriteDanglingFigures(rewriteReportLinks(raw));
}

// ── The title block ──────────────────────────────────────────────────────────
// The rule, read off the reports in PublishReady/reports/: the title block runs
// from the leading h1 (demoted to h2 by the renderer) to the author's first
// thematic break, or to an earlier section heading. The h1, the subtitle
// headings and the key/value metadata before any prose fold; other blocks in
// it (status notes, blockquotes, a lede) stay in the body with the break
// after them. See lib/__tests__/reportFrontMatter.test.ts.

const SUBHEADING = /^h[2-6]$/;
// every metadata table in the reports carries this header
const METADATA_HEADER = 'field|value';
// two labelled lines make a metadata block; a single one is a status note
const MIN_METADATA_LINES = 2;
const EXACT_DATE_LABEL = /^date$/i;
const ANY_DATE_LABEL = /\bdate\b/i;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
// "October 10, 2025", "October 2-3, 2025" (the first day of a range)
const LONG_DATE = new RegExp(String.raw`\b(${MONTHS.join('|')})\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,\s*(\d{4})\b`, 'i');

const isElement = (node: { type: string }): node is Element => node.type === 'element';
const rank = (el: Element) => Number(el.tagName.slice(1));
const classesOf = (el: Element) => (Array.isArray(el.properties.className) ? el.properties.className.map(String) : []);
const isTitle = (el: Element | undefined) => el?.tagName === 'h2' && el.properties.dataDemoted === true;
const textIn = (nodes: ElementContent[]) => nodes.map(textOf).join('').replace(/\s+/g, ' ').trim();
const folded = (nodes: ElementContent[]): FoldedText => ({ html: hastToHtml(nodes), text: textIn(nodes) });

function cellsOf(table: Element, section: 'thead' | 'tbody'): Element[][] {
  const part = table.children.find((child): child is Element => isElement(child) && child.tagName === section);
  if (!part) return [];
  return part.children
    .filter((row): row is Element => isElement(row) && row.tagName === 'tr')
    .map((row) => row.children.filter((cell): cell is Element => isElement(cell) && (cell.tagName === 'th' || cell.tagName === 'td')));
}

// The rows of a two-column "Field | Value" table in its scroll box.
function metadataRows(block: Element): Element[][] | null {
  if (block.tagName !== 'div' || !classesOf(block).includes('table-scroll')) return null;
  const table = block.children.find(isElement);
  if (table?.tagName !== 'table') return null;
  const head = cellsOf(table, 'thead');
  const body = cellsOf(table, 'tbody');
  if (head.length !== 1 || head[0].map((cell) => textOf(cell).trim().toLowerCase()).join('|') !== METADATA_HEADER) return null;
  if (!body.length || body.some((row) => row.length !== 2)) return null;
  return body;
}

// whitespace-only text at either end dropped, the text at the edges trimmed
function trimNodes(nodes: ElementContent[]): ElementContent[] {
  const out = [...nodes];
  const blank = (node: ElementContent | undefined) => node?.type === 'text' && !node.value.trim();
  while (blank(out[0])) out.shift();
  while (blank(out[out.length - 1])) out.pop();
  const first = out[0];
  if (first?.type === 'text') out[0] = { type: 'text', value: first.value.trimStart() };
  const last = out[out.length - 1];
  if (last?.type === 'text') out[out.length - 1] = { type: 'text', value: last.value.trimEnd() };
  return out;
}

// "**Label:** value" or "**Label**: value"
function labelledLine(nodes: ElementContent[]): ReportField | null {
  const [first, ...rest] = nodes;
  if (!first || !isElement(first) || first.tagName !== 'strong') return null;
  const strong = textOf(first).trim();
  let label: string;
  let value = rest;
  const next = rest[0];
  if (strong.endsWith(':')) {
    label = strong.slice(0, -1).trim();
  } else if (next?.type === 'text' && next.value.trimStart().startsWith(':')) {
    label = strong;
    value = [{ type: 'text', value: next.value.trimStart().slice(1) }, ...rest.slice(1)];
  } else {
    return null;
  }
  value = trimNodes(value);
  if (!label || !value.length) return null;
  return { label, ...folded(value) };
}

// A paragraph made only of labelled lines, split at its line breaks.
function labelledLines(block: Element): ReportField[] | null {
  if (block.tagName !== 'p') return null;
  const lines: ElementContent[][] = [[]];
  for (const child of block.children) {
    if (isElement(child) && child.tagName === 'br') {
      lines.push([]);
    } else if (child.type === 'text' && child.value.includes('\n')) {
      child.value.split('\n').forEach((part, index) => {
        if (index > 0) lines.push([]);
        if (part) lines[lines.length - 1].push({ type: 'text', value: part });
      });
    } else {
      lines[lines.length - 1].push(child);
    }
  }
  const fields: ReportField[] = [];
  for (const line of lines) {
    const nodes = trimNodes(line);
    if (!nodes.length) continue;
    const field = labelledLine(nodes);
    if (!field) return null;
    fields.push(field);
  }
  return fields.length ? fields : null;
}

/** The first date a value states, as yyyy-mm-dd; null when it names none or an impossible one. */
export function parseStatedDate(value: string): string | null {
  const found: Array<{ at: number; year: number; month: number; day: number }> = [];
  const iso = ISO_DATE.exec(value);
  if (iso) found.push({ at: iso.index, year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) });
  const long = LONG_DATE.exec(value);
  if (long) found.push({ at: long.index, year: Number(long[3]), month: MONTHS.indexOf(long[1].toLowerCase()) + 1, day: Number(long[2]) });
  const first = found.sort((a, b) => a.at - b.at)[0];
  if (!first) return null;
  const date = new Date(Date.UTC(first.year, first.month - 1, first.day));
  if (date.getUTCFullYear() !== first.year || date.getUTCMonth() !== first.month - 1 || date.getUTCDate() !== first.day) return null;
  return date.toISOString().slice(0, 10);
}

function statedDate(fields: ReportField[]): string | null {
  const field = fields.find((f) => EXACT_DATE_LABEL.test(f.label)) ?? fields.find((f) => ANY_DATE_LABEL.test(f.label));
  return field ? parseStatedDate(field.text) : null;
}

// Removes the title block from the tree and returns it; null when the
// document does not open with its title.
function foldTitleBlock(tree: Root): ReportFrontMatter | null {
  const blocks = tree.children.filter(isElement);
  const [title] = blocks;
  if (!isTitle(title)) return null;
  const fold = new Set<Element>([title]);
  const fields: ReportField[] = [];

  let i = 1;
  const run: Element[] = [];
  while (i < blocks.length && SUBHEADING.test(blocks[i].tagName)) run.push(blocks[i++]);
  const afterRun = blocks[i];

  let lede = false;
  let closing: Element | null = null;
  for (; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.tagName === 'hr') {
      closing = block;
      break;
    }
    // a section opens before the author closed the title block
    if (SUBHEADING.test(block.tagName)) break;
    if (!lede) {
      const rows = metadataRows(block);
      if (rows) {
        fields.push(...rows.map(([key, value]) => ({ label: textOf(key).trim(), ...folded(value.children) })));
        fold.add(block);
        continue;
      }
      const labelled: Array<{ block: Element; fields: ReportField[] }> = [];
      for (let k = i; k < blocks.length; k++) {
        const lines = labelledLines(blocks[k]);
        if (!lines) break;
        labelled.push({ block: blocks[k], fields: lines });
      }
      if (labelled.flatMap((l) => l.fields).length >= MIN_METADATA_LINES) {
        for (const l of labelled) {
          fields.push(...l.fields);
          fold.add(l.block);
        }
        i += labelled.length - 1;
        continue;
      }
    }
    lede = true;
  }

  // Subtitles fold when they head only title material, or when the author
  // closed the title block with a break; otherwise a heading above prose
  // opens a section.
  const subtitles: Element[] = [];
  if (run.length && (closing !== null || (afterRun !== undefined && fold.has(afterRun)))) subtitles.push(...run);
  if (closing) {
    // with the whole block folded, the break would only open the body
    if (!lede) fold.add(closing);
    // an orphan subtitle right after the break: it heads only a higher-rank heading
    for (let j = blocks.indexOf(closing) + 1; j + 1 < blocks.length; j++) {
      const [heading, next] = [blocks[j], blocks[j + 1]];
      if (!SUBHEADING.test(heading.tagName) || !SUBHEADING.test(next.tagName) || rank(next) >= rank(heading)) break;
      subtitles.push(heading);
    }
  }
  for (const subtitle of subtitles) fold.add(subtitle);
  tree.children = tree.children.filter((node) => !(isElement(node) && fold.has(node)));

  return {
    title: folded(title.children),
    subtitles: subtitles.map((heading) => folded(heading.children)),
    fields,
    date: statedDate(fields),
  };
}

// ── The body, block by block ─────────────────────────────────────────────────

// hast property names to the attribute props React renders the same markup from
function propsOf(el: Element): Record<string, string> {
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(el.properties)) {
    if (value === undefined || value === null || value === false) continue;
    const name = /^data[A-Z]/.test(key) ? `data-${key.slice(4).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).slice(1)}` : key;
    props[name] = Array.isArray(value) ? value.join(' ') : value === true ? '' : String(value);
  }
  return props;
}

const isFigure = (el: Element) => {
  const content = el.children.filter((child) => !(child.type === 'text' && !child.value.trim()));
  return el.tagName === 'p' && content.length > 0 && content.every((child) => isElement(child) && child.tagName === 'img');
};

function blockOf(el: Element): ReportBlock {
  const table = el.tagName === 'div' && classesOf(el).includes('table-scroll') ? el.children.find(isElement) : undefined;
  if (table?.tagName === 'table') return { tag: 'table', props: propsOf(table), html: hastToHtml(table.children), reveal: 'table' };
  const reveal: RevealKind | null = el.tagName === 'pre' ? 'code' : isFigure(el) ? 'figure' : null;
  return { tag: el.tagName, props: propsOf(el), html: hastToHtml(el.children), reveal };
}

/** Render a report document: its body HTML, contents, blocks and (optionally) folded title block. */
export async function renderReportDocument(markdown: string, options: ReportRenderOptions = {}): Promise<RenderedReport> {
  const tree = await renderMarkdownTree(markdown, { demoteH1: true, dropInlineToc: Boolean(options.dropInlineToc) });
  const frontMatter = options.foldTitleBlock ? foldTitleBlock(tree) : null;
  return {
    html: hastToHtml(tree),
    headings: extractTreeHeadings(tree),
    blocks: tree.children.filter(isElement).map(blockOf),
    frontMatter,
  };
}

async function buildSection(filePath: string, sourceLabel: string, originKey: string, primary: boolean): Promise<ReportSection> {
  const raw = await readFileContent(filePath);
  const fallback = path.basename(filePath, path.extname(filePath));
  const title = extractPrimaryHeading(raw) ?? toHumanTitle(fallback);
  // The report page renders the title as its <h1>, the primary document's
  // title block in its head and, past MIN_TOC_HEADINGS, its own TOC (ReportToc).
  const rendered = await renderReportDocument(prepareReportMarkdown(raw), {
    foldTitleBlock: primary,
    dropInlineToc: extractHeadings(raw).length >= MIN_TOC_HEADINGS,
  });
  return {
    id: sanitizeId(title) || sanitizeId(fallback),
    title,
    markdown: raw,
    sourceLabel,
    originKey,
    ...rendered,
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
  } catch (error) {
    console.error(`[reports/content] cannot read report directory ${location.path}:`, error);
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
  // Parallelise the section reads + renders. Most reports are single-file
  // so this is a no-op, but multi-section reports (summary.md + report.md)
  // get a free win, and ISR revalidation gets event-loop relief. The first
  // file is the primary document, whose title block the page head shows.
  const settled = await Promise.allSettled(
    files.map((entry, index) => buildSection(entry.path, entry.displayLabel, entry.dedupeKey, index === 0)),
  );
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      // A dropped section renders a 200 page with silently missing content — log it.
      console.error(`[reports/content] section failed for ${id} (${files[i]?.path}):`, r.reason);
    }
  });
  return settled
    .filter((r): r is PromiseFulfilledResult<ReportSection> => r.status === 'fulfilled')
    .map((r) => r.value);
}
