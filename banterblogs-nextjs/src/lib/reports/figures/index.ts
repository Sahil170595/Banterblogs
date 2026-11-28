import fs from 'fs';
import path from 'path';
import { extractHeadings } from '@/lib/episodes';
import { findReportFolder } from '../locator';
import { FigureSpecError, plainText, resolveFigure } from './resolve';
import { FIGURE_SPECS } from './specs';
import type { FigureSpec, ResolvedFigure } from './types';

// The server side of the figure pipeline: reads a report's markdown off disk
// and resolves its spec. A spec that no longer matches its report throws, so
// the build stops instead of shipping a stale or empty chart.

export type { FigureSpec, ResolvedFigure } from './types';
/** What an archive card draws: the figure without its caption sentence, anchor or a reader's choices. */
export type FigureThumbnail = Omit<ResolvedFigure, 'claim' | 'anchor' | 'explore'>;

const SPEC_BY_SLUG = new Map<string, FigureSpec>(FIGURE_SPECS.map((spec) => [spec.slug, spec]));
const resolved = new Map<string, ResolvedFigure>();

/** A report's markdown: the file, or a report folder's documents in name order. */
export function readReportMarkdown(slug: string): string | null {
  const location = findReportFolder(slug);
  if (!location) return null;
  if (location.kind === 'file') return fs.readFileSync(location.path, 'utf8');
  return fs
    .readdirSync(location.path)
    .filter((name) => /\.md$/i.test(name))
    .sort()
    .map((name) => fs.readFileSync(path.join(/*turbopackIgnore: true*/ location.path, name), 'utf8'))
    .join('\n\n');
}

// the heading's id on the report page, when exactly one heading carries that text
function anchorOf(title: string, markdown: string): string | undefined {
  const matches = extractHeadings(markdown).filter((heading) => plainText(heading.text) === title);
  return matches.length === 1 ? matches[0].id : undefined;
}

export function resolveSpec(spec: FigureSpec): ResolvedFigure {
  const markdown = readReportMarkdown(spec.slug);
  if (markdown === null) throw new FigureSpecError(spec.slug, 'no report with this slug');
  const figure = resolveFigure(spec, markdown);
  const anchor = anchorOf(figure.title, markdown);
  return anchor ? { ...figure, anchor } : figure;
}

/** The report's figure, or null where it has no spec and keeps the seeded visual. */
export function reportFigure(slug: string): ResolvedFigure | null {
  const spec = SPEC_BY_SLUG.get(slug);
  if (!spec) return null;
  let figure = resolved.get(slug);
  if (!figure) {
    figure = resolveSpec(spec);
    resolved.set(slug, figure);
  }
  return figure;
}

export function toThumbnail(figure: ResolvedFigure): FigureThumbnail {
  const thumbnail: Partial<ResolvedFigure> = { ...figure };
  delete thumbnail.claim;
  delete thumbnail.anchor;
  delete thumbnail.explore;
  return thumbnail as FigureThumbnail;
}

/** Every report figure as a card thumbnail, by slug: the archive hands these to its cards. */
export function reportFigureThumbnails(): Record<string, FigureThumbnail> {
  return Object.fromEntries(FIGURE_SPECS.map((spec) => [spec.slug, toThumbnail(reportFigure(spec.slug)!)]));
}
