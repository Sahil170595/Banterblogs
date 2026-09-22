import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformPage from '@/app/platform/page';
import { STAR_SYSTEMS } from '@/components/galactic/systems';
import { ENTRANCE_GROUP_CLASS, ENTRANCE_ITEM_ATTRIBUTE } from '@/components/motion/entrance';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { CHIMERAFORGE_TOOL, QUANTFIT_TOOL } from '@/lib/tools';

// /platform as an architecture page (R5 design re-judge P1-B: it was the
// last card wall, 20 filled surfaces). An unboxed head with the key numbers;
// each core engine one large drawing from the archive's generator over its
// story and a hairline list of its subsystems; the gateway a figure of a
// chat turn's path; every other system a hairline row with a small drawing.
// No card surfaces: the only filled shapes are the drawings' plates and the
// one figure. The owner's copy survives sentence for sentence.

// prefetch never reaches the DOM; surface it on the anchor
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ prefetch, children, onNavigate: _onNavigate, transitionTypes: _types, ...props }: { prefetch?: boolean | null; onNavigate?: unknown; transitionTypes?: unknown; children?: ReactNode }) =>
      createElement('a', { ...props, 'data-prefetch': prefetch === false ? 'off' : 'auto' }, children),
  };
});

// Every sentence of the page's prose at adc8433, verbatim.
const OWNER_PROSE = [
  'Nine repositories across Python, Rust, TypeScript, and C#.',
  'Constitutional AI enforcement with cryptographic provenance, multi-model debate, and a self-improving alignment loop — from the JARVIS gateway to mobile clients to channel adapters.',
  'The core monorepo.',
  'Six interconnected subsystems handling constitutional AI enforcement, multi-model debate, cryptographic provenance, and the JARVIS multi-modal assistant.',
  'All inter-service coupling is HTTP.',
  'AI agent layer — chat, voice, semantic memory, tools, proactive intelligence, smart home',
  'TDD002 — embedding cosine similarity, calibration (isotonic/Platt), calibrated fast-path routing',
  'Chimera — heat-based escalation, weighted voting, ranked choice, Condorcet consensus',
  'TDD005 — Ed25519 provenance, BFT consensus, ZK proofs, cognitive agents with ELO',
  'RLAIF self-improving loop · 3-stage tool approval',
  'Python, Rust · 6 subsystems + 7 Rust crates',
  `Python · ${MEASUREMENTS.SHORT} measurements`,
  'ML research platform and production inference backbone.',
  `${MEASUREMENTS.DISPLAY} measurements across ${REPORTS.DISPLAY} technical reports, targeting consumer GPUs with sub-100ms inference.`,
  'Model selection, streaming, multi-backend dispatch',
  'Alignment under quantization, concurrency, cross-backend consistency',
  '4 compilation backends, 5 quantization formats, GPU kernel profiling',
  'Thompson sampling, multi-armed bandit, SLA enforcement',
  '37-file evaluation framework · 20 monitoring modules · 12 security modules',
  'Multi-modal AI gateway with multi-provider routing (Anthropic, OpenAI, Gemini, Ollama).',
  'Every chat turn routes through the constitutional router.',
  'Tool execution uses a 3-stage propose/approve/execute pipeline with cryptographic provenance on every action.',
  'Muse Protocol — 6-agent content pipeline with ClickHouse analytics.',
  'Also the observability control plane (OTel tracing, Datadog metrics, DLQ).',
  'Python · ClickHouse · OTel',
  `LLM deployment optimizer on PyPI (v${CHIMERAFORGE_TOOL.version}).`,
  'Model-agnostic 5-gate capacity planner (VRAM, Quality, Safety, Latency, Cost) — any registry / Ollama / HuggingFace model across 22 GPU profiles, plus an MCP server that serves the same numbers to AI assistants.',
  'Android companion for JARVIS — Unity/C# with voice, chat, session handoff, tool approval, mesh networking, and offline-first support.',
  'C# / Unity · WebSocket streaming',
  'Messaging channel adapters — Slack and Discord bridges to JARVIS with session tracking and device key auth.',
  'Python · Slack Bolt · discord.py',
  'Web console — chat with streaming, control room dashboard, cognitive agent ELO, tool catalog, workflow management, memory browser.',
  'TypeScript / Next.js · WebSocket',
  '268 auto-generated episodes from git commits (stream archived 2026-06-26).',
  `Research archive with ${REPORTS.DISPLAY} technical reports.`,
  'Next.js 16 with SSG + ISR.',
  'TypeScript · Vercel',
  'Embodied autonomy.',
  'Governed mission-execution plane between Chimera control and PX4/ArduPilot — 5-tier authority hierarchy, cryptographic mission replay, OpenAPI 3.1 mission contract.',
  'Phase 0 specs complete; SIM-ONLY MVP in progress.',
  'Python, Rust · ROS 2 · PX4 + Gazebo',
  'Independent CLIs shipped outside the Chimera ecosystem — their own repositories, not counted among the nine.',
  `GPU-aware quantization CLI with a built-in safety-drift check (v${QUANTFIT_TOOL.version}).`,
  'Quantizes across the SOTA matrix (AWQ / GPTQ / SmoothQuant / FP8 / RTN + GGUF), refuses honestly when a model will not fit, and measures whether quantization broke refusals — a two-axis vector (refusal-robustness + over-refusal) against an unquantized baseline, with bounded Wilson-CI verdicts and an auditable drift report.',
  'Banterhearts bench data and Banterpacks git commits flow into ClickHouse via dedicated agents.',
  'Watcher monitors pipeline health.',
  'Council generates episodes with performance insights baked in.',
  'Publisher pushes episodes to GitHub.',
  'Vercel rebuilds the site.',
  'i18n translates to German, Chinese, Hindi.',
  'JARVIS gateway dispatches inference locally.',
  'Chimeradroid extends access to mobile devices.',
  'The subsystems above are not diagrams on /show.',
  'Each scene replays pre-computed records from the Banterpacks pipeline — real Ed25519 signatures, real Pedersen commitments, real tier verdicts — and labels the one deterministic stand-in where the public demo uses it.',
  'Start with the five-tier streaming ladder, the zero-knowledge alignment proof, or BFT consensus across four replicas.',
  `${REPORTS.DISPLAY} technical reports with ${MEASUREMENTS.DISPLAY} measurements across inference, optimization, and safety.`,
  "Who built this, why, and where it's headed.",
];
const SUBSYSTEMS: Record<string, string[]> = {
  Banterpacks: ['JARVIS Gateway', 'Constitutional Router', 'Debate Engine', 'Rust Runtime'],
  Banterhearts: ['Inference API', 'Safety Research', 'Benchmarking', 'AutoOpt Agent'],
};
const FOOTNOTES: Record<string, string> = {
  Banterpacks: 'RLAIF self-improving loop · 3-stage tool approval',
  Banterhearts: '37-file evaluation framework · 20 monitoring modules · 12 security modules',
};
const GATEWAY_MODULES = ['Calendar', 'Inbox', 'Memory', 'Smart Home', 'Proactive', 'Tools', 'Voice'];
const DATA_FLOW = ['Ingest', 'Process', 'Publish', 'Serve'];
const CORE = ['Banterpacks', 'Banterhearts'];
const SUPPORTING = ['Chimera Multi-Agent', 'Chimeraforge', 'Chimeradroid', 'Echo', 'JARVIS Console', 'This Site'];
const ROWS = [...SUPPORTING, 'Project Wyvern', 'quantfit'];
const REPOSITORIES = [...CORE, ...ROWS];
// the page's own links at adc8433, each kept
const PAGE_LINKS = ['/tools/chimeraforge', '/tools/quantfit', '/show', '/show/streaming-ladder', '/show/zk-alignment-proof', '/show/bft-consensus', '/reports', '/episodes', '/about'];
// where a repository leads: the landing's destination for it, except the two CLIs, which keep their tool pages
const TOOL_PAGES: Record<string, { href: string; label: string }> = {
  Chimeraforge: { href: '/tools/chimeraforge', label: 'pip install chimeraforge' },
  quantfit: { href: '/tools/quantfit', label: 'pip install quantfit' },
};
const destinationOf = (name: string) =>
  TOOL_PAGES[name] ??
  (() => {
    const system = STAR_SYSTEMS.find((s) => s.name === name)!;
    return { href: system.href, label: system.ctaLabel };
  })();
