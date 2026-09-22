import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import AboutPage from '@/app/about/page';
import { ENTRANCE_GROUP_CLASS } from '@/components/motion/entrance';
import { ABOUT_LINKS, ECOSYSTEM } from '@/lib/about';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

// /about in the profile register (Phase R3-B), prose at the R2 reading type:
// every sentence of main's copy (adc8433), the ecosystem list and the links
// intact.

const OWNER_PROSE = [
  'Chimera is a constitutional AI enforcement architecture.',
  'Every action routes through an embedding-based safety classifier, escalates to multi-model debate when uncertain, and produces cryptographically signed provenance chains with zero-knowledge proofs.',
  'The system self-improves: debate outcomes train the alignment encoder through an RLAIF loop.',
  'Built by Sahil Kadadekar · Solo architect · Sep 2025 – Present',
  'A constitutional AI enforcement system spanning Python and Rust.',
  'An embedding fast-path router handles routine queries and escalates uncertain ones to a multi-model debate engine with heat-based escalation and three consensus algorithms.',
  'The Rust runtime (7 crates) provides Ed25519 provenance chains, BFT consensus, and zero-knowledge proofs for cross-trust-boundary communication.',
  'JARVIS is the agent layer — multi-provider chat, voice (Whisper/Piper), semantic memory, tool execution with human-in-the-loop approval, and proactive intelligence.',
  `${MEASUREMENTS.DISPLAY} measurements across ${REPORTS.DISPLAY} technical reports.`,
  'Not wall-clock approximations — CUDA event timing with defined hardware profiles and statistical methodology.',
  'Covers model loading, ONNX conversion, TensorRT compilation, KV cache optimization, multi-agent coordination, and safety analysis across Ollama, vLLM, and TGI.',
  '9 repositories · Python, Rust, TypeScript, C#',
  '268 episodes were auto-generated from git commits across the nine repositories (per-commit stream archived 2026-06-26; each stream closes with a full retrospective).',
  'A multi-agent pipeline (Chimera Multi-Agent) ingested commits and benchmark data, generated roundtable-style commentary with four AI personas, and published to this Next.js site via GitHub + Vercel.',
  `The research archive surfaces ${REPORTS.DISPLAY} technical reports with phase grouping, searchable titles, and ISR with 15-minute revalidation.`,
  'Every report links to real measurements and defined methodology.',
];
const HEADINGS = ['What This Is', 'The architecture', 'The research', 'The Ecosystem', 'About This Site'];
const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const MAX_BORDERED = 12;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

let page: HTMLElement;
let markup: string;
beforeAll(() => {
  markup = renderToStaticMarkup(<AboutPage />);
});
beforeEach(() => {
  page = render(<AboutPage />).container;
});

describe('about page copy', () => {
  it('keeps the title as the one h1 and every sentence of the owner copy', () => {
    const h1s = page.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe('Constitutional AI with signed, replayable decision traces.');
    const all = text(page);
    for (const sentence of [...OWNER_PROSE, ...HEADINGS]) expect(all, sentence).toContain(sentence);
  });

  it('keeps every repository with its languages and description', () => {
    const all = text(page);
    for (const repo of ECOSYSTEM) for (const field of [repo.name, repo.lang, repo.what]) expect(all, field.slice(0, 50)).toContain(field);
  });

  it('keeps the two numbers and every onward link', () => {
    const stats = [...page.querySelectorAll('ul[aria-label="The program in numbers"] li')].map(text);
    expect(stats).toEqual([`${MEASUREMENTS.SHORT} Research Measurements`, `${REPORTS.DISPLAY} Technical Reports`]);
    for (const link of ABOUT_LINKS) {
      const found = [...page.querySelectorAll(`a[href="${link.href}"]`)].map(text);
      expect(found, link.href).toContain(link.label);
    }
  });
});

describe('about page layout', () => {
  it('puts the title across the page, then the byline and numbers in the rail, with an index of the three sections', () => {
    expect(page.querySelector('header h1')).not.toBeNull();
    const rail = page.querySelector('.profile-rail')!;
    expect(text(rail)).toContain('Built by Sahil Kadadekar');
    expect(rail.querySelector('ul[aria-label="The program in numbers"]')).not.toBeNull();
    const index = [...rail.querySelectorAll('nav[aria-label="On this page"] a')].map((a) => a.getAttribute('href') ?? '');
    expect(index).toEqual(['#what', '#ecosystem', '#site']);
    for (const id of index) expect(page.querySelector(`section${id}`), id).not.toBeNull();
  });

  it('sets the prose at the R2 reading type: 18px in the prose colour', () => {
    const paragraphs = [...page.querySelectorAll('#what p, #site p, .profile-rail + div > p')];
    expect(paragraphs.length).toBe(5);
    for (const p of paragraphs) expect(p.className.split(/\s+/), text(p).slice(0, 40)).toEqual(expect.arrayContaining(['text-copy-18', 'text-prose']));
  });

  // R4 design re-judge: the page explained an architecture without a
  // diagram. The lede's own sequence is drawn under it.
  it('draws the decision path the lede describes, under the lede: router, debate when uncertain, signed provenance, and the RLAIF loop back', () => {
    const column = page.querySelector('.profile-rail + div')!;
    const figure = column.querySelector(':scope > figure.flow')!;
    expect(figure).not.toBeNull();
    expect(figure.previousElementSibling?.tagName).toBe('P');
    expect([...figure.querySelectorAll('.flow-label')].map(text)).toEqual(['Action', 'Router', 'Debate', 'Provenance']);
    expect(text(figure.querySelector('.flow-loop')!)).toContain('debate outcomes train the alignment encoder');
    expect(text(figure.querySelector('figcaption')!)).not.toBe('');
  });

  it('lists the repositories as hairline rows that reveal as they scroll in', () => {
    const rows = page.querySelectorAll('#ecosystem li[data-reveal] .list-row');
    expect(rows).toHaveLength(ECOSYSTEM.length);
  });

  it('opens on the three-group entrance', () => {
    const groups = new Set([...page.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)].map((g) => g.style.getPropertyValue('--group')));
    expect([...groups].sort()).toEqual(['0', '1', '2']);
  });

  it('draws no boxed panels: no signal classes, no stat tiles, and at most a handful of hairline buttons', () => {
    expect(markup).not.toMatch(/signal-(panel|pill|divider)/);
    const bordered = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)));
    expect(bordered.every((el) => el.classList.contains('pressable'))).toBe(true);
    expect(bordered.length).toBeLessThanOrEqual(MAX_BORDERED);
  });
});
