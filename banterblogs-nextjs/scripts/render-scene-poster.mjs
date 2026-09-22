// Renders the landing poster from the live scene, on the real GPU, and
// writes the art-directed AVIF/WebP files plus the manifest ScenePoster
// serves them from.
//
// The poster is the scene's held opening frame (scene time 0, camera at
// rest), read from the canvas's own drawing buffer the moment the scene
// layer leaves 'loading' (sceneCapture.mjs).
//
// usage (from banterblogs-nextjs/, with a production build running):
//   npm run build && npx next start -p 3000
//   npm run poster:render -- [--base http://127.0.0.1:3000] [--keep <dir>]
// --keep writes each variant's full-resolution master PNG to <dir>. Needs a
// GPU: the scene refuses software WebGL, as it does for visitors.
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SCENE_VARIANTS, checkCapture, flattenFrame, launchGpuBrowser, openScene } from './sceneCapture.mjs';
import { sceneFingerprint } from './sceneFingerprint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTER_URL_DIR = '/landing/poster';
const POSTER_DIR = path.join(ROOT, 'public', ...POSTER_URL_DIR.split('/').filter(Boolean));
const MANIFEST = path.join(ROOT, 'src', 'components', 'galactic', 'scenePoster.manifest.json');

// Each variant's master is its drawing buffer at its viewport
// (sceneCapture.mjs); every poster height is a downscale of it.
const POSTER_HEIGHTS = { phone: [1152, 1728], tablet: [1280, 2048], landscape: [720, 1080, 1440] };
const VARIANTS = SCENE_VARIANTS.map((variant) => ({ ...variant, heights: POSTER_HEIGHTS[variant.name] }));

// Encoding, tuned on the rendered frames: at AVIF q50 the disk's falloff
// blotches once its levels are stretched 4x, at q60 it stays smooth; full
// chroma keeps the thin orbit lines. Every file stays well inside the LCP
// budget (scenePoster.test.tsx). WebP is only the fallback for browsers
// without AVIF.
const AVIF = { quality: 60, effort: 9, chromaSubsampling: '4:4:4' };
const WEBP = { quality: 75, effort: 6, smartSubsample: true };
const CONTENT_HASH_CHARS = 8;

function parseArgs(argv) {
  const args = { base: 'http://127.0.0.1:3000', keep: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--keep') args.keep = path.resolve(argv[++i]);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return args;
}

async function encode(variant, master) {
  const files = { avif: [], webp: [] };
  for (const height of variant.heights) {
    const width = Math.round(height * variant.aspect);
    const frame = sharp(master).resize(width, height, { fit: 'fill', kernel: 'lanczos3' });
    for (const [format, options] of [['avif', AVIF], ['webp', WEBP]]) {
      const bytes = await frame.clone()[format](options).toBuffer();
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, CONTENT_HASH_CHARS);
      const name = `${variant.name}-${width}w.${hash}.${format}`;
      writeFileSync(path.join(POSTER_DIR, name), bytes);
      files[format].push({ src: `${POSTER_URL_DIR}/${name}`, width, height, bytes: bytes.length });
    }
  }
  return files;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const browser = await launchGpuBrowser();
  const masters = [];
  const browserVersion = `Chrome ${browser.version()}`;
  let renderer = 'unknown';
  try {
    for (const variant of VARIANTS) {
      const scene = await openScene(browser, args.base, variant);
      await scene.context.close();
      renderer = scene.renderer;
      checkCapture(variant, scene.capture, Math.max(...variant.heights));
      const master = await flattenFrame(scene.capture.dataUrl, variant.name);
      const { width, height } = await sharp(master).metadata();
      if (args.keep) {
        mkdirSync(args.keep, { recursive: true });
        writeFileSync(path.join(args.keep, `${variant.name}-master-${width}x${height}.png`), master);
      }
      console.log(`[${variant.name}] ${width}x${height} buffer at stage '${scene.capture.stage}', ${scene.capture.labels} labels blanked`);
      masters.push({ variant, master });
    }
  } finally {
    await browser.close();
  }

  rmSync(POSTER_DIR, { recursive: true, force: true });
  mkdirSync(POSTER_DIR, { recursive: true });
  const variants = [];
  for (const { variant, master } of masters) {
    const files = await encode(variant, master);
    variants.push({ name: variant.name, media: variant.media, aspect: variant.aspect, ...files });
    for (const file of [...files.avif, ...files.webp]) console.log(`  ${file.src}  ${file.bytes} bytes`);
  }
  const manifest = {
    fingerprint: sceneFingerprint(ROOT),
    renderer,
    browser: browserVersion,
    variants,
  };
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, MANIFEST)} (${readdirSync(POSTER_DIR).length} files in ${POSTER_URL_DIR})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