// rendering the real archive takes seconds; the page only counts it
const ARCHIVED_EPISODES = 3;
vi.mock('@/lib/episodes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/episodes')>();
  const stub = { filesChanged: 1, linesAdded: 1, complexity: 1, readingTime: 1 } as Awaited<ReturnType<typeof actual.getAllEpisodes>>[number];
  return { ...actual, getAllEpisodes: async () => Array.from({ length: ARCHIVED_EPISODES }, () => stub) };
});
const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;

let element: ReactElement;
let page: HTMLElement;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
// an engine is an article; any other system a row that is one link
const articleFor = (name: string) => [...page.querySelectorAll('article, a.list-row')].find((a) => text(a.querySelector('h3') ?? a) === name);
const namesIn = (section: string) => [...page.querySelectorAll(`#${section} a.list-row h3`)].map(text);

beforeAll(async () => {
  element = await PlatformPage();
});
// testing-library unmounts after every test, so each test mounts its own
beforeEach(() => {
  page = render(element).container;
});

describe('platform head', () => {
  it('is an unboxed page head: eyebrow, one h1, the lede, and the key numbers in its stat row', () => {
    const h1s = page.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe('What Powers Chimeraforge');
    expect(text(page.querySelector('header')!)).toContain('Platform Architecture');
    const stats = page.querySelector('ul[aria-label="The platform in numbers"]')!;
    expect([...stats.querySelectorAll('li')].map(text)).toEqual(['9 repositories', '4 languages', `${MEASUREMENTS.SHORT} research measurements`]);
  });

  it('rises in the three head groups, the lede second, then the two core engines join the sequence', () => {
    const groups = [...page.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)];
    expect(groups.map((g) => g.style.getPropertyValue('--group'))).toEqual(['0', '1', '2']);
    expect(text(groups[1])).toMatch(/^Nine repositories/);
    expect(groups[2].querySelector('ul[aria-label="The platform in numbers"]')).not.toBeNull();
    const items = [...page.querySelectorAll<HTMLElement>(`[${ENTRANCE_ITEM_ATTRIBUTE}]`)];
    expect(items.map((item) => text(item.querySelector('h3')!))).toEqual(CORE);
    for (const item of items) expect(item.style.getPropertyValue('--entrance-items-after')).toBe('3');
  });

  it('keeps every sentence of the owner copy, and every subsystem, module and step name', () => {
    const all = text(page);
    for (const sentence of OWNER_PROSE) expect(all, sentence).toContain(sentence);
    for (const label of [...Object.values(SUBSYSTEMS).flat(), ...GATEWAY_MODULES, ...DATA_FLOW]) expect(all, label).toContain(label);
    expect(all).toContain(`${ARCHIVED_EPISODES} archived episodes documenting commits, decisions, and telemetry data points.`);
  });
});

