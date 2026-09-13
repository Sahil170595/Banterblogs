import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import tailwindConfig from '../../../tailwind.config';

// Motion ratchet, v2. Every duration and curve is a named token (micro, fast,
// hover, base, reveal, entrance on the standard, out-quad and entrance
// curves); staggers step through CSS custom properties. The /show scenes and
// the galactic landing animate as content, so the transition-all and duration
// rules exempt them. Scroll reveals exist only through the <Reveal> primitive
// in components/motion/, which keeps content visible without JavaScript and
// under reduced motion: whileInView is banned everywhere, and an
// IntersectionObserver or a view() timeline outside the primitives fails
// unless it is a listed use that moves nothing. framer-motion stays confined
// to the scenes and the landing, so pages that do not animate load none of it.

const SRC = path.join(process.cwd(), 'src');
const GLOBALS_CSS = path.join(SRC, 'app', 'globals.css');
const CONTENT_MOTION_DIRS = [path.join(SRC, 'components', 'scenes'), path.join(SRC, 'components', 'galactic')];
const MOTION_PRIMITIVES_DIR = path.join(SRC, 'components', 'motion');

// Observers outside the primitives that reveal nothing, each with its reason.
const NON_REVEAL_OBSERVERS: Record<string, string> = {
  [path.join('components', 'TableOfContents.tsx')]: 'scroll-spy: marks the heading in view; nothing moves',
};

const DURATION_TOKENS = { micro: '100ms', fast: '150ms', hover: '160ms', base: '250ms', reveal: '420ms', entrance: '800ms' };
const CURVE_TOKENS = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  'out-quad': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  entrance: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
};

// Slowest framer transition allowed outside the scenes, in seconds: overlays
// run at duration-base (0.25 s), so anything slower is decoration. Page motion
// is CSS/WAAPI and does not load framer at all.
const MAX_FRAMER_DURATION_S = 0.3;
// Numeric Tailwind durations that sit on or beside the tokens (named tokens
// never match DURATION_CLASS, which only captures numbers and arbitrary values).
const ALLOWED_NUMERIC_DURATIONS = new Set(['150', '200', '250']);

