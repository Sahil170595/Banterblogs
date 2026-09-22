import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../../../next.config';
import { sceneFingerprint } from '../../../../scripts/sceneFingerprint.mjs';
import { ScenePoster } from '../ScenePoster';
import manifest from '../scenePoster.manifest.json';

// The landing's poster is a still of the live scene's opening frame
// (scripts/render-scene-poster.mjs renders it on a real GPU), so the
// crossfade into the canvas shows one picture, and touch devices, which
// never run the scene, get the real black hole. This pins the contract
// between the rendered files, the markup that serves them and the scene.

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
// each poster is the LCP image on its device class
const POSTER_MAX_BYTES = 80 * 1024;
// the widest common desktop display (3440x1440 ultrawide); wider windows
// still frame correctly, with the scene's background at the sides
const ULTRAWIDE_ASPECT = 3440 / 1440;
// content hash prefix in each file name, so the files can be cached forever
const CONTENT_HASH_CHARS = 8;
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

type PosterFile = { src: string; width: number; height: number; bytes: number };
type PosterVariant = {
  name: string;
  media: string | null;
  aspect: number;
  avif: PosterFile[];
  webp: PosterFile[];
};
const variants = manifest.variants as PosterVariant[];
const allFiles = variants.flatMap((variant) => [...variant.avif, ...variant.webp]);

function imageSize(file: Buffer): { width: number; height: number; format: 'avif' | 'webp' } {
  if (file.toString('ascii', 4, 12) === 'ftypavif') {
    // ispe box: size, 'ispe', version/flags, width, height
    const ispe = file.indexOf('ispe', 0, 'ascii');
    if (ispe < 0) throw new Error('AVIF without an ispe box');
    return { width: file.readUInt32BE(ispe + 8), height: file.readUInt32BE(ispe + 12), format: 'avif' };
  }
  if (file.toString('ascii', 0, 4) === 'RIFF' && file.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = file.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff, format: 'webp' };
    if (chunk === 'VP8X') return { width: file.readUIntLE(24, 3) + 1, height: file.readUIntLE(27, 3) + 1, format: 'webp' };
    if (chunk === 'VP8L') {
      const bits = file.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: 'webp' };
    }
  }
  throw new Error('not an AVIF or WebP file');
}

function maxAspect(media: string): number {
  const match = /\(max-aspect-ratio:\s*(\d+)\s*\/\s*(\d+)\)/.exec(media);
  if (!match) throw new Error(`no max-aspect-ratio in ${media}`);
  return Number(match[1]) / Number(match[2]);
}

const srcSet = (files: PosterFile[]) => files.map((file) => `${file.src} ${file.width}w`).join(', ');

describe('scene poster files', () => {
  it.each(allFiles.map((file) => [file.src, file] as const))('%s is a real image within the LCP budget', (_src, file) => {
    const bytes = fs.readFileSync(path.join(PUBLIC_DIR, file.src));
    expect(bytes.length).toBe(file.bytes);
    expect(bytes.length).toBeLessThanOrEqual(POSTER_MAX_BYTES);
    const size = imageSize(bytes);
    expect(`${size.width}x${size.height}`).toBe(`${file.width}x${file.height}`);
    expect(file.src.endsWith(`.${size.format}`)).toBe(true);
    // a changed image gets a new URL, so the files can be cached for good
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, CONTENT_HASH_CHARS);
    expect(file.src).toContain(`.${hash}.`);
  });

  it('serves every variant in AVIF with a WebP fallback of the same sizes', () => {
    for (const variant of variants) {
      expect(variant.avif.length).toBeGreaterThan(0);
      expect(variant.webp.map(({ width, height }) => [width, height])).toEqual(
        variant.avif.map(({ width, height }) => [width, height]),
      );
      for (const file of [...variant.avif, ...variant.webp]) {
        expect(file.width).toBe(Math.round(file.height * variant.aspect));
      }
    }
  });

  it('caches the poster files for good', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const rule = rules.find((candidate) => candidate.source.startsWith('/landing/poster/'));
    expect(rule?.headers).toContainEqual({ key: 'Cache-Control', value: IMMUTABLE_CACHE });
    for (const file of allFiles) expect(file.src.startsWith('/landing/poster/')).toBe(true);
  });

  it('was rendered from the scene as it is now', () => {
    const current = sceneFingerprint(ROOT);
    expect(
      current,
      'The scene changed since its poster was rendered, so the crossfade would show two pictures again. ' +
        'Re-render it: npm run build, npx next start, then npm run poster:render (needs a GPU; see the script).',
    ).toBe(manifest.fingerprint);
  });
});

