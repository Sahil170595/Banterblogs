import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import GithubSlugger from "github-slugger";
import type { Element, ElementContent, Root, RootContent } from "hast";
import { REVEAL_TARGET } from "@/components/motion/revealObserver";

export type EpisodePlatform = "banterpacks" | "chimera" | "benchmark" | "unknown";

export interface EpisodeMetrics {
  confidenceScore?: number;
  correlationStrength?: number;
  dataPointsAnalyzed?: number;
  summary?: string[];
}

export interface Episode {
  id: number;
  displayId?: number;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  commit: string;
  preview: string;
  content: string;
  filesChanged: number;
  linesAdded: number;
  complexity: number;
  tags: string[];
  readingTime: number;
  platform?: EpisodePlatform;
  metrics?: EpisodeMetrics;
}

// Client-safe projection: everything Episode carries EXCEPT the rendered
// markdown body. Server pages should strip `content` via `toEpisodeSummary`
// before handing a list to a `'use client'` component — otherwise Next
// serialises 14 KB of markdown per episode into the page HTML for hydration.
// For 193 episodes that's ~2.7 MB of dead weight on /episodes, /banterpacks,
// /chimera, /tags/[tag], and every episode-detail page (which re-ships the
// whole index for the recommendations panel).
export type EpisodeSummary = Omit<Episode, "content">;

export function toEpisodeSummary(episode: Episode): EpisodeSummary {
  // Destructure to drop `content`; the underscore prefix marks it as
  // intentionally unused so ESLint doesn't flag it.
  const { content: _content, ...summary } = episode;
  return summary;
}

const postsDirectory = path.join(process.cwd(), "posts");

// ── Reading surface: a rehype step shared by reports, episodes, compendium ──

// Share of a column's non-blank body cells that must parse as numbers before
// the whole column, header included, is marked `num` (right-aligned).
const NUMERIC_COLUMN_THRESHOLD = 0.8;

// Signed number with separators/decimals/exponent and an optional unit;
// "a ± b" counts as one value.
const NUMBER = String.raw`[+\-−]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)(?:e[+\-−]?\d+)?`;
const UNIT = String.raw`(?:%|pp|ms|s|GB|MB|K|M|B|x|×)`;
const QUANTITY = String.raw`(?:[×x]\s?)?${NUMBER}\s?${UNIT}?`;
const NUMERIC_CELL = new RegExp(String.raw`^${QUANTITY}(?:\s?(?:±|\+/-)\s?${QUANTITY})?$`, "i");
// Placeholders ("", "—", "n/a") count neither for nor against a column.
const BLANK_CELL = /^(?:[-–—]|n\/?a)?$/i;

// The markdown's own TOC heading ("Table of Contents", "2. Table of Contents").
const INLINE_TOC_HEADING = /^(\d+\.\s*)?table of contents$/i;
// Blocks that make up a markdown TOC body: lists or a table, plus label paragraphs.
const TOC_BODY_TAGS = new Set(["ul", "ol", "table", "p"]);

// A report page renders its own TOC once a document has this many headings.
export const MIN_TOC_HEADINGS = 3;

export interface RenderMarkdownOptions {
  /** The page renders the title as its <h1>: markdown h1s become h2s. */
  demoteH1?: boolean;
  /** The page renders its own TOC: drop the markdown's TOC section. */
  dropInlineToc?: boolean;
  /** Mark tables, code blocks and figures with the reveal target marker for a RevealScope (the report body). */
  markRevealTargets?: boolean;
}

const RENDER_OPTIONS_KEY = "readingSurface";

type HastParent = Root | Element;

export function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

function childElement(parent: Element, tagName: string): Element | undefined {
  return parent.children.find((child): child is Element => child.type === "element" && child.tagName === tagName);
}

function rowsOf(section: Element | undefined): Element[][] {
  if (!section) return [];
  return section.children
    .filter((row): row is Element => row.type === "element" && row.tagName === "tr")
    .map((row) =>
      row.children.filter((cell): cell is Element => cell.type === "element" && (cell.tagName === "th" || cell.tagName === "td")),
    );
}