const TRANSITION_ALL = /\btransition-all\b|\btransition(?:-property)?\s*:\s*['"`]?all\b/;
const WHILE_IN_VIEW = /\bwhileInView\b/;
const INTERSECTION_OBSERVER = /\bnew\s+IntersectionObserver\b/;
// a view-progress timeline is a CSS scroll reveal; scroll(root|self) progress is not
const VIEW_TIMELINE = /animation-timeline\s*:\s*view\(|\bview-timeline(?:-name)?\s*:|\banimationTimeline\s*:\s*['"`]view\(/;
// the primitive owns reveal state; pages wrap content in <Reveal> instead
const REVEAL_STATE = /\bdata-reveal\b|\bdataset\.reveal\b/;
// `duration-300`, `hover:duration-500`, `!duration-700`, `duration-[400ms]`;
// requiring a class boundary keeps CSS `transition-duration:` out of it.
const DURATION_CLASS = /(?:^|[\s"'`{:!])duration-(\d+|\[[^\]\s]*\])(?![\w-])/g;
// framer's transition prop (`transition={...}`) and nested transition objects
// (`animate={{ ..., transition: { ... } }}`, variants)
const FRAMER_TRANSITION_START = /\btransition(?:=\{|\s*:\s*\{)/g;
const DURATION_VALUE = /\bduration\s*:\s*(\d*\.?\d+)/g;
const FRAMER_IMPORT = /from\s+['"]framer-motion['"]/;

function sourceFiles(dir: string, extension: RegExp): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full, extension);
    return extension.test(entry.name) ? [full] : [];
  });
}

function isContentMotion(file: string): boolean {
  return CONTENT_MOTION_DIRS.some((dir) => file.startsWith(dir + path.sep));
}

function isMotionPrimitive(file: string): boolean {
  return file.startsWith(MOTION_PRIMITIVES_DIR + path.sep);
}

// Every duration inside each framer transition expression, with the line the
// expression starts on. Braces are balanced so conditional transitions
// (`reduced ? { duration: 0 } : { duration: 0.5 }`) are read whole.
function framerTransitionDurations(source: string): Array<{ line: number; seconds: number }> {
  const found: Array<{ line: number; seconds: number }> = [];
  for (const start of source.matchAll(FRAMER_TRANSITION_START)) {
    const open = (start.index ?? 0) + start[0].length - 1;
    let depth = 0;
    let end = open;
    for (; end < source.length; end++) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}' && --depth === 0) break;
    }
    const line = source.slice(0, start.index).split('\n').length;
    for (const value of source.slice(open, end + 1).matchAll(DURATION_VALUE)) {
      found.push({ line, seconds: Number(value[1]) });
    }
  }
  return found;
}

function motionViolations(file: string, source: string): string[] {
  const where = (line: number) => `${path.relative(SRC, file)}:${line}`;
  const exempt = isContentMotion(file);
  const primitive = isMotionPrimitive(file);
  const script = /\.tsx?$/.test(file);
  const observerAllowed = primitive || path.relative(SRC, file) in NON_REVEAL_OBSERVERS;
  const offenders: string[] = [];

  source.split('\n').forEach((text, index) => {
    const line = index + 1;
    if (WHILE_IN_VIEW.test(text)) offenders.push(`${where(line)} reveals on scroll with whileInView (use <Reveal>)`);
    if (!primitive && VIEW_TIMELINE.test(text)) {
      offenders.push(`${where(line)} reveals with a view() timeline outside the motion primitives (use <Reveal>)`);
    }
    if (!observerAllowed && INTERSECTION_OBSERVER.test(text)) {
      offenders.push(`${where(line)} observes intersections outside the motion primitives (use <Reveal>, or list a use that moves nothing)`);
    }
    if (script && !primitive && REVEAL_STATE.test(text)) {
      offenders.push(`${where(line)} writes reveal state outside the motion primitives (wrap the content in <Reveal>)`);
    }
    if (exempt) return;
    if (TRANSITION_ALL.test(text)) {
      offenders.push(`${where(line)} transitions every property (name the ones that change)`);
    }
    for (const match of text.matchAll(DURATION_CLASS)) {
      if (!ALLOWED_NUMERIC_DURATIONS.has(match[1])) {
        offenders.push(`${where(line)} uses duration-${match[1]} (use a named token: ${Object.keys(DURATION_TOKENS).join(', ')})`);
      }
    }
  });

  if (!exempt) {
    for (const { line, seconds } of framerTransitionDurations(source)) {
      if (seconds > MAX_FRAMER_DURATION_S) {
        offenders.push(`${where(line)} runs a ${seconds}s framer transition (max ${MAX_FRAMER_DURATION_S}s)`);
      }
    }
  }
  return offenders;
}

// Top-level blocks of a stylesheet, comments stripped: plain rules and the
// bodies of at-rules, braces balanced.
function cssBlocks(css: string): Array<{ prelude: string; body: string }> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: Array<{ prelude: string; body: string }> = [];
  let start = 0;
  let depth = 0;
  let open = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) open = i;
      depth++;
    } else if (text[i] === '}' && --depth === 0) {
      blocks.push({ prelude: text.slice(start, open).trim(), body: text.slice(open + 1, i) });
      start = i + 1;
    }
  }
  return blocks;
}

const rulesIn = (body: string) =>
  [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, declarations]) => ({ selector: selector.trim(), declarations }));

describe('motion tokens', () => {
  it('names every duration and curve in the Tailwind theme', () => {
    const extend = tailwindConfig.theme?.extend;
    expect(extend?.transitionDuration).toEqual(DURATION_TOKENS);
    expect(extend?.transitionTimingFunction).toEqual(CURVE_TOKENS);
  });

  it('steps staggers through CSS custom properties: items 50 ms, lines 100 ms', () => {
    const css = fs.readFileSync(GLOBALS_CSS, 'utf8');
    expect(css).toMatch(/--stagger-item:\s*50ms;/);
    expect(css).toMatch(/--stagger-line:\s*100ms;/);
  });

  it('reads every CSS motion duration and curve from the tokens, so CSS and classes cannot drift', () => {
    const css = fs.readFileSync(GLOBALS_CSS, 'utf8');
    for (const key of Object.keys(DURATION_TOKENS)) {
      expect(css, key).toMatch(new RegExp(`--motion-${key}:\\s*theme\\(['"]transitionDuration\\.${key}['"]\\);`));
    }
    for (const key of Object.keys(CURVE_TOKENS)) {
      expect(css, key).toMatch(new RegExp(`--ease-${key}:\\s*theme\\(['"]transitionTimingFunction\\.${key}['"]\\);`));
    }
  });
});

