import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import tailwindConfig from '../../../tailwind.config';

// Motion ratchet. One curve (ease-standard) and two durations — duration-fast
// for colour and opacity feedback, duration-base for overlays — replaced ~70
// `transition: all`, reveal-on-scroll sections and framer durations up to
// 0.7 s. The /show scenes and the galactic landing animate as content, so the
// transition-all and duration rules exempt them; nothing is exempt from the
// reveal-on-scroll ban. framer-motion is confined to those two surfaces, so
// pages that do not animate load none of it.

const SRC = path.join(process.cwd(), 'src');
const GLOBALS_CSS = path.join(SRC, 'app', 'globals.css');
const CONTENT_MOTION_DIRS = [path.join(SRC, 'components', 'scenes'), path.join(SRC, 'components', 'galactic')];

// Slowest framer transition allowed outside the scenes, in seconds: overlays
// run at duration-base (0.25 s), so anything slower is decoration.
const MAX_FRAMER_DURATION_S = 0.3;
// Numeric Tailwind durations that sit on or beside the tokens (named tokens
// never match DURATION_CLASS, which only captures numbers and arbitrary values).
const ALLOWED_NUMERIC_DURATIONS = new Set(['150', '200', '250']);

const TRANSITION_ALL = /\btransition-all\b|\btransition(?:-property)?\s*:\s*['"`]?all\b/;
const WHILE_IN_VIEW = /\bwhileInView\b/;
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
  const offenders: string[] = [];

  source.split('\n').forEach((text, index) => {
    const line = index + 1;
    if (WHILE_IN_VIEW.test(text)) offenders.push(`${where(line)} reveals on scroll (whileInView)`);
    if (exempt) return;
    if (TRANSITION_ALL.test(text)) {
      offenders.push(`${where(line)} transitions every property (name the ones that change)`);
    }
    for (const match of text.matchAll(DURATION_CLASS)) {
      if (!ALLOWED_NUMERIC_DURATIONS.has(match[1])) {
        offenders.push(`${where(line)} uses duration-${match[1]} (use duration-fast or duration-base)`);
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

describe('motion tokens', () => {
  it('defines one curve and two durations in the Tailwind theme', () => {
    const extend = tailwindConfig.theme?.extend;
    expect(extend?.transitionDuration).toEqual({ fast: '150ms', base: '250ms' });
    expect(extend?.transitionTimingFunction).toEqual({ standard: 'cubic-bezier(0.4, 0, 0.2, 1)' });
  });
});

// The ratchet is only as good as its detectors: prove each one fires, and
// fires only where it should, so a regex regression cannot pass silently.
describe('motion ratchet detectors', () => {
  const plain = path.join(SRC, 'components', 'Plain.tsx');
  const scene = path.join(SRC, 'components', 'scenes', 'Scene.tsx');

  it('flags transition-all and transition: all outside the animated surfaces only', () => {
    expect(motionViolations(plain, '<a className="transition-all hover:text-primary" />')).toHaveLength(1);
    expect(motionViolations(plain, `<div style={{ transition: 'all 200ms' }} />`)).toHaveLength(1);
    expect(motionViolations(GLOBALS_CSS, '.x { transition: all 0.3s ease; }')).toHaveLength(1);
    expect(motionViolations(plain, '<a className="transition-colors duration-fast ease-standard" />')).toEqual([]);
    expect(motionViolations(scene, '<a className="transition-all" />')).toEqual([]);
  });

  it('flags reveal-on-scroll everywhere, scenes included', () => {
    expect(motionViolations(plain, '<motion.div whileInView={{ opacity: 1 }} />')).toHaveLength(1);
    expect(motionViolations(scene, '<motion.div whileInView={{ opacity: 1 }} />')).toHaveLength(1);
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

  it('allows only the token durations as Tailwind classes', () => {
    expect(motionViolations(plain, '<div className="transition-opacity duration-500" />')).toHaveLength(1);
    expect(motionViolations(plain, '<div className="hover:duration-300 duration-[400ms]" />')).toHaveLength(2);
    expect(
      motionViolations(plain, '<div className="duration-fast duration-base duration-150 duration-200 duration-250" />'),
    ).toEqual([]);
    expect(motionViolations(GLOBALS_CSS, '* { transition-duration: 0.01ms !important; }')).toEqual([]);
    expect(motionViolations(scene, '<div className="duration-700" />')).toEqual([]);
  });
});

describe('motion ratchet', () => {
  const files = [...sourceFiles(SRC, /\.tsx$/), GLOBALS_CSS];

  it('scans the whole component tree', () => {
    // a moved directory must fail loudly rather than pass an empty scan
    for (const known of ['components/Header.tsx', 'components/SearchDialog.tsx', 'components/scenes/StreamingLadder.tsx']) {
      expect(files).toContain(path.join(SRC, known));
    }
    expect(fs.existsSync(GLOBALS_CSS)).toBe(true);
  });

  it('keeps every transition narrow, every duration on the tokens and nothing revealing on scroll', () => {
    const offenders = files.flatMap((file) => motionViolations(file, fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('keeps framer-motion inside the scenes and the landing', () => {
    // MotionConfig in the root layout alone put framer code on every page
    const importers = sourceFiles(SRC, /\.tsx?$/).filter((file) => FRAMER_IMPORT.test(fs.readFileSync(file, 'utf8')));
    // the scenes import it, so an empty list means the scan went blind
    expect(importers.length).toBeGreaterThan(0);
    expect(importers.filter((file) => !isContentMotion(file)).map((file) => path.relative(SRC, file))).toEqual([]);
  });
});
