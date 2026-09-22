import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../../../next.config';
import { sceneFingerprint } from '../../../../scripts/sceneFingerprint.mjs';
import manifest from '../sceneVideo.manifest.json';

// The touch devices' loop is rendered from the live scene on a real GPU
// (scripts/render-scene-video.mjs), frame 0 being the poster's frame. This
// pins the contract between the rendered files, the manifest the player
// reads and the scene.

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
// the phone's loop loads after the page, but on a phone's data plan
const PHONE_MAX_BYTES = 400 * 1024;
// any other variant: a ceiling that catches an encoder setting gone wrong
const VIDEO_MAX_BYTES = 640 * 1024;
const CONTENT_HASH_CHARS = 8;
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
// GargantuaHalo's photon ring breathes as sin(uTime * 1.1); the loop is one breath
const RING_PULSE_RAD_PER_S = 1.1;
const LOOP_SECONDS_TOLERANCE_DIGITS = 1;

type VideoFile = { src: string; type: string; bytes: number };
const variants = manifest.variants as Array<{ name: string; width: number; height: number; sources: VideoFile[] }>;
const allFiles = variants.flatMap((variant) => variant.sources.map((source) => ({ variant, source })));
const read = (file: VideoFile) => fs.readFileSync(path.join(PUBLIC_DIR, file.src));

// ISO BMFF: the offset of the first top-level box of `type`, or -1
function topLevelBox(file: Buffer, type: string): number {
  for (let offset = 0; offset + 8 <= file.length; ) {
    const size = file.readUInt32BE(offset);
    if (file.toString('ascii', offset + 4, offset + 8) === type) return offset;
    if (size < 8) return -1;
    offset += size;
  }
  return -1;
}

// the track header's display size (16.16 fixed point, its last 8 bytes)
function mp4Size(file: Buffer): { width: number; height: number } {
  const tkhd = file.indexOf('tkhd', 0, 'ascii');
  const size = file.readUInt32BE(tkhd - 4);
  const end = tkhd - 4 + size;
  return { width: file.readUInt32BE(end - 8) >>> 16, height: file.readUInt32BE(end - 4) >>> 16 };
}

// the handler type of every hdlr box in moov ('vide', 'soun', 'mdir', ...)
function mp4Handlers(file: Buffer): string[] {
  const moov = topLevelBox(file, 'moov');
  const end = moov + file.readUInt32BE(moov);
  const handlers: string[] = [];
  for (let at = file.indexOf('hdlr', moov, 'ascii'); at >= 0 && at < end; at = file.indexOf('hdlr', at + 1, 'ascii')) {
    // after the type: version and flags, pre_defined, then handler_type
    handlers.push(file.toString('ascii', at + 12, at + 16));
  }
  return handlers;
}

describe('scene video files', () => {
  it.each(allFiles.map(({ variant, source }) => [source.src, variant, source] as const))(
    '%s is the file the manifest describes, cacheable for good',
    (_src, variant, source) => {
      const bytes = read(source);
      expect(bytes.length).toBe(source.bytes);
      expect(bytes.length).toBeLessThanOrEqual(variant.name === 'phone' ? PHONE_MAX_BYTES : VIDEO_MAX_BYTES);
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, CONTENT_HASH_CHARS);
      expect(source.src).toContain(`.${hash}.`);
      expect(source.src.startsWith('/landing/video/')).toBe(true);
    },
  );

  it('offers each variant as AV1 WebM, then H.264 MP4 for Safari', () => {
    for (const variant of variants) {
      expect(variant.sources.map((source) => source.type.split(';')[0])).toEqual(['video/webm', 'video/mp4']);
      const [webm, mp4] = variant.sources;
      expect(webm.type).toMatch(/codecs="av01\.0\.\d{2}M\.(08|10)"/);
      expect(mp4.type).toMatch(/codecs="avc1\.[0-9a-f]{6}"/);
      expect(read(webm).readUInt32BE(0)).toBe(0x1a45dfa3);
      expect(read(mp4).toString('ascii', 4, 8)).toBe('ftyp');
    }
  });

  it('starts the MP4 without waiting for its end, at the size the manifest gives', () => {
    for (const variant of variants) {
      const mp4 = read(variant.sources[1]);
      // +faststart: the index comes before the media data
      expect(topLevelBox(mp4, 'moov')).toBeGreaterThan(0);
      expect(topLevelBox(mp4, 'moov')).toBeLessThan(topLevelBox(mp4, 'mdat'));
      expect(mp4Size(mp4)).toEqual({ width: variant.width, height: variant.height });
    }
  });

  it('carries no audio', () => {
    for (const { source } of allFiles) {
      const file = read(source);
      if (source.type.startsWith('video/mp4')) {
        expect(mp4Handlers(file)).toContain('vide');
        expect(mp4Handlers(file)).not.toContain('soun');
      } else for (const codec of ['A_OPUS', 'A_VORBIS', 'A_AAC']) expect(file.includes(codec, 0, 'ascii')).toBe(false);
    }
  });

  it('loops over one breath of the photon ring, so the brightest stroke wraps', () => {
    expect(manifest.frames / manifest.fps).toBeCloseTo((2 * Math.PI) / RING_PULSE_RAD_PER_S, LOOP_SECONDS_TOLERANCE_DIGITS);
    expect(manifest.crossfadeFrames).toBeLessThan(manifest.frames);
  });

  it('caches the video files for good', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const rule = rules.find((candidate) => candidate.source.startsWith('/landing/video/'));
    expect(rule?.headers).toContainEqual({ key: 'Cache-Control', value: IMMUTABLE_CACHE });
  });

  it('was rendered from the scene as it is now', () => {
    expect(
      sceneFingerprint(ROOT),
      'The scene changed since its loop was rendered, so the loop would not start on the poster frame. ' +
        'Re-render it: npm run build, npx next start, then npm run video:render (needs a GPU and ffmpeg; see the script).',
    ).toBe(manifest.fingerprint);
  });
});
