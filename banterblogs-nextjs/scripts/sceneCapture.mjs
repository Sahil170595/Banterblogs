// What the poster render (render-scene-poster.mjs) and the loop render
// (render-scene-video.mjs) share: the GPU browser, the page hook that reads
// the scene's own drawing buffer with the star labels blanked, and the
// viewport each landing art variant is rendered at.
import { chromium } from '@playwright/test';
import sharp from 'sharp';

// Art direction by viewport aspect, narrowest first; the last has no media
// query. Each variant's aspect is at least the widest viewport it serves:
// the scene frames by height (fixed vertical FOV), so a wider image laid
// out by height and centred is exactly the canvas's frame. `viewport` is
// the CSS size the scene is rendered at, in the variant's aspect.
export const SCENE_VARIANTS = [
  // phones in portrait, 360x800 through 430x690 CSS
  { name: 'phone', media: '(max-aspect-ratio: 5/8)', aspect: 5 / 8, viewport: { width: 720, height: 1152 } },
  // portrait tablets and narrow windows
  { name: 'tablet', media: '(max-aspect-ratio: 4/5)', aspect: 4 / 5, viewport: { width: 1120, height: 1400 } },
  // everything wider, up to 3440x1440 ultrawide
  { name: 'landscape', media: null, aspect: 12 / 5, viewport: { width: 2400, height: 1000 } },
];

// StarSystems draws each label on a 2D canvas this tall; nothing else on the page does
export const LABEL_TEXTURE_HEIGHT = 64;
export const EXPECTED_LABELS = 9;
export const CAPTURE_TIMEOUT_MS = 30_000;
export const SCENE_BACKGROUND = '#04060a';
const OPAQUE = 255;
const CHROME_ARGS = ['--enable-gpu', '--ignore-gpu-blocklist'];
const ANGLE_BACKEND = { win32: 'd3d11', darwin: 'metal' }[process.platform];

export function launchGpuBrowser() {
  return chromium.launch({
    channel: 'chrome',
    args: ANGLE_BACKEND ? [`--use-angle=${ANGLE_BACKEND}`, ...CHROME_ARGS] : CHROME_ARGS,
  });
}

// Runs in the page before any of its scripts. The scene holds its opening
// frame (scene time 0, camera at rest) until the crossfade starts, so the
// last frame drawn before the scene layer leaves 'loading' is that frame:
// it is read from the canvas's own drawing buffer at that moment. Only
// WebGL output is in the buffer, so no page text can be; the scene's own
// star labels are blanked at the source (their 2D canvases draw nothing).
// `onOpening`, a global function name, is called in the same task, before
// the scene draws its next frame.
export function captureHook({ labelHeight, onOpening }) {
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
    if (onOpening) {
      try {
        window[onOpening](canvas);
      } catch (error) {
        state.error = `${onOpening} failed: ${error instanceof Error ? error.stack : String(error)}`;
      }
    }
  };
  new MutationObserver(() => {
    if (state.capture || state.error) return;
    const stage = document.querySelector('[data-scene-stage]')?.getAttribute('data-scene-stage');
    // the last frame drawn before the scene wakes is the held opening frame
    if (stage && stage !== 'loading') grab(stage);
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-scene-stage'] });
}

/**
 * Opens the landing at the variant's viewport with `initScripts` (each a
 * [function, argument] pair) installed before the page's own scripts, and
 * waits for the opening frame's capture. Returns the open page and context
 * (the caller closes the context), the capture and the WebGL renderer.
 */
export async function openScene(browser, base, variant, { initScripts = [], onOpening } = {}) {
  const context = await browser.newContext({ viewport: variant.viewport, deviceScaleFactor: 1 });
  try {
    for (const [script, arg] of initScripts) await context.addInitScript(script, arg);
    await context.addInitScript(captureHook, { labelHeight: LABEL_TEXTURE_HEIGHT, onOpening: onOpening ?? null });
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
    return { context, page, capture, renderer: gpu.renderer };
  } catch (error) {
    await context.close();
    throw error;
  }
}

/** Throws unless the capture is the whole viewport, labels blanked, at least `minHeight` tall. */
export function checkCapture(variant, capture, minHeight) {
  const { css, viewport, buffer, labels } = capture;
  if (css.width !== viewport.width || css.height !== viewport.height) {
    throw new Error(`${variant.name}: canvas is ${css.width}x${css.height}, not the ${viewport.width}x${viewport.height} viewport`);
  }
  if (labels !== EXPECTED_LABELS) {
    throw new Error(`${variant.name}: blanked ${labels} star labels, expected ${EXPECTED_LABELS}; text could reach the art`);
  }
  if (buffer.height < minHeight) {
    throw new Error(`${variant.name}: drawing buffer is ${buffer.height}px tall, below the ${minHeight}px output; re-run`);
  }
}

/** The canvas's PNG data URL as an opaque PNG on the scene's background. */
export async function flattenFrame(dataUrl, label) {
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  const { channels } = await sharp(png).metadata();
  const stats = await sharp(png).stats();
  const alphaMin = channels === 4 ? stats.channels[3].min : OPAQUE;
  if (alphaMin < OPAQUE) console.warn(`[${label}] canvas alpha drops to ${alphaMin}; flattening onto the scene background`);
  return sharp(png).flatten({ background: SCENE_BACKGROUND }).removeAlpha().png().toBuffer();
}