function markNumericColumns(table: Element): void {
  const head = rowsOf(childElement(table, "thead"));
  const body = rowsOf(childElement(table, "tbody"));
  const columnCount = Math.max(0, ...head.map((row) => row.length), ...body.map((row) => row.length));
  for (let column = 0; column < columnCount; column += 1) {
    if (head[0]?.[column]?.properties.align) continue; // the author set this column's alignment
    const values = body
      .map((row) => row[column])
      .filter((cell): cell is Element => Boolean(cell))
      .map((cell) => textOf(cell).replace(/\s+/g, " ").trim())
      .filter((value) => !BLANK_CELL.test(value));
    if (values.length === 0) continue;
    const numeric = values.filter((value) => NUMERIC_CELL.test(value)).length;
    if (numeric / values.length < NUMERIC_COLUMN_THRESHOLD) continue;
    for (const row of [...head, ...body]) {
      const cell = row[column];
      if (!cell) continue;
      const existing = cell.properties.className;
      cell.properties.className = Array.isArray(existing) ? [...existing, "num"] : ["num"];
    }
  }
}

// a paragraph holding only images: the markdown figure
function isStandingImage(el: Element): boolean {
  const content = el.children.filter((child) => !(child.type === "text" && !child.value.trim()));
  return el.tagName === "p" && content.length > 0 && content.every((child) => child.type === "element" && child.tagName === "img");
}

// Wrap tables in a scroll box, mark numeric columns, (optionally) demote h1,
// and (optionally) mark tables, code blocks and figures as reveal targets:
// the table's scroll box, the pre, the figure or standing image, never the
// prose around them.
function transformElements(parent: HastParent, options: RenderMarkdownOptions): void {
  const target = options.markRevealTargets ? REVEAL_TARGET : {};
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];
    if (child.type !== "element") continue;
    if (child.tagName === "table") {
      markNumericColumns(child);
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"], ...target },
        children: [child],
      };
      continue;
    }
    if (child.tagName === "pre" || child.tagName === "figure") Object.assign(child.properties, target);
    if (isStandingImage(child)) {
      for (const image of child.children) if (image.type === "element") Object.assign(image.properties, target);
    }
    if (options.demoteH1 && child.tagName === "h1") {
      child.tagName = "h2";
      child.properties.dataDemoted = true; // lets extractHtmlHeadings skip the title
    }
    transformElements(child, options);
  }
}

function neighbourElement(blocks: RootContent[], from: number, step: 1 | -1): { node: Element; index: number } | undefined {
  for (let index = from + step; index >= 0 && index < blocks.length; index += step) {
    const node = blocks[index];
    if (node.type === "element") return { node, index };
    if (node.type === "text" && node.value.trim()) return undefined;
  }
  return undefined;
}

// Remove the TOC heading through its last list/table (label paragraphs between
// lists go with it; a trailing paragraph or any other block ends the TOC).
function dropInlineToc(tree: Root): void {
  const blocks = tree.children;
  const start = blocks.findIndex(
    (node) =>
      node.type === "element" &&
      (node.tagName === "h2" || node.tagName === "h3") &&
      INLINE_TOC_HEADING.test(textOf(node).trim()),
  );
  if (start === -1) return;
  let end = -1;
  for (let index = start + 1; index < blocks.length; index += 1) {
    const node = blocks[index];
    if (node.type !== "element") continue;
    if (!TOC_BODY_TAGS.has(node.tagName)) break;
    if (node.tagName !== "p") end = index;
  }
  if (end === -1) return;
  const before = neighbourElement(blocks, start, -1);
  const after = neighbourElement(blocks, end, 1);
  if (before?.node.tagName === "hr" && after?.node.tagName === "hr") end = after.index;
  blocks.splice(start, end - start + 1);
}

function rehypeReadingSurface() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const options = (file.data[RENDER_OPTIONS_KEY] ?? {}) as RenderMarkdownOptions;
    if (options.dropInlineToc) dropInlineToc(tree);
    transformElements(tree, options);
  };
}

// rehype-slug runs before the reading-surface step, so ids never shift.
const markdownProcessor = remark()
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  .use(rehypeHighlight)
  .use(rehypeReadingSurface)
  .use(rehypeStringify);