describe('scene poster framing', () => {
  // The scene's camera has a fixed vertical field of view and looks at the
  // black hole, so at any viewport the frame is the centre crop, one
  // viewport-height tall, of a wider frame. A poster laid out by height and
  // centred therefore lines up with the canvas at every aspect it covers.
  it('art-directs from the narrowest image up, each at least as wide as its viewports', () => {
    const bounded = variants.slice(0, -1);
    let previous = 0;
    for (const variant of bounded) {
      const widest = maxAspect(variant.media!);
      expect(widest).toBeGreaterThan(previous);
      expect(variant.aspect).toBeGreaterThanOrEqual(widest);
      previous = widest;
    }
    const fallback = variants.at(-1)!;
    expect(fallback.media).toBeNull();
    expect(fallback.aspect).toBeGreaterThanOrEqual(ULTRAWIDE_ASPECT);
  });

  it('lays the image out by height, centred, whatever the viewport', () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<ScenePoster />), 'text/html');
    const classes = doc.querySelector('img')?.className.split(/\s+/) ?? [];
    for (const name of ['absolute', 'top-0', 'h-full', 'w-auto', 'max-w-none', 'left-1/2', '-translate-x-1/2']) {
      expect(classes).toContain(name);
    }
  });
});

describe('scene poster markup', () => {
  const doc = new DOMParser().parseFromString(renderToStaticMarkup(<ScenePoster />), 'text/html');
  const wrapper = doc.querySelector('[data-scene-poster]');
  const sources = [...doc.querySelectorAll('picture > source')];
  const img = doc.querySelector('picture > img');

  it('is decorative', () => {
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('offers each device one image, AVIF first, chosen by viewport aspect and height', () => {
    const expected = variants.flatMap((variant, index) => {
      const last = index === variants.length - 1;
      const formats = last ? (['avif'] as const) : (['avif', 'webp'] as const);
      return formats.map((format) => ({
        media: variant.media,
        type: `image/${format}`,
        srcset: srcSet(variant[format]),
        // the image is as wide as aspect x viewport height
        sizes: `${Number((variant.aspect * 100).toFixed(2))}vh`,
      }));
    });
    expect(
      sources.map((source) => ({
        media: source.getAttribute('media'),
        type: source.getAttribute('type'),
        srcset: source.getAttribute('srcset'),
        sizes: source.getAttribute('sizes'),
      })),
    ).toEqual(expected);

    const fallback = variants.at(-1)!;
    expect(img?.getAttribute('srcset')).toBe(srcSet(fallback.webp));
    expect(fallback.webp.map((file) => file.src)).toContain(img?.getAttribute('src'));
    expect(img?.getAttribute('sizes')).toBe(`${Number((fallback.aspect * 100).toFixed(2))}vh`);
  });

  it('is fetched first and at once, as the largest paint', () => {
    expect(img?.getAttribute('fetchpriority')).toBe('high');
    expect(img?.getAttribute('loading')).not.toBe('lazy');
  });

  it('never holds the first paint for its decode', () => {
    // a synchronous decode of the AVIF held the first paint (FCP, and the
    // hero heading's LCP) back by 24-40 ms, measured
    expect(img?.getAttribute('decoding')).toBe('async');
  });

  it('reserves its box before the file arrives', () => {
    for (const element of [...sources, img!]) {
      const width = Number(element.getAttribute('width'));
      const height = Number(element.getAttribute('height'));
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }
  });
});
