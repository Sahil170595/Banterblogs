import posterManifest from './scenePoster.manifest.json';

// Touch devices never run the WebGL scene. Once the landing has loaded and
// gone idle they get a short loop of it (scripts/render-scene-video.mjs)
// over the poster, whose first frame is the poster's own frame; this is who
// gets it, and which framing. The loop's own manifest stays in the player's
// chunk, so nothing about it is fetched before the page has loaded.

/** The poster's art-direction queries, narrowest first; the loop follows them. */
export const ART_DIRECTION_QUERIES = posterManifest.variants.flatMap((variant) => (variant.media ? [variant.media] : []));

// effective connection types too slow to spend the loop's bytes on
const SLOW_CONNECTIONS: ReadonlySet<string> = new Set(['slow-2g', '2g']);

export interface VideoSignals {
  reducedMotion: boolean;
  coarsePointer: boolean;
  saveData?: boolean;
  effectiveType?: string;
  hidden: boolean;
}

/**
 * Touch devices only: a fine-pointer visit on the poster has no GPU, or a
 * weak one, and would decode and composite a full-window loop on the CPU.
 */
export function allowsVideo(signals: VideoSignals): boolean {
  return (
    signals.coarsePointer &&
    !signals.reducedMotion &&
    signals.saveData !== true &&
    !SLOW_CONNECTIONS.has(signals.effectiveType ?? '') &&
    !signals.hidden
  );
}

/** The poster variant this viewport shows — the first whose query matches, as <picture> picks. */
export function posterVariantFor(matches: (media: string) => boolean): string {
  const variant = posterManifest.variants.find((candidate) => candidate.media === null || matches(candidate.media));
  // the last variant has no query; the poster's own test pins that
  return variant?.name ?? '';
}