describe('core engines', () => {
  it('gives each engine one large drawing and no card: the plate, then its name, stack, story and subsystems', () => {
    const engines = [...page.querySelectorAll('#core-engines article')];
    expect(engines.map((a) => text(a.querySelector('h3')!))).toEqual(CORE);
    for (const engine of engines) {
      const name = text(engine.querySelector('h3')!);
      expect(engine.querySelectorAll('.repo-plate'), name).toHaveLength(1);
      expect(engine.querySelector('.repo-plate svg.rv'), name).not.toBeNull();
      expect(engine.firstElementChild?.classList.contains('repo-plate'), `${name} opens on its drawing`).toBe(true);
      expect(engine.closest('.card-surface, .card-depth'), name).toBeNull();
      expect(engine.querySelector('.card-surface'), name).toBeNull();
    }
  });

  it('lists the subsystems as a hairline definition list, name and what it does, with no icons and no boxes', () => {
    for (const name of CORE) {
      const list = articleFor(name)!.querySelector('dl')!;
      expect(list, name).not.toBeNull();
      const rows = [...list.children];
      expect(rows.map((row) => text(row.querySelector('dt')!))).toEqual(SUBSYSTEMS[name]);
      for (const row of rows) {
        expect(row.classList.contains('list-row')).toBe(true);
        expect(text(row.querySelector('dd')!).length).toBeGreaterThan(0);
      }
      expect(list.querySelector('svg'), `${name}: no icon per subsystem`).toBeNull();
      const classes = [list, ...list.querySelectorAll('*')].flatMap((el) => [...el.classList]);
      expect(classes.filter((c) => BORDER_WIDTH.test(c) || /^bg-/.test(c) || /^rounded/.test(c) || c === 'card-surface')).toEqual([]);
    }
  });

  it('closes each engine on its footnote as plain text, and a quiet link to where the landing sends it', () => {
    for (const name of CORE) {
      const engine = articleFor(name)!;
      const { href, label } = destinationOf(name);
      const link = engine.querySelector(`a[href="${href}"]`)!;
      expect(link, name).not.toBeNull();
      expect(text(link)).toBe(label);
      expect(link.classList.contains('row-link'), name).toBe(true);
      // no mono caps: the footnote reads at the label size, in sentence case
      const footnote = [...engine.querySelectorAll('p')].find((p) => text(p) === FOOTNOTES[name])!;
      expect(footnote, name).toBeDefined();
      expect(footnote.className).not.toMatch(/label-12-mono|uppercase/);
    }
  });
});

