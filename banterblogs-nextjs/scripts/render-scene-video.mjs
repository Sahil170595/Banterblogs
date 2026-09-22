// Renders the landing's looping video from the live scene, on the real GPU,
// and writes the WebM/MP4 files plus the manifest SceneVideo plays them from.
//
// Frames are stepped, not recorded: at the poster's moment (the scene's held
// opening frame, sceneCapture.mjs) this takes the scene's render loop over
// through its R3F store, sets scene time for every frame itself and reads
// each frame from the canvas's drawing buffer, labels blanked as for the
// poster. So frame 0 is the poster frame, pixel for pixel (checked), and
// nothing about the machine's speed reaches the video.
//
// The loop:
//  - It lasts one period of the black hole's photon-ring pulse
//    (GargantuaHalo, sin(uTime * 1.1)), so the brightest stroke in the
//    frame wraps exactly.
//  - Nothing else in the scene has a period a short loop could meet: the
//    disk's streaks shear at a different rate at every radius and the
//    systems' Kepler periods run 18-55 s. The last CROSSFADE_FRAMES frames
//    therefore dissolve (in linear light) into the frames the scene draws
//    just before scene time 0, so the video's last frame runs into its
//    first as one step of scene time.
//  - The camera holds the pose the poster shows. Its drift (126 s and 190 s
//    periods) moves every pixel and would ghost the whole frame through the
//    dissolve; touch devices have no pointer parallax to lose.
//
// usage (from banterblogs-nextjs/, with a production build running):
//   npm run build && npx next start -p 3000
//   npm run video:render -- [--base http://127.0.0.1:3000] [--ffmpeg <path>] [--keep <dir>]
// --ffmpeg defaults to $FFMPEG, then `ffmpeg` on the PATH. --keep writes the
// stepped frames and the looped output frames (PNG) to <dir>. Needs a GPU.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SCENE_VARIANTS, checkCapture, flattenFrame, launchGpuBrowser, openScene } from './sceneCapture.mjs';
import { sceneFingerprint } from './sceneFingerprint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_URL_DIR = '/landing/video';
const VIDEO_DIR = path.join(ROOT, 'public', ...VIDEO_URL_DIR.split('/').filter(Boolean));
const MANIFEST = path.join(ROOT, 'src', 'components', 'galactic', 'sceneVideo.manifest.json');

const FPS = 30;
// GargantuaHalo's photon ring breathes as sin(uTime * 1.1)
const RING_PULSE_RAD_PER_S = 1.1;
const LOOP_FRAMES = Math.round((FPS * 2 * Math.PI) / RING_PULSE_RAD_PER_S);
// one second of dissolve: long enough that a moving star fades rather than jumps
const CROSSFADE_FRAMES = FPS;
// matches SceneClock's priority in GalacticScene.tsx; subscribed after it, so it runs after it
const SCENE_CLOCK_PRIORITY = -1;

// Output size per variant, at the variant's aspect (even, for 4:2:0
// chroma). Phones get the size of the poster they already show (1080w on
// 2x and 3x screens), so the stars stay as sharp through the handoff; at
// 720w they soften visibly. Tablets stay at that 1080 px width.
// No landscape loop: the 12:5 poster serves desktops without a GPU, where
// a 1728x720 loop kept 0.4-0.5 of a CPU core busy decoding and compositing
// in software (1440x900 and 1920x1080), for 7-9x the poster's bytes, and
// its wide frame holds most of the orbiting stars, which ghost through the
// dissolve. Landscape touch screens keep that poster too.
const VIDEO_SIZES = {
  phone: { width: 1080, height: 1728 },
  tablet: { width: 1080, height: 1350 },
};

const CONTENT_HASH_CHARS = 8;
const RGB_CHANNELS = 3;
const MAX_LEVEL = 255;
const SRGB_LINEAR_KNEE = 0.04045;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_GAMMA = 2.4;
const SRGB_OFFSET = 0.055;
const SRGB_ENCODED_KNEE = 0.0031308;

