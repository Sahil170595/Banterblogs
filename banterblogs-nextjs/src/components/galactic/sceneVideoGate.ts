import posterManifest from './scenePoster.manifest.json';
import videoManifest from './sceneVideo.manifest.json';

// Touch devices never run the WebGL scene. Once the landing has loaded and
// gone idle they get a short loop of it (scripts/render-scene-video.mjs)
// over the poster, whose first frame is the poster's own frame; this is
// who gets it, and which one.

export type SceneVideoSource = { src: string; type: string; bytes: number };
export type SceneVideoVariant = {
  name: string;
  media: string | null;
  aspect: number;
  width: number;
  height: number;
  /** best first; the player may promote one the device decodes in hardware */
  sources: SceneVideoSource[];
};

export const SCENE_VIDEO_VARIANTS = videoManifest.variants as SceneVideoVariant[];
export const SCENE_VIDEO_TIMING = { fps: videoManifest.fps, frames: videoManifest.frames };

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

/**
 * The loop for the poster variant this viewport shows (the first whose
 * query matches, as <picture> picks), or null when that poster has none.
 */
export function videoVariantFor(matches: (media: string) => boolean): SceneVideoVariant | null {
  const poster = posterManifest.variants.find((variant) => variant.media === null || matches(variant.media));
  return SCENE_VIDEO_VARIANTS.find((variant) => variant.name === poster?.name) ?? null;
}
