import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

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

const postsDirectory = path.join(process.cwd(), "posts");

const markdownProcessor = remark()
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeHighlight)
  .use(rehypeStringify);

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
          const id = parseInt(fileName.replace(/[^\d]/g, ""), 10);
          const fullPath = path.join(banterpacksDir, fileName);
          const fileContents = fs.readFileSync(fullPath, "utf8");

          return processEpisodeFile(fileContents, id, "banterpacks", id);
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
          const id = originalId + 1000;
          const fullPath = path.join(chimeraDir, fileName);
          const fileContents = fs.readFileSync(fullPath, "utf8");

          return processEpisodeFile(fileContents, id, "chimera", originalId);
        }),
    );
    episodes.push(...chimeraEpisodes);
  }

  return episodes.sort((a, b) => a.id - b.id);
});

async function processEpisodeFile(
  fileContents: string,
  id: number,
  platform: EpisodePlatform,
  originalId?: number,
): Promise<Episode> {
  const { content, data } = matter(fileContents);
  const metadata = resolveEpisodeMetadata(data ?? {}, content, id, platform, originalId);

  const processedMarkdown = await markdownProcessor.process(content);
  const htmlContent = processedMarkdown.toString();

  const preview = metadata.preview ?? extractPreview(content);
  const tags = buildTags(content, metadata.tags);

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const slug =
    metadata.slug ??
    (metadata.platform === "chimera"
      ? `chimera-episode-${metadata.displayId.toString().padStart(3, "0")}`
      : `episode-${metadata.displayId.toString().padStart(3, "0")}`);

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

  const isoDateMatch = content.match(/\b\d{4}-\d{2}-\d{2}T[^\s]+\b/);
  if (isoDateMatch) {
    const parsed = new Date(isoDateMatch[0]);
    if (!Number.isNaN(parsed.getTime())) {
      metadata.date = parsed.toISOString();
    }
  } else {
    const fallbackDate = content.match(/###\s+[^\n]*?(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)[^\n]*\b(\d{4})/i);
    if (fallbackDate) {
      const parsed = new Date(fallbackDate[0].replace(/^###\s+/, "").replace(/^dY["'-]\s*/, ""));
      if (!Number.isNaN(parsed.getTime())) {
        metadata.date = parsed.toISOString();
      }
    }
  }

  const commitMatch = content.match(/Commit:\s*`([0-9a-f]{7,40})`/i);
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
