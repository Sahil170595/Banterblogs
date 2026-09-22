// Renders the landing poster from the live scene, on the real GPU, and
// writes the art-directed AVIF/WebP files plus the manifest ScenePoster
// serves them from.
//
// The scene holds its opening frame (scene time 0, camera at rest) until the
// crossfade starts, so the poster is that frame: read from the canvas's own
// drawing buffer the moment the scene layer leaves 'loading'. Only WebGL
// output is in the buffer, so no page text can be; the scene's own star
// labels are blanked at the source (their 2D canvases draw nothing).
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
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { sceneFingerprint } from './sceneFingerprint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTER_URL_DIR = '/landing/poster';
const POSTER_DIR = path.join(ROOT, 'public', ...POSTER_URL_DIR.split('/').filter(Boolean));
const MANIFEST = path.join(ROOT, 'src', 'components', 'galactic', 'scenePoster.manifest.json');

// Art direction by viewport aspect, narrowest first; the last has no media
// query. Each variant's aspect is at least the widest viewport it serves:
// the scene frames by height (fixed vertical FOV), so a wider image laid
// out by height and centred is exactly the canvas's frame. The master is
// rendered at `viewport` (CSS px, the variant's aspect) and every height is
// a downscale of its drawing buffer.
const VARIANTS = [
  // phones in portrait, 360x800 through 430x690 CSS
  { name: 'phone', media: '(max-aspect-ratio: 5/8)', aspect: 5 / 8, heights: [1152, 1728], viewport: { width: 720, height: 1152 } },
  // portrait tablets and narrow windows
  { name: 'tablet', media: '(max-aspect-ratio: 4/5)', aspect: 4 / 5, heights: [1280, 2048], viewport: { width: 1120, height: 1400 } },
  // everything wider, up to 3440x1440 ultrawide
  { name: 'landscape', media: null, aspect: 12 / 5, heights: [720, 1080, 1440], viewport: { width: 2400, height: 1000 } },
];

// Encoding, tuned on the rendered frames: at AVIF q50 the disk's falloff
// blotches once its levels are stretched 4x, at q60 it stays smooth; full
// chroma keeps the thin orbit lines. Every file stays well inside the LCP
// budget (scenePoster.test.tsx). WebP is only the fallback for browsers
// without AVIF.
const AVIF = { quality: 60, effort: 9, chromaSubsampling: '4:4:4' };
const WEBP = { quality: 75, effort: 6, smartSubsample: true };
const CONTENT_HASH_CHARS = 8;

// StarSystems draws each label on a 2D canvas this tall; nothing else on the page does
const LABEL_TEXTURE_HEIGHT = 64;
const EXPECTED_LABELS = 9;
const CAPTURE_TIMEOUT_MS = 30_000;
const OPAQUE = 255;
const SCENE_BACKGROUND = '#04060a';
const CHROME_ARGS = ['--enable-gpu', '--ignore-gpu-blocklist'];
const ANGLE_BACKEND = { win32: 'd3d11', darwin: 'metal' }[process.platform];