function parseArgs(argv) {
  const args = { base: 'http://127.0.0.1:3000', ffmpeg: process.env.FFMPEG || 'ffmpeg', keep: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--ffmpeg') args.ffmpeg = argv[++i];
    else if (argv[i] === '--keep') args.keep = path.resolve(argv[++i]);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return args;
}

// Runs in the page before any of its scripts. three.js announces every
// Scene it creates to __THREE_DEVTOOLS__; the R3F root scene carries its
// store (scene.__r3f.root), which is how the render loop is taken over.
function videoHook({ clockPriority }) {
  const scenes = [];
  const devtools = new EventTarget();
  devtools.addEventListener('observe', (event) => {
    if (event.detail && event.detail.isScene) scenes.push(event.detail);
  });
  window.__THREE_DEVTOOLS__ = devtools;
  const control = { ready: false };
  window.__sceneVideo = control;

  // called at the opening frame, in the task that drew it
  window.__sceneVideoTakeover = (canvas) => {
    const scene = scenes.find((candidate) => candidate.__r3f && candidate.__r3f.root);
    if (!scene) throw new Error('the R3F root scene never announced itself to __THREE_DEVTOOLS__');
    const store = scene.__r3f.root;
    const state = store.getState();
    // the page's own loop stops, and stays stopped whatever the page re-renders
    state.setFrameloop('never');
    const ignore = () => undefined;
    store.setState({ setFrameloop: ignore, setDpr: ignore });
    // the camera keeps the opening frame's pose
    const position = state.camera.position;
    for (const axis of ['x', 'y', 'z']) {
      const value = position[axis];
      Object.defineProperty(position, axis, { get: () => value, set: ignore, configurable: true });
    }
    let sceneTime = 0;
    state.internal.subscribe(
      {
        current: ({ clock }) => {
          clock.elapsedTime = sceneTime;
        },
      },
      clockPriority,
      store,
    );
    control.step = (time, delta) => {
      sceneTime = time;
      for (const { ref, store: owner } of store.getState().internal.subscribers) ref.current(owner.getState(), delta, undefined);
      return canvas.toDataURL('image/png');
    };
    control.buffer = () => ({ width: canvas.width, height: canvas.height });
    control.ready = true;
  };
}

// An open selection card silences the tracking tour, whose featured system
// would light its orbit line in the canvas; the card itself is page DOM.
async function silenceTour(page) {
  await page.evaluate(() => {
    const hero = document.querySelector('section.group\\/hero');
    const core = [...(hero?.querySelectorAll('a') ?? [])].find((link) => link.textContent?.includes('Gravitational core'));
    if (!core) throw new Error('no core link to open a selection with');
    core.click();
  });
  await page.waitForFunction(() => document.querySelector('[role="dialog"]') !== null && document.querySelector('[aria-current="step"]') === null);
}

const toLinear = new Float64Array(MAX_LEVEL + 1).map((_, level) => {
  const c = level / MAX_LEVEL;
  return c <= SRGB_LINEAR_KNEE ? c / SRGB_LINEAR_SLOPE : ((c + SRGB_OFFSET) / (1 + SRGB_OFFSET)) ** SRGB_GAMMA;
});
const toSrgbLevel = (linear) => {
  const c = linear <= SRGB_ENCODED_KNEE ? linear * SRGB_LINEAR_SLOPE : (1 + SRGB_OFFSET) * linear ** (1 / SRGB_GAMMA) - SRGB_OFFSET;
  return Math.min(MAX_LEVEL, Math.max(0, Math.round(c * MAX_LEVEL)));
};

/** (1 - weight) * a + weight * b, per channel, in linear light. */
function dissolve(a, b, weight) {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) out[i] = toSrgbLevel((1 - weight) * toLinear[a[i]] + weight * toLinear[b[i]]);
  return out;
}

// weight of the pre-roll in tail frame j (0-based) of the dissolve: eased,
// never 0 or 1, so both ends of the dissolve continue the frames around it
const dissolveWeight = (j) => {
  const x = (j + 1) / (CROSSFADE_FRAMES + 1);
  return x * x * (3 - 2 * x);
};