/** The rendered HTML tree of a markdown document, before it is stringified. */
export async function renderMarkdownTree(markdown: string, options: RenderMarkdownOptions = {}): Promise<Root> {
  // the reading-surface step reads its options from the file's data
  const file = { value: markdown, data: { [RENDER_OPTIONS_KEY]: options } };
  return (await markdownProcessor.run(markdownProcessor.parse(file), file)) as Root;
}

/** HTML for a rendered tree, or for a run of its nodes. */
export function hastToHtml(node: Root | RootContent[]): string {
  return markdownProcessor.stringify(Array.isArray(node) ? { type: "root", children: node } : node);
}

export async function renderMarkdownToHtml(markdown: string, options: RenderMarkdownOptions = {}): Promise<string> {
  return hastToHtml(await renderMarkdownTree(markdown, options));
}

export function extractPrimaryHeading(markdown: string): string | undefined {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

// Average adult reading speed used for the "min read" estimate.
const WORDS_PER_MINUTE = 200;

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

/**
 * Extract headings from one markdown document.
 * Uses github-slugger to match the IDs generated by rehype-slug.
 * Call once per independently-rendered markdown section to keep
 * the slugger state in sync with rehype-slug (which resets per render call).
 */
export function extractHeadings(markdown: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const headings: TocEntry[] = [];
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].replace(/\*\*/g, '').replace(/`/g, '').trim();
    const id = slugger.slug(text);
    // The page's own TOC replaces the markdown one (dropInlineToc); slugging
    // it anyway keeps later ids in step with rehype-slug.
    if (level <= 3 && INLINE_TOC_HEADING.test(text)) continue;
    headings.push({ id, text, level });
  }
  return headings;
}

/**
 * The contents of a rendered tree: its top-level h2-h4 with the ids
 * rehype-slug gave them, skipping a demoted title and the markdown's own TOC
 * heading. Reads what the page will show, so headings inside code blocks or
 * folded out of the body never reach the contents.
 */
export function extractTreeHeadings(tree: Root): TocEntry[] {
  const headings: TocEntry[] = [];
  for (const node of tree.children) {
    if (node.type !== "element" || !/^h[2-4]$/.test(node.tagName) || node.properties.dataDemoted) continue;
    const level = Number(node.tagName.slice(1));
    const text = textOf(node).replace(/\s+/g, " ").trim();
    const id = node.properties.id;
    if (!text || typeof id !== "string") continue;
    if (level <= 3 && INLINE_TOC_HEADING.test(text)) continue;
    headings.push({ id, text, level });
  }
  return headings;
}

/**
 * Extract headings from ALREADY-RENDERED HTML (episode.content), reading the
 * real ids rehype-slug emitted. Server-side companion to extractHeadings for
 * consumers that only hold the rendered document (episode TOC).
 */
export function extractHtmlHeadings(html: string): TocEntry[] {
  const headings: TocEntry[] = [];
  const re = /<h([2-4])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (/^<h\d[^>]*\sdata-demoted/.test(match[0])) continue; // the page title, demoted by the renderer
    const text = match[3].replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ id: match[2], text, level: Number(match[1]) });
  }
  return headings;
}

export interface ContentStatsSummary {
  wordCount: number;
  readingTime: number;
  headingCount: number;
  imageCount: number;
  codeBlockCount: number;
  linkCount: number;
}

/**
 * Server-side content stats over rendered HTML. Replaces the old client-side
 * DOM-parse (which forced the full article into a client component's props).
 */
export function computeContentStats(html: string): ContentStatsSummary {
  const text = html.replace(/<[^>]+>/g, ' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return {
    wordCount,
    readingTime: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
    headingCount: (html.match(/<h[1-6][\s>]/gi) ?? []).length,
    imageCount: (html.match(/<img[\s>]/gi) ?? []).length,
    codeBlockCount: (html.match(/<pre[\s>]/gi) ?? []).length,
    linkCount: (html.match(/<a[\s>]/gi) ?? []).length,
  };
}

export function summarizeMarkdown(markdown: string, fallbackTitle?: string) {
  const lines = markdown.split(/\r?\n/);
  let title = fallbackTitle ?? extractPrimaryHeading(markdown);
  let seenHeading = Boolean(title);
  const summary: string[] = [];
  let subtitle = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!seenHeading) {
      const match = /^#\s+(.+)$/.exec(line);
      if (match) {
        title = match[1].trim();
        seenHeading = true;
      }
      continue;
    }

    if (!line) {
      if (summary.length) break;
      continue;
    }
    // Capture H2 subtitle as fallback but keep scanning for body text
    if (/^##\s+(.+)$/.test(line)) {
      if (!subtitle) subtitle = line.replace(/^##\s+/, '').trim();
      continue;
    }
    if (line.startsWith('#')) break;
    summary.push(line);
    if (summary.join(' ').length > 240) break;
  }

  const description = summary.join(' ') || subtitle;

  return {
    title,
    description,
  };
}

type Frontmatter = Record<string, unknown>;

interface ResolvedEpisodeMetadata {
  title?: string;
  subtitle?: string;
  date?: string;
  commit?: string;
  filesChanged?: number;
  linesAdded?: number;
  complexity?: number;
  tags?: string[];
  slug?: string;
  preview?: string;
  platform: EpisodePlatform;
  displayId: number;
  metrics?: EpisodeMetrics;
}

const NUMBER_REGEXPS = {
  filesChanged: [
    /Files Changed[:\s]*([\d,]+)/i,
    /\*\*Files Changed\*\*[:\s]*([\d,]+)/i,
  ],
  linesAdded: [
    /Lines Added[:\s]*([\d,]+)/i,
    /\*\*Lines Added\*\*[:\s]*([\d,]+)/i,
  ],
  complexity: [
    /Complexity(?: Score)?[:\s]*([\d,]+)/i,
    /\*\*Complexity(?: Score)?\*\*[:\s]*([\d,]+)/i,
    /Chaos score\s*([\d]+)/i,
  ],
};

const AUTO_TAG_HINTS: Array<[string, string]> = [
  ["banterpacks", "banterpacks"],
  ["chimera", "chimera"],
  ["banterhearts", "banterhearts"],
  ["ai ", "ai"],
  [" llm", "ai"],
  ["machine learning", "ai"],
  ["testing", "testing"],
  ["deployment", "deployment"],
  ["architecture", "architecture"],
  ["benchmark", "benchmarks"],
  ["performance", "performance"],
];

export const getAllEpisodes = cache(async (): Promise<Episode[]> => {
  const episodes: Episode[] = [];

  const banterpacksDir = path.join(postsDirectory, "banterpacks");
  if (fs.existsSync(banterpacksDir)) {
    const banterpacksFiles = fs.readdirSync(banterpacksDir);
    const banterpacksEpisodes = await Promise.all(
      banterpacksFiles
        .filter((name) => name.endsWith(".md"))
        .map(async (fileName) => {
          const parsedId = parseInt(fileName.replace(/[^\d]/g, ""), 10);
          const fullPath = path.join(banterpacksDir, fileName);
          const fileContents = fs.readFileSync(fullPath, "utf8");

          return processEpisodeFile(fileContents, parsedId, "banterpacks", parsedId);
        }),
    );
    episodes.push(...banterpacksEpisodes);
  }

  const chimeraDir = path.join(postsDirectory, "chimera");
  if (fs.existsSync(chimeraDir)) {
    const chimeraFiles = fs.readdirSync(chimeraDir);
    const chimeraEpisodes = await Promise.all(
      chimeraFiles
        .filter((name) => name.endsWith(".md"))
        .map(async (fileName) => {
          const originalId = parseInt(fileName.replace(/[^\d]/g, ""), 10);
          const id = Number.isFinite(originalId) ? originalId + 1000 : Number.NaN;
          const fullPath = path.join(chimeraDir, fileName);
          const fileContents = fs.readFileSync(fullPath, "utf8");

          return processEpisodeFile(fileContents, id, "chimera", originalId);
        }),
    );
    episodes.push(...chimeraEpisodes);
  }

  ensureUniqueEpisodeSlugs(episodes);
  assignStableEpisodeIds(episodes);

  return episodes.sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
});

async function processEpisodeFile(
  fileContents: string,
  id: number,
  platform: EpisodePlatform,
  originalId?: number,
): Promise<Episode> {
  const { content, data } = matter(fileContents);
  const metadata = resolveEpisodeMetadata(data ?? {}, content, id, platform, originalId);

  // The episode page renders the title as its <h1>.
  const htmlContent = await renderMarkdownToHtml(content, { demoteH1: true });

  const preview = metadata.preview ?? extractPreview(content);
  const tags = buildTags(content, metadata.tags);

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  const defaultSlug = createDefaultSlug(metadata.platform, metadata.displayId);
  const slug = sanitizeSlugCandidate(metadata.slug, defaultSlug);

  return {
    id,
    displayId: metadata.displayId,
    slug,
    title: metadata.title ?? `Episode ${metadata.displayId}`,
    subtitle: metadata.subtitle ?? "Development Update",
    date: metadata.date ?? new Date().toISOString(),
    commit: metadata.commit ?? "",
    preview,
    content: htmlContent,
    filesChanged: metadata.filesChanged ?? 0,
    linesAdded: metadata.linesAdded ?? 0,
    complexity: metadata.complexity ?? 0,
    tags,
    readingTime,
    platform: metadata.platform,
    metrics: metadata.metrics,
  };
}

function resolveEpisodeMetadata(
  data: Frontmatter,
  content: string,
  id: number,
  platform: EpisodePlatform,
  originalId?: number,
): ResolvedEpisodeMetadata {
  const displayId = originalId ?? id;
  const base: ResolvedEpisodeMetadata = {
    platform,
    displayId,
  };

  const frontmatterMeta: Partial<ResolvedEpisodeMetadata> = {};

  if (data && typeof data === "object") {
    const title = coerceString((data as Frontmatter).title);
    if (title) {
      frontmatterMeta.title = title;
    }

    const displayIdOverride = coerceNumber(
      (data as Frontmatter).displayId ??
        (data as Frontmatter).episodeNumber ??
        (data as Frontmatter).number,
    );
    if (displayIdOverride !== undefined) {
      frontmatterMeta.displayId = displayIdOverride;
    }

    const subtitle = coerceString((data as Frontmatter).subtitle);
    if (subtitle) {
      frontmatterMeta.subtitle = subtitle;
    }

    const date = coerceDate((data as Frontmatter).date);
    if (date) {
      frontmatterMeta.date = date;
    }

    const commit = coerceString((data as Frontmatter).commit);
    if (commit) {
      frontmatterMeta.commit = commit;
    }

    const filesChanged = coerceNumber((data as Frontmatter).filesChanged);
    if (filesChanged !== undefined) {
      frontmatterMeta.filesChanged = filesChanged;
    }

    const linesAdded = coerceNumber((data as Frontmatter).linesAdded);
    if (linesAdded !== undefined) {
      frontmatterMeta.linesAdded = linesAdded;
    }

    const complexity = coerceNumber((data as Frontmatter).complexity);
    if (complexity !== undefined) {
      frontmatterMeta.complexity = complexity;
    }

    const tags = toStringArray((data as Frontmatter).tags);
    if (tags) {
      frontmatterMeta.tags = tags;
    }

    const slug = coerceString((data as Frontmatter).slug);
    if (slug) {
      frontmatterMeta.slug = slug;
    }

    const preview = coerceString((data as Frontmatter).preview);
    if (preview) {
      frontmatterMeta.preview = preview;
    }

    const frontmatterPlatform = normalizePlatform((data as Frontmatter).platform);
    if (frontmatterPlatform) {
      frontmatterMeta.platform = frontmatterPlatform;
    }

    const metrics = parseMetrics((data as Frontmatter).metrics);
    if (metrics) {
      frontmatterMeta.metrics = metrics;
    }
  }

  const fallback = fallbackMetadata(content, displayId);

  return {
    ...fallback,
    ...base,
    ...frontmatterMeta,
    tags: mergeTags(frontmatterMeta.tags, fallback.tags),
  };
}

function fallbackMetadata(content: string, displayId: number): Partial<ResolvedEpisodeMetadata> {
  const metadata: Partial<ResolvedEpisodeMetadata> = {};

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.title = cleanHeading(titleMatch[1]);
  }

  const subtitleMatch = content.match(/^##\s+(.+)$/m);
  if (subtitleMatch) {
    metadata.subtitle = cleanHeading(subtitleMatch[1]);
  }

  // Date detection — try in order of specificity:
  //   1. Full ISO timestamp (e.g. 2025-09-27T22:22:12-04:00)
  //   2. Plain ISO date (e.g. 2025-10-02) — chimera episode 19+ format
  //   3. Human-readable weekday + year (e.g. "Sunday, September 7, 2025 at 05:59 PM") — banterpacks format
  // The previous emoji-strip regex was mangled UTF-16 gibberish (/^dY["'-]\s*/),
  // which left "📅 ..." in the input and caused every banterpacks episode to
  // fail date parsing and default to new Date(). Strip leading non-alphanumerics
  // explicitly instead.
  const isoDateMatch = content.match(/\b\d{4}-\d{2}-\d{2}T[^\s]+/);
  if (isoDateMatch) {
    const parsed = new Date(isoDateMatch[0]);
    if (!Number.isNaN(parsed.getTime())) {
      metadata.date = parsed.toISOString();
    }
  }
  if (!metadata.date) {
    const plainDateMatch = content.match(/###[^\n]*?\b(\d{4}-\d{2}-\d{2})\b/);
    if (plainDateMatch) {
      const parsed = new Date(`${plainDateMatch[1]}T00:00:00Z`);
      if (!Number.isNaN(parsed.getTime())) {
        metadata.date = parsed.toISOString();
      }
    }
  }
  if (!metadata.date) {
    const fallbackDate = content.match(/###\s+[^\n]*?(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)[^\n]*\b(\d{4})/i);
    if (fallbackDate) {
      const cleaned = fallbackDate[0]
        .replace(/^###\s+/, "")
        .replace(/^[^\w\d]+/, "");
      const parsed = new Date(cleaned);
      if (!Number.isNaN(parsed.getTime())) {
        metadata.date = parsed.toISOString();
      }
    }
  }

  // Commit hash detection — singular or plural ("Commit: `abc1234`" or
  // "Commits: `hash1`, `hash2`"). Take the first hash either way.
  const commitMatch = content.match(/Commits?:\s*`([0-9a-f]{7,40})`/i);
  if (commitMatch) {
    metadata.commit = commitMatch[1];
  }

  metadata.filesChanged = extractNumber(content, NUMBER_REGEXPS.filesChanged);
  metadata.linesAdded = extractNumber(content, NUMBER_REGEXPS.linesAdded);
  metadata.complexity = extractNumber(content, NUMBER_REGEXPS.complexity);

  metadata.preview = extractPreview(content);
  metadata.displayId = displayId;
  metadata.platform = "unknown";

  return metadata;
}

function parseMetrics(raw: unknown): EpisodeMetrics | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const metrics: EpisodeMetrics = {};
  const record = raw as Record<string, unknown>;

  const confidence = coerceNumber(record.confidenceScore ?? record.confidence);
  if (confidence !== undefined) {
    metrics.confidenceScore = confidence;
  }

  const correlation = coerceNumber(record.correlationStrength ?? record.correlation);
  if (correlation !== undefined) {
    metrics.correlationStrength = correlation;
  }

  const dataPoints = coerceNumber(record.dataPointsAnalyzed ?? record.dataPoints ?? record.samples);
  if (dataPoints !== undefined) {
    metrics.dataPointsAnalyzed = dataPoints;
  }

  const summary = toStringArray(record.summary ?? record.notes);
  if (summary && summary.length > 0) {
    metrics.summary = summary;
  }

  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

function mergeTags(primary?: string[], secondary?: string[]): string[] {
  const tagSet = new Set<string>();
  primary?.forEach((tag) => tagSet.add(tag));
  secondary?.forEach((tag) => tagSet.add(tag));
  return Array.from(tagSet);
}

function createDefaultSlug(platform: EpisodePlatform, displayId: number): string {
  const prefix = platform === "chimera" ? "chimera-episode" : "episode";
  return `${prefix}-${displayId.toString().padStart(3, "0")}`;
}

function sanitizeSlugCandidate(rawSlug: unknown, fallback: string): string {
  const base =
    typeof rawSlug === "string" && rawSlug.trim().length > 0 ? rawSlug : fallback;

  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  const sanitized = normalized.length > 0 ? normalized : fallback;
  return sanitized;
}

function ensureUniqueEpisodeSlugs(episodes: Episode[]): void {
  const used = new Set<string>();
  const slugCounts = new Map<string, number>();

  for (const episode of episodes) {
    const baseSlug = episode.slug;
    let candidate = baseSlug;
    let suffix = slugCounts.get(baseSlug) ?? 0;

    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }

    slugCounts.set(baseSlug, suffix);
    used.add(candidate);

    episode.slug = candidate;
  }
}

function assignStableEpisodeIds(episodes: Episode[]): void {
  const platformOffsets: Record<EpisodePlatform, number> = {
    banterpacks: 0,
    chimera: 10_000,
    benchmark: 20_000,
    unknown: 30_000,
  };

  const usedIds = new Set<number>();

  for (const episode of episodes) {
    const platform = episode.platform ?? "unknown";
    const offset = platformOffsets[platform] ?? platformOffsets.unknown;

    const displayBase =
      typeof episode.displayId === "number" && Number.isFinite(episode.displayId)
        ? episode.displayId
        : undefined;

    let candidate = offset + (displayBase ?? hashStringToInt(episode.slug));

    while (usedIds.has(candidate)) {
      candidate += 1;
    }

    usedIds.add(candidate);
    episode.id = candidate;

    if (typeof episode.displayId !== "number" || !Number.isFinite(episode.displayId)) {
      episode.displayId = displayBase ?? candidate;
    }
  }
}

function hashStringToInt(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || value.length;
}

function buildTags(content: string, existing?: string[]): string[] {
  const lowerContent = content.toLowerCase();
  const tagSet = new Set<string>((existing ?? []).map((tag) => tag.toLowerCase()));

  for (const [needle, tag] of AUTO_TAG_HINTS) {
    if (lowerContent.includes(needle)) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet);
}

function extractPreview(content: string): string {
  const whyIndex = content.indexOf("### Why It Matters");
  let excerpt = "";

  if (whyIndex !== -1) {
    const afterWhy = content.slice(whyIndex).split("\n").slice(1);
    for (const line of afterWhy) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      if (trimmed.startsWith("---") || trimmed.startsWith("###")) {
        break;
      }
      excerpt += `${trimmed} `;
      if (excerpt.length > 300) {
        break;
      }
    }
  }

  if (!excerpt) {
    const paragraphs = content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
    excerpt = paragraphs[0] ?? "";
  }

  const trimmed = excerpt.trim();
  if (trimmed.length <= 280) {
    return trimmed;
  }
  return `${trimmed.slice(0, 277).trimEnd()}...`;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

function coerceDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : undefined))
      .filter((item): item is string => Boolean(item && item.length > 0));
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

function extractNumber(content: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const numeric = match[1] ?? match[0];
      const parsed = coerceNumber(numeric);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }
  return undefined;
}

function normalizePlatform(value: unknown): EpisodePlatform | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase().trim();
  if (normalized === "banterpacks") {
    return "banterpacks";
  }
  if (normalized === "chimera" || normalized === "banterhearts") {
    return "chimera";
  }
  if (normalized === "benchmark" || normalized === "benchmarks") {
    return "benchmark";
  }
  if (normalized) {
    return normalized as EpisodePlatform;
  }
  return undefined;
}

function cleanHeading(heading: string): string {
  return heading.replace(/^["*]+/, "").replace(/["*]+$/, "").trim();
}

export async function getEpisode(slug: string): Promise<Episode | null> {
  const episodes = await getAllEpisodes();
  return episodes.find((episode) => episode.slug === slug) ?? null;
}

export function getEpisodeStats(episodes: Episode[]) {
  const totalEpisodes = episodes.length;
  const totalFilesChanged = episodes.reduce((sum, ep) => sum + ep.filesChanged, 0);
  const totalLinesAdded = episodes.reduce((sum, ep) => sum + ep.linesAdded, 0);
  const totalComplexity = episodes.reduce((sum, ep) => sum + ep.complexity, 0);
  const totalReadingTime = episodes.reduce((sum, ep) => sum + ep.readingTime, 0);
  const avgComplexity = totalEpisodes === 0 ? 0 : Math.round(totalComplexity / totalEpisodes);

  return {
    totalEpisodes,
    totalFilesChanged,
    totalLinesAdded,
    avgComplexity,
    totalReadingTime,
  };
}