function parseArgs(argv) {
  const args = { base: 'http://127.0.0.1:3000', keep: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--keep') args.keep = path.resolve(argv[++i]);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return args;
}

// Runs in the page before any of its scripts.
function captureHook({ labelHeight }) {
  const state = { blankedLabels: new Set(), capture: null, error: null };
  window.__scenePoster = state;

  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attributes) {
    if (/webgl/.test(type)) return getContext.call(this, type, { ...attributes, preserveDrawingBuffer: true });
    return getContext.call(this, type, attributes);
  };
  for (const method of ['fillText', 'fill']) {
    const draw = CanvasRenderingContext2D.prototype[method];
    CanvasRenderingContext2D.prototype[method] = function (...args) {
      if (this.canvas.height === labelHeight) {
        state.blankedLabels.add(this.canvas);
        return;
      }
      return draw.apply(this, args);
    };
  }

  const grab = (stage) => {
    const canvas = document.querySelector('[data-scene-stage] canvas');
    if (!canvas) {
      state.error = `scene layer reached ${stage} without a canvas`;
      return;
    }
    const box = canvas.getBoundingClientRect();
    state.capture = {
      stage,
      dataUrl: canvas.toDataURL('image/png'),
      buffer: { width: canvas.width, height: canvas.height },
      css: { width: box.width, height: box.height },
      viewport: { width: innerWidth, height: innerHeight },
      labels: state.blankedLabels.size,
    };
  };
  new MutationObserver(() => {
    if (state.capture || state.error) return;
    const stage = document.querySelector('[data-scene-stage]')?.getAttribute('data-scene-stage');
    // the last frame drawn before the scene wakes is the held opening frame
    if (stage && stage !== 'loading') grab(stage);
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-scene-stage'] });
}

async function renderMaster(browser, base, variant) {
  const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 1 });
  try {
    await context.addInitScript(captureHook, { labelHeight: LABEL_TEXTURE_HEIGHT });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') console.warn(`[page ${variant.name}] ${message.text()}`);
    });
    await page.goto(`${base}/`, { waitUntil: 'load' });
    const gpu = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return { ok: gl !== null, renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown' };
    });
    if (!gpu.ok) throw new Error('WebGL here runs on a software renderer, so the scene will not mount; render on a GPU');
    await page.waitForFunction(() => window.__scenePoster.capture || window.__scenePoster.error, null, {
      timeout: CAPTURE_TIMEOUT_MS,
    });
    const { capture, error } = await page.evaluate(() => ({
      capture: window.__scenePoster.capture,
      error: window.__scenePoster.error,
    }));
    if (error) throw new Error(`${variant.name}: ${error}`);
    return { capture, renderer: gpu.renderer };
  } finally {
    await context.close();
  }
}

function checkCapture(variant, capture) {
  const { css, viewport, buffer, labels } = capture;
  if (css.width !== viewport.width || css.height !== viewport.height) {
    throw new Error(`${variant.name}: canvas is ${css.width}x${css.height}, not the ${viewport.width}x${viewport.height} viewport`);
  }
  if (labels !== EXPECTED_LABELS) {
    throw new Error(`${variant.name}: blanked ${labels} star labels, expected ${EXPECTED_LABELS}; text could reach the poster`);
  }
  const tallest = Math.max(...variant.heights);
  if (buffer.height < tallest) {
    throw new Error(`${variant.name}: drawing buffer is ${buffer.height}px tall, below the ${tallest}px poster; re-run`);
  }
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
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ANGLE_BACKEND ? [`--use-angle=${ANGLE_BACKEND}`, ...CHROME_ARGS] : CHROME_ARGS,
  });
  const masters = [];
  const browserVersion = `Chrome ${browser.version()}`;
  let renderer = 'unknown';
  try {
    for (const variant of VARIANTS) {
      const result = await renderMaster(browser, args.base, variant);
      renderer = result.renderer;
      checkCapture(variant, result.capture);
      const png = Buffer.from(result.capture.dataUrl.split(',')[1], 'base64');
      const { channels, width, height } = await sharp(png).metadata();
      const stats = await sharp(png).stats();
      const alphaMin = channels === 4 ? stats.channels[3].min : OPAQUE;
      if (alphaMin < OPAQUE) console.warn(`[${variant.name}] canvas alpha drops to ${alphaMin}; flattening onto the scene background`);
      const master = await sharp(png).flatten({ background: SCENE_BACKGROUND }).removeAlpha().png().toBuffer();
      if (args.keep) {
        mkdirSync(args.keep, { recursive: true });
        writeFileSync(path.join(args.keep, `${variant.name}-master-${width}x${height}.png`), master);
      }
      console.log(`[${variant.name}] ${width}x${height} buffer at stage '${result.capture.stage}', ${result.capture.labels} labels blanked`);
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