// The ratchet is only as good as its detectors: prove each one fires, and
// fires only where it should, so a regex regression cannot pass silently.
describe('motion ratchet detectors', () => {
  const plain = path.join(SRC, 'components', 'Plain.tsx');
  const scene = path.join(SRC, 'components', 'scenes', 'Scene.tsx');
  const primitive = path.join(SRC, 'components', 'motion', 'Primitive.ts');
  const scrollSpy = path.join(SRC, 'components', 'TableOfContents.tsx');

  it('flags transition-all and transition: all outside the animated surfaces only', () => {
    expect(motionViolations(plain, '<a className="transition-all hover:text-primary" />')).toHaveLength(1);
    expect(motionViolations(plain, `<div style={{ transition: 'all 200ms' }} />`)).toHaveLength(1);
    expect(motionViolations(GLOBALS_CSS, '.x { transition: all 0.3s ease; }')).toHaveLength(1);
    expect(motionViolations(plain, '<a className="transition-colors duration-fast ease-standard" />')).toEqual([]);
    expect(motionViolations(scene, '<a className="transition-all" />')).toEqual([]);
  });

  it('flags whileInView everywhere, the scenes and the motion primitives included', () => {
    for (const file of [plain, scene, primitive]) {
      expect(motionViolations(file, '<motion.div whileInView={{ opacity: 1 }} />'), file).toHaveLength(1);
    }
  });

  it('confines IntersectionObserver to the motion primitives and listed uses that move nothing', () => {
    const observe = 'const io = new IntersectionObserver(onEnter);';
    expect(motionViolations(plain, observe)).toHaveLength(1);
    expect(motionViolations(scene, observe)).toHaveLength(1);
    expect(motionViolations(primitive, observe)).toEqual([]);
    expect(motionViolations(scrollSpy, observe)).toEqual([]);
  });

  it('confines view() timelines to the motion primitives; scroll-progress timelines are not reveals', () => {
    expect(motionViolations(GLOBALS_CSS, '.card { animation-timeline: view(); }')).toHaveLength(1);
    expect(motionViolations(GLOBALS_CSS, '.card { view-timeline-name: --card; }')).toHaveLength(1);
    expect(motionViolations(plain, `<div style={{ animationTimeline: 'view()' }} />`)).toHaveLength(1);
    expect(motionViolations(GLOBALS_CSS, '.progress { animation-timeline: scroll(root); }')).toEqual([]);
  });

  it('keeps reveal state inside the primitive; the stylesheet only styles it', () => {
    expect(motionViolations(plain, `el.setAttribute('data-reveal', 'shown');`)).toHaveLength(1);
    expect(motionViolations(plain, '<div data-reveal="" />')).toHaveLength(1);
    expect(motionViolations(primitive, `el.setAttribute('data-reveal', 'shown');`)).toEqual([]);
    expect(motionViolations(GLOBALS_CSS, 'html[data-motion="on"] [data-reveal="pending"] { opacity: 0; }')).toEqual([]);
  });

  it('flags framer transitions slower than the overlay duration', () => {
    expect(motionViolations(plain, '<motion.div transition={{ duration: 0.7 }} />')).toHaveLength(1);
    expect(
      motionViolations(plain, `<motion.div transition={reduced ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }} />`),
    ).toHaveLength(1);
    expect(motionViolations(plain, '<motion.div animate={{ opacity: 1, transition: { duration: 0.8 } }} />')).toHaveLength(1);
    expect(motionViolations(plain, '<motion.div transition={{ duration: 0.25 }} />')).toEqual([]);
    expect(motionViolations(scene, '<motion.div transition={{ duration: 0.7 }} />')).toEqual([]);
  });

  it('allows only the named tokens (and the numbers beside them) as Tailwind durations', () => {
    expect(motionViolations(plain, '<div className="transition-opacity duration-500" />')).toHaveLength(1);
    expect(motionViolations(plain, '<div className="hover:duration-300 duration-[400ms]" />')).toHaveLength(2);
    expect(motionViolations(plain, '<div className="duration-[420ms]" />')).toHaveLength(1);
    const named = Object.keys(DURATION_TOKENS).map((key) => `duration-${key}`).join(' ');
    expect(motionViolations(plain, `<div className="${named} duration-150 duration-200 duration-250" />`)).toEqual([]);
    expect(motionViolations(GLOBALS_CSS, '* { transition-duration: 0.01ms !important; }')).toEqual([]);
    expect(motionViolations(scene, '<div className="duration-700" />')).toEqual([]);
  });
});