async function renderFrames(browser, base, variant, size, keepDir) {
  const scene = await openScene(browser, base, variant, {
    initScripts: [[videoHook, { clockPriority: SCENE_CLOCK_PRIORITY }]],
    onOpening: '__sceneVideoTakeover',
  });
  try {
    const { page, capture } = scene;
    checkCapture(variant, capture, size.height);
    if (!(await page.evaluate(() => window.__sceneVideo.ready))) throw new Error(`${variant.name}: the render loop was not taken over`);
    await silenceTour(page);

    const opening = await flattenFrame(capture.dataUrl, variant.name);
    const step = async (time) => {
      const dataUrl = await page.evaluate(([t, dt]) => window.__sceneVideo.step(t, dt), [time, 1 / FPS]);
      return flattenFrame(dataUrl, variant.name);
    };
    const toSize = (master) => sharp(master).resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();

    const first = await step(0);
    const same = async (a, b) => Buffer.compare(await sharp(a).raw().toBuffer(), await sharp(b).raw().toBuffer()) === 0;
    if (!(await same(first, opening))) throw new Error(`${variant.name}: the loop's first frame is not the poster's opening frame`);

    const loop = [await toSize(first)];
    for (let i = 1; i < LOOP_FRAMES; i++) loop.push(await toSize(await step(i / FPS)));
    const preRoll = [];
    for (let j = 0; j < CROSSFADE_FRAMES; j++) preRoll.push(await toSize(await step((j - CROSSFADE_FRAMES) / FPS)));
    // nothing but scene time decides a frame: stepping back to 0 draws frame 0 again
    if (!(await same(await step(0), first))) throw new Error(`${variant.name}: scene state drifted during the render`);

    const tail = LOOP_FRAMES - CROSSFADE_FRAMES;
    const frames = loop.map((frame, i) => (i < tail ? frame : dissolve(frame, preRoll[i - tail], dissolveWeight(i - tail))));
    if (keepDir) {
      const dir = path.join(keepDir, variant.name);
      mkdirSync(dir, { recursive: true });
      const png = (raw) => sharp(raw, { raw: { ...size, channels: RGB_CHANNELS } }).png();
      for (const [i, raw] of loop.entries()) await png(raw).toFile(path.join(dir, `stepped-${String(i).padStart(4, '0')}.png`));
      for (const [j, raw] of preRoll.entries()) await png(raw).toFile(path.join(dir, `preroll-${String(j).padStart(4, '0')}.png`));
    }
    return { frames, renderer: scene.renderer, buffer: capture.buffer };
  } finally {
    await scene.context.close();
  }
}

// ---- encoding ---------------------------------------------------------------

