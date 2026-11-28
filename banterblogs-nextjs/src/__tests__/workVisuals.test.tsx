import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { CAPTURES, MAX_BYTES, OUTPUT, VISUAL_URL_DIR } from '../../scripts/capture-work-visuals.mjs';
import WorkPage from '@/app/work/page';
import { RESEARCH, type WorkVisual } from '@/lib/work';

// /work's proof visuals: real screenshots of this site's own live demos
// (scripts/capture-work-visuals.mjs), each a small linked thumbnail on the
// entry that already linked to that demo. No new association between an
// entry and a project, no portrait, no next/image.

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ prefetch: _prefetch, children, onNavigate: _onNavigate, transitionTypes: _types, ...props }: { prefetch?: boolean | null; onNavigate?: unknown; transitionTypes?: unknown; children?: ReactNode }) =>
      createElement('a', props, children),
  };
});

const PUBLIC_DIR = path.join(process.cwd(), 'public');
// pages this site hosts that a screenshot may come from
const HOSTED = /^\/(?:projects|tools|show)\//;
// alt text that describes the picture, not "screenshot"
const ALT_MIN_CHARS = 40;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

const LINKED = RESEARCH.flatMap((item) => (item.evidence ?? []).filter((link) => link.visual).map((link) => ({ item, link, visual: link.visual as WorkVisual })));

describe('work page proof visuals', () => {
  it('attaches a visual only to a link the entry already had, to a page this site hosts, captured from that page', () => {
    expect(LINKED.length).toBeGreaterThan(0);
    for (const { link, visual } of LINKED) {
      expect(link.href, link.label).toMatch(HOSTED);
      const capture = CAPTURES.find((candidate) => candidate.route === link.href);
      expect(capture, `${link.href} is not a page the capture script photographs`).toBeDefined();
      expect(visual.src).toBe(capture!.src);
    }
  });

  it('uses every capture, and public/work holds exactly those files', () => {
    expect(LINKED.map(({ visual }) => visual.src).sort()).toEqual(CAPTURES.map((capture) => capture.src).sort());
    const onDisk = fs.readdirSync(path.join(PUBLIC_DIR, ...VISUAL_URL_DIR.split('/').filter(Boolean))).sort();
    expect(onDisk, 'run `node scripts/capture-work-visuals.mjs` against a production build').toEqual(CAPTURES.map((capture) => capture.file).sort());
  });

  it('stores each as one small AVIF at the size the page declares for it', async () => {
    for (const { visual } of LINKED) {
      const bytes = fs.readFileSync(path.join(PUBLIC_DIR, visual.src));
      expect(bytes.length, `${visual.src} bytes`).toBeLessThanOrEqual(MAX_BYTES);
      const meta = await sharp(bytes).metadata();
      expect([meta.format, meta.compression], visual.src).toEqual(['heif', 'av1']);
      expect([meta.width, meta.height], visual.src).toEqual([visual.width, visual.height]);
      expect([visual.width, visual.height]).toEqual([OUTPUT.width, OUTPUT.height]);
    }
  });

  it('describes each picture in its alt text', () => {
    const alts = LINKED.map(({ visual }) => visual.alt);
    expect(new Set(alts).size).toBe(alts.length);
    for (const alt of alts) {
      expect(alt.length, alt).toBeGreaterThanOrEqual(ALT_MIN_CHARS);
      expect(alt).not.toMatch(/^(?:screenshot|image|picture)\b/i);
    }
  });

  it('draws each as a plain lazy <img> with its size, inside the one link to its demo', () => {
    const page = render(<WorkPage />).container;
    for (const { item, link, visual } of LINKED) {
      const row = [...page.querySelectorAll('#research li')].find((li) => li.querySelector('h3') && text(li.querySelector('h3')!) === item.label)!;
      const anchors = [...row.querySelectorAll(`a[href="${link.href}"]`)];
      // the thumbnail is the entry's link to the demo, not a second one beside it
      expect(anchors, link.href).toHaveLength(1);
      expect(text(anchors[0])).toBe(link.label);
      const img = anchors[0].querySelector('img')!;
      expect(img, link.href).not.toBeNull();
      expect(img.getAttribute('src')).toBe(visual.src);
      expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual([String(visual.width), String(visual.height)]);
      expect([img.getAttribute('loading'), img.getAttribute('decoding')]).toEqual(['lazy', 'async']);
      expect(img.getAttribute('alt')).toBe(visual.alt);
      // its frame holds the picture's 16:9 before the file arrives, so nothing shifts
      expect(img.closest('.card-visual')?.className.split(/\s+/)).toContain('aspect-video');
      // hover depth: the link takes the pointer, its child lifts
      expect(anchors[0].className.split(/\s+/)).toContain('card-depth');
      expect(img.closest('.card-lift')).not.toBeNull();
    }
  });

  it('leaves the other evidence links as they were, and the page with no other raster image', () => {
    const page = render(<WorkPage />).container;
    expect(page.querySelectorAll('img')).toHaveLength(LINKED.length);
    for (const item of RESEARCH) {
      for (const link of (item.evidence ?? []).filter((candidate) => !candidate.visual)) {
        const anchor = page.querySelector(`a[href="${link.href}"]`)!;
        expect(text(anchor)).toBe(link.label);
        expect(anchor.querySelector('img')).toBeNull();
      }
    }
    // no optimizer URL: the files are served as they are
    expect(renderToStaticMarkup(<WorkPage />)).not.toMatch(/_next\/image|srcset/i);
  });
});
