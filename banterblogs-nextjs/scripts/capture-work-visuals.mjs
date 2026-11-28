// Captures the thumbnails /work shows on its links to this site's own live
// demos (lib/work.ts): each is the demo itself as the page renders it, read
// from a local production build, never a mock-up.
//
// Each capture is the top 16:9 of the page's demo (`.project-demo`, under its
// "Try it" heading) at a fixed desktop viewport, dark, with reduced motion,
// once two consecutive frames are identical. It is written as one AVIF under
// public/work/.
//
// usage (from banterblogs-nextjs/, with a production build running):
//   npx next build && npx next start -H 127.0.0.1 -p 3305
//   node scripts/capture-work-visuals.mjs [--base http://127.0.0.1:3305]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VISUAL_URL_DIR = '/work';
const VISUAL_DIR = path.join(ROOT, 'public', ...VISUAL_URL_DIR.split('/').filter(Boolean));

/** the pages captured, and the file each becomes; lib/work.ts points at these (workVisuals.test.tsx holds the two together) */
export const CAPTURES = [
  { route: '/projects/reinforcement-learning/customer-service', file: 'customer-service-demo.avif' },
  { route: '/projects/reinforcement-learning/code-verification', file: 'code-verification-demo.avif' },
  { route: '/projects/reinforcement-learning/flight-routing', file: 'flight-routing-demo.avif' },
  { route: '/projects/reinforcement-learning/offline-policy-evaluation', file: 'offline-policy-evaluation-demo.avif' },
].map((capture) => ({ ...capture, src: `${VISUAL_URL_DIR}/${capture.file}` }));

// a desktop viewport: wide enough for every demo's full layout, and tall
// enough that the 16:9 frame sits clear of the site header
const VIEWPORT = { width: 1280, height: 900 };
/** the stored size: 16:9, three times the 160px a thumbnail is drawn at */
export const OUTPUT = { width: 480, height: 270 };
/** each file's ceiling; a thumbnail under the fold should cost less than the page's own HTML */
export const MAX_BYTES = 60_000;
// tuned on the captures: UI text stays legible at q55 with full chroma
const AVIF = { quality: 55, effort: 9, chromaSubsampling: '4:4:4' };
const DEMO_SELECTOR = '.project-demo';
const NAVIGATION_TIMEOUT_MS = 30_000;
const HTTP_ERROR = 400;
// the analytics scripts exist only on Vercel; a local server answers them 404
const VERCEL_ONLY = '/_vercel/';
// settled = two consecutive frames identical, checked this often, this many times
const SETTLE_INTERVAL_MS = 250;
const SETTLE_ATTEMPTS = 20;
// a frame whose channels barely vary is an empty plate, not a demo
const MIN_CHANNEL_STDEV = 4;

function parseArgs(argv) {
  const args = { base: 'http://127.0.0.1:3305' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return args;
}

// runs in the page: where the demo under the block's "Try it" heading sits in the viewport
function demoBox(selector) {
  const demo = document.querySelector(selector);
  if (!demo) return null;
  const first = [...demo.children].find((child) => !/^H\d$/.test(child.tagName)) ?? demo;
  const rect = first.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, viewportHeight: innerHeight };
}

/** Scrolls the demo's top 16:9 to the middle of the viewport, clear of the site header, and returns it as a clip. */
async function demoClip(page, route) {
  const before = await page.evaluate(demoBox, DEMO_SELECTOR);
  if (!before || before.width === 0) throw new Error(`${route}: no ${DEMO_SELECTOR} block to capture`);
  const width = Math.floor(before.width);
  const height = Math.round((width * OUTPUT.height) / OUTPUT.width);
  await page.evaluate((top) => window.scrollBy({ top, behavior: 'instant' }), before.y - (before.viewportHeight - height) / 2);
  const box = await page.evaluate(demoBox, DEMO_SELECTOR);
  const clip = { x: Math.round(box.x), y: Math.round(box.y), width, height };
  if (clip.y < 0 || clip.y + clip.height > box.viewportHeight) {
    throw new Error(`${route}: the ${width}x${height} demo frame does not fit the ${VIEWPORT.width}x${VIEWPORT.height} viewport at y=${clip.y}`);
  }
  return clip;
}

/** Screenshots `clip` until two consecutive frames match, so nothing is caught mid-transition. */
async function settledFrame(page, clip, route) {
  let previous = null;
  for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt++) {
    const frame = await page.screenshot({ clip, type: 'png' });
    if (previous && frame.equals(previous)) return frame;
    previous = frame;
    await page.waitForTimeout(SETTLE_INTERVAL_MS);
  }
  throw new Error(`${route}: still changing after ${SETTLE_ATTEMPTS} frames ${SETTLE_INTERVAL_MS} ms apart; nothing written`);
}

async function capture(browser, base, { route, file, src }) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    page.on('console', (message) => {
      // a failed request is named below, with its URL
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) console.warn(`[page ${route}] ${message.text()}`);
    });
    page.on('response', (failed) => {
      const { pathname } = new URL(failed.url());
      if (failed.status() >= HTTP_ERROR && !pathname.startsWith(VERCEL_ONLY)) console.warn(`[page ${route}] ${failed.status()} ${failed.url()}`);
    });
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: NAVIGATION_TIMEOUT_MS });
    if (!response?.ok()) throw new Error(`${route} answered ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    const clip = await demoClip(page, route);
    const frame = await settledFrame(page, clip, route);
    const { channels } = await sharp(frame).stats();
    if (Math.max(...channels.map((channel) => channel.stdev)) < MIN_CHANNEL_STDEV) throw new Error(`${route}: the captured frame is blank`);
    const bytes = await sharp(frame).resize(OUTPUT.width, OUTPUT.height, { fit: 'cover', position: 'top', kernel: 'lanczos3' }).avif(AVIF).toBuffer();
    if (bytes.length > MAX_BYTES) throw new Error(`${src} is ${bytes.length} bytes, over the ${MAX_BYTES} ceiling; lower the AVIF quality`);
    writeFileSync(path.join(VISUAL_DIR, file), bytes);
    console.log(`${src}  ${OUTPUT.width}x${OUTPUT.height}  ${bytes.length} bytes  (from ${clip.width}x${clip.height} of ${route})`);
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // loaded here, so importing CAPTURES (the tests do) does not load a browser driver
  const { chromium } = await import('@playwright/test');
  mkdirSync(VISUAL_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const item of CAPTURES) await capture(browser, args.base, item);
  } finally {
    await browser.close();
  }
}

// run only as a script: the tests import the list above
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