describe('gateway', () => {
  it('replaces the icon strip with a figure of a chat turn’s path, from the owner’s own sentences', () => {
    const gateway = page.querySelector('#jarvis-gateway')!;
    const figure = gateway.querySelector('figure.flow')!;
    expect(figure).not.toBeNull();
    const steps = [...figure.querySelectorAll('.flow-label')].map(text);
    expect(steps).toEqual(['Chat turn', 'Constitutional router', 'Propose', 'Approve', 'Execute']);
    expect([...figure.querySelectorAll('.flow-step')].map((s) => s.getAttribute('data-kind'))).toEqual(['io', 'step', 'step', 'step', 'result']);
    expect(gateway.querySelectorAll('svg.lucide, svg[class*="lucide"]'), 'no icon strip').toHaveLength(0);
  });

  it('names the seven modules in one line under the figure', () => {
    const modules = page.querySelector('#jarvis-gateway ul[aria-label="Gateway modules"]')!;
    expect([...modules.querySelectorAll('li')].map(text)).toEqual(GATEWAY_MODULES);
  });
});

describe('systems', () => {
  it('draws every repository from the archive generator, seeded by its name', () => {
    const drawings = REPOSITORIES.map((name) => {
      const article = articleFor(name);
      expect(article, name).toBeDefined();
      const svg = article!.querySelector('svg.rv');
      expect(svg, name).not.toBeNull();
      return `${svg!.getAttribute('data-family')}|${svg!.innerHTML}`;
    });
    expect(new Set(drawings).size).toBe(REPOSITORIES.length);
    // the page names a family per repository, so they do not all draw one default
    expect(new Set(drawings.map((d) => d.split('|')[0])).size).toBeGreaterThanOrEqual(4);
  });

  it('sets every other system as a hairline row with a small drawing, the whole row one link to where the landing sends it', () => {
    for (const name of ROWS) {
      const row = articleFor(name)!;
      expect(row.tagName, name).toBe('A');
      // the ListRow hairline, and the card hover: its drawing and its call to action turn ember
      expect(row.classList.contains('list-row'), name).toBe(true);
      expect(row.classList.contains('card-depth'), name).toBe(true);
      expect(row.querySelector('.card-surface'), name).toBeNull();
      expect(row.querySelectorAll('.repo-plate'), name).toHaveLength(1);
      const expected = destinationOf(name);
      expect(row.getAttribute('href'), name).toBe(expected.href);
      expect(text(row.querySelector('.card-cta')!), name).toBe(expected.label);
      if (/^https?:/.test(expected.href)) {
        expect(row.getAttribute('target'), name).toBe('_blank');
        expect(row.getAttribute('rel'), name).toBe('noopener noreferrer');
      }
    }
  });

  // R4 design re-judge: Project Wyvern, still in development, and the
  // standalone CLI keep their own sections
  it('keeps the six supporting systems together, and Project Wyvern and quantfit in their own sections', () => {
    expect(namesIn('supporting-systems')).toEqual(SUPPORTING);
    expect(namesIn('in-development')).toEqual(['Project Wyvern']);
    expect(namesIn('standalone-tools')).toEqual(['quantfit']);
  });

  it('sets the data flow in a hairline grid, never boxes', () => {
    const grid = page.querySelector('#data-flow .hairline-grid')!;
    expect([...grid.children].map((cell) => text(cell.querySelector('h3')!))).toEqual(DATA_FLOW);
    for (const cell of grid.children) {
      const classes = [...cell.querySelectorAll('*'), cell].flatMap((el) => [...el.classList]);
      expect(classes.filter((c) => BORDER_WIDTH.test(c) || /^bg-/.test(c) || /^rounded/.test(c) || c === 'card-surface')).toEqual([]);
    }
  });

  it('keeps the page links', () => {
    const hrefs = [...page.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    for (const href of PAGE_LINKS) expect(hrefs, href).toContain(href);
  });

  // perf re-judge: plain links in view at load prefetched their pages
  it('prefetches every in-site link on intent, not on sight', () => {
    const internal = [...page.querySelectorAll('a[href^="/"]')];
    expect(internal.length).toBeGreaterThanOrEqual(PAGE_LINKS.length);
    for (const link of internal) expect(link.getAttribute('data-prefetch'), link.getAttribute('href')!).toBe('off');
  });

  it('spends ember only on the current page and on hover: the links and step numbers are neutral at rest', () => {
    // no element is painted ember at rest (hover:/group-hover: variants are fine)
    const ember = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => c === 'text-primary' || c.startsWith('text-primary/')));
    expect(ember.map((el) => text(el).slice(0, 30))).toEqual([]);
    for (const name of ROWS) {
      const cta = articleFor(name)!.querySelector('.card-cta')!;
      expect(cta.classList.contains('text-foreground/80'), name).toBe(true);
    }
  });

  it('closes on one quiet onward line instead of a row of link cards', () => {
    const onward = page.querySelector('nav[aria-label="Onward"]')!;
    expect([...onward.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/reports', '/episodes', '/about']);
    expect(onward.querySelector('.card-surface, .card-depth')).toBeNull();
  });
});

describe('platform page', () => {
  it('draws no card surfaces: the only plates are the drawings and the one figure', () => {
    expect(page.querySelectorAll('.card-surface')).toHaveLength(0);
    expect(page.querySelectorAll('.repo-plate')).toHaveLength(REPOSITORIES.length);
    expect(page.querySelectorAll('figure')).toHaveLength(1);
  });

  it('draws no boxed panels and no borders', () => {
    expect(page.innerHTML).not.toMatch(/signal-(panel|pill|divider)|glass-ultra|backdrop/);
    const bordered = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)));
    expect(bordered).toEqual([]);
  });

  it('reveals the drawings, rows and the figure as they scroll in', () => {
    expect(page.querySelectorAll('[data-reveal]').length).toBeGreaterThanOrEqual(REPOSITORIES.length + 1);
  });
});