describe('motion ratchet', () => {
  const files = [...sourceFiles(SRC, /\.tsx?$/), GLOBALS_CSS];

  it('scans the whole component tree, modules included', () => {
    // a moved directory must fail loudly rather than pass an empty scan
    for (const known of [
      'components/Header.tsx',
      'components/SearchDialog.tsx',
      'components/scenes/StreamingLadder.tsx',
      'components/motion/Reveal.tsx',
      'components/motion/revealObserver.ts',
    ]) {
      expect(files).toContain(path.join(SRC, known));
    }
    expect(fs.existsSync(GLOBALS_CSS)).toBe(true);
  });

  it('keeps every transition narrow, every duration on the tokens and every reveal inside <Reveal>', () => {
    const offenders = files.flatMap((file) => motionViolations(file, fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('lists only non-reveal observers that still exist and still observe', () => {
    for (const [file, reason] of Object.entries(NON_REVEAL_OBSERVERS)) {
      const full = path.join(SRC, file);
      expect(fs.existsSync(full), `${file}: ${reason}`).toBe(true);
      expect(fs.readFileSync(full, 'utf8'), `${file}: ${reason}`).toMatch(INTERSECTION_OBSERVER);
    }
  });

  it('keeps framer-motion inside the scenes and the landing', () => {
    // MotionConfig in the root layout alone put framer code on every page
    const importers = sourceFiles(SRC, /\.tsx?$/).filter((file) => FRAMER_IMPORT.test(fs.readFileSync(file, 'utf8')));
    // the scenes import it, so an empty list means the scan went blind
    expect(importers.length).toBeGreaterThan(0);
    expect(importers.filter((file) => !isContentMotion(file)).map((file) => path.relative(SRC, file))).toEqual([]);
  });
});

// What makes a reveal safe: content is visible in the HTML, hidden only once
// the pre-paint gate has armed motion, and at rest under reduced motion and in
// print. Component behaviour is in components/motion/__tests__/reveal.test.tsx.
describe('reveal primitive guarantees', () => {
  const blocks = cssBlocks(fs.readFileSync(GLOBALS_CSS, 'utf8'));
  const topLevel = blocks.filter((block) => !block.prelude.startsWith('@')).map((block) => ({ selector: block.prelude, declarations: block.body }));
  const mediaRules = (query: string) =>
    blocks.filter((block) => block.prelude.replace(/\s+/g, ' ') === `@media ${query}`).flatMap((block) => rulesIn(block.body));

  it('hides a reveal only under html[data-motion="on"]', () => {
    const hiding = [...topLevel, ...blocks.filter((b) => b.prelude.startsWith('@media')).flatMap((b) => rulesIn(b.body))].filter(
      (rule) => /\[data-reveal/.test(rule.selector) && /opacity:\s*0\s*[;!]|opacity:\s*0\s*$/m.test(rule.declarations),
    );
    expect(hiding.length).toBeGreaterThan(0);
    for (const rule of hiding) {
      for (const selector of rule.selector.split(',')) expect(selector.trim()).toMatch(/^html\[data-motion="on"\]/);
    }
  });

  it.each(['(prefers-reduced-motion: reduce)', 'print'])('shows every reveal at rest under %s', (query) => {
    const rest = mediaRules(query).filter((rule) => rule.selector.split(',').map((s) => s.trim()).includes('[data-reveal]'));
    expect(rest.length, query).toBeGreaterThan(0);
    const declarations = rest.map((rule) => rule.declarations).join(';');
    expect(declarations).toMatch(/opacity:\s*1\s*!important/);
    expect(declarations).toMatch(/transform:\s*none\s*!important/);
    expect(declarations).toMatch(/transition:\s*none\s*!important/);
  });
});