// CRFs chosen by eye on decoded frames, levels stretched 2-4x, and at the
// size a 3x phone displays them.
const ENCODINGS = [
  {
    ext: 'webm',
    pixFmt: 'yuv420p10le',
    // AV1 at 10 bits: the disk's falloff and the halo's glow into the dark
    // sky stay free of banding and blocking; indistinguishable from the
    // source at display size
    args: ['-c:v', 'libaom-av1', '-crf', '34', '-b:v', '0', '-cpu-used', '3', '-row-mt', '1'],
  },
  {
    ext: 'mp4',
    pixFmt: 'yuv420p',
    // H.264 for Safari and anything without AV1, and for devices that would
    // decode AV1 in software (SceneVideo asks MediaCapabilities). Variance
    // AQ biased to dark blocks (aq-mode 3) keeps the disk's falloff from
    // blotching at a CRF that fits the phone's 400 KB; level 4.1 is what
    // every iPhone decodes in hardware.
    args: [
      '-c:v', 'libx264', '-crf', '28', '-preset', 'veryslow', '-profile:v', 'high', '-level:v', '4.1',
      '-x264-params', 'aq-mode=3', '-movflags', '+faststart',
    ],
  },
];
// The RGB -> YUV conversion happens in this scale filter, with the matrix
// the tags declare. swscale's default rounding darkens by 1-2 levels, which
// the poster -> video handoff would show on the black sky.
const toYuv = (pixFmt) => `scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=${pixFmt}`;
const COLOUR_TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new Error(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited ${result.status}\n${result.stderr}`);
  return result.stdout;
}

function codecString(probe) {
  const stream = JSON.parse(probe).streams[0];
  if (stream.codec_name === 'av1') {
    const depth = stream.pix_fmt.includes('10') ? '10' : '08';
    return `av01.0.${String(stream.level).padStart(2, '0')}M.${depth}`;
  }
  if (stream.codec_name === 'h264') {
    const profile = { High: '64', Main: '4d', 'Constrained Baseline': '42' }[stream.profile];
    if (!profile) throw new Error(`no codec string for H.264 profile ${stream.profile}`);
    return `avc1.${profile}00${stream.level.toString(16).padStart(2, '0')}`;
  }
  throw new Error(`no codec string for ${stream.codec_name}`);
}

async function encode(ffmpeg, variant, size, frames, workDir) {
  const framesDir = path.join(workDir, variant.name);
  mkdirSync(framesDir, { recursive: true });
  for (const [i, raw] of frames.entries()) {
    await sharp(raw, { raw: { ...size, channels: RGB_CHANNELS } })
      .png({ compressionLevel: 1 })
      .toFile(path.join(framesDir, `${String(i).padStart(4, '0')}.png`));
  }
  // beside ffmpeg, or on the PATH when ffmpeg is
  const ffprobe = path.join(path.dirname(ffmpeg), `ffprobe${path.extname(ffmpeg)}`);
  const sources = [];
  for (const { ext, pixFmt, args } of ENCODINGS) {
    const out = path.join(workDir, `${variant.name}.${ext}`);
    run(ffmpeg, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', path.join(framesDir, '%04d.png'),
      '-vf', toYuv(pixFmt),
      // one keyframe: the loop restarts from it
      '-g', String(LOOP_FRAMES), '-an',
      // no random segment UID or muxing date: the same frames give the same file, and URL
      '-fflags', '+bitexact',
      ...args, ...COLOUR_TAGS, out,
    ]);
    const bytes = readFileSync(out);
    const probe = run(ffprobe, [
      '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,profile,level,pix_fmt,width,height', '-of', 'json', out,
    ]);
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, CONTENT_HASH_CHARS);
    const name = `${variant.name}-${size.width}x${size.height}.${hash}.${ext}`;
    sources.push({ name, bytes, type: `video/${ext}; codecs="${codecString(probe)}"` });
  }
  return sources;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workDir = mkdtempSync(path.join(os.tmpdir(), 'scene-video-'));
  const browser = await launchGpuBrowser();
  const browserVersion = `Chrome ${browser.version()}`;
  const rendered = [];
  let renderer = 'unknown';
  try {
    for (const variant of SCENE_VARIANTS.filter(({ name }) => name in VIDEO_SIZES)) {
      const size = VIDEO_SIZES[variant.name];
      const result = await renderFrames(browser, args.base, variant, size, args.keep);
      renderer = result.renderer;
      console.log(`[${variant.name}] ${LOOP_FRAMES} frames at ${FPS} fps from a ${result.buffer.width}x${result.buffer.height} buffer`);
      rendered.push({ variant, size, sources: await encode(args.ffmpeg, variant, size, result.frames, workDir) });
      if (args.keep) {
        const dir = path.join(args.keep, variant.name);
        for (const [i, raw] of result.frames.entries()) {
          await sharp(raw, { raw: { ...size, channels: RGB_CHANNELS } }).png().toFile(path.join(dir, `loop-${String(i).padStart(4, '0')}.png`));
        }
      }
    }
  } finally {
    await browser.close();
    rmSync(workDir, { recursive: true, force: true });
  }

  rmSync(VIDEO_DIR, { recursive: true, force: true });
  mkdirSync(VIDEO_DIR, { recursive: true });
  const variants = rendered.map(({ variant, size, sources }) => ({
    name: variant.name,
    media: variant.media,
    aspect: variant.aspect,
    width: size.width,
    height: size.height,
    sources: sources.map(({ name, bytes, type }) => {
      writeFileSync(path.join(VIDEO_DIR, name), bytes);
      console.log(`  ${VIDEO_URL_DIR}/${name}  ${bytes.length} bytes  ${type}`);
      return { src: `${VIDEO_URL_DIR}/${name}`, type, bytes: bytes.length };
    }),
  }));
  const manifest = {
    fingerprint: sceneFingerprint(ROOT),
    renderer,
    browser: browserVersion,
    fps: FPS,
    frames: LOOP_FRAMES,
    crossfadeFrames: CROSSFADE_FRAMES,
    variants,
  };
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, MANIFEST)} (${readdirSync(VIDEO_DIR).length} files in ${VIDEO_URL_DIR})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
