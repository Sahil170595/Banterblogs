import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformPage from '@/app/platform/page';
import { STAR_SYSTEMS } from '@/components/galactic/systems';
import { ENTRANCE_GROUP_CLASS, ENTRANCE_ITEM_ATTRIBUTE } from '@/components/motion/entrance';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { CHIMERAFORGE_TOOL, QUANTFIT_TOOL } from '@/lib/tools';

// /platform on the R3 primitives: an unboxed PageHeader with the key numbers
// in its stat row, each repository an interactive Card with its own drawing
// from the archive's visual generator, subsystems and the data flow as
// hairline grids rather than boxes inside boxes, reveals on every grid. The
// owner's copy survives sentence for sentence.

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
// every subsystem, gateway module and data-flow step name
const LABELS = [
  'JARVIS Gateway',
  'Constitutional Router',
  'Debate Engine',
  'Rust Runtime',
  'Inference API',
  'Safety Research',
  'Benchmarking',
  'AutoOpt Agent',
  'Calendar',
  'Inbox',
  'Memory',
  'Smart Home',
  'Proactive',
  'Tools',
  'Voice',
  'Ingest',
  'Process',
  'Publish',
  'Serve',
];
const CORE = ['Banterpacks', 'Banterhearts'];
const SUPPORTING = ['Chimera Multi-Agent', 'Chimeraforge', 'Chimeradroid', 'Echo', 'JARVIS Console', 'This Site', 'Project Wyvern'];
const REPOSITORIES = [...CORE, ...SUPPORTING, 'quantfit'];
// the page's own links at adc8433, each kept
const PAGE_LINKS = ['/tools/chimeraforge', '/tools/quantfit', '/show', '/show/streaming-ladder', '/show/zk-alignment-proof', '/show/bft-consensus', '/reports', '/episodes', '/about'];
// where a repository card leads: the landing's destination for it, except the two CLIs, whose cards keep their tool pages
const TOOL_PAGES: Record<string, { href: string; label: string }> = {
  Chimeraforge: { href: '/tools/chimeraforge', label: 'pip install chimeraforge' },
  quantfit: { href: '/tools/quantfit', label: 'pip install quantfit' },
};
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
const cardFor = (name: string) => [...page.querySelectorAll('article')].find((a) => text(a.querySelector('h3') ?? a) === name);

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

  it('keeps every sentence of the owner copy, and every label', () => {
    const all = text(page);
    for (const sentence of OWNER_PROSE) expect(all, sentence).toContain(sentence);
    for (const label of LABELS) expect(all, label).toContain(label);
    expect(all).toContain(`${ARCHIVED_EPISODES} archived episodes documenting commits, decisions, and telemetry data points.`);
  });
});

describe('repositories', () => {
  it('draws every repository as a card with its own picture from the archive generator, seeded by its name', () => {
    const drawings = REPOSITORIES.map((name) => {
      const card = cardFor(name);
      expect(card, name).toBeDefined();
      const svg = card!.querySelector('svg.rv');
      expect(svg, name).not.toBeNull();
      return `${svg!.getAttribute('data-family')}|${svg!.innerHTML}`;
    });
    expect(new Set(drawings).size).toBe(REPOSITORIES.length);
    // the page names a family per repository, so they do not all draw one default
    expect(new Set(drawings.map((d) => d.split('|')[0])).size).toBeGreaterThanOrEqual(4);
  });

  it('makes every repository an interactive card that leads where the landing sends it, or to its tool page', () => {
    for (const name of REPOSITORIES) {
      const card = cardFor(name)!;
      expect(card.classList.contains('card-depth'), name).toBe(true);
      const link = card.querySelector('a.card-link')!;
      const expected = TOOL_PAGES[name] ?? (() => {
        const system = STAR_SYSTEMS.find((s) => s.name === name)!;
        return { href: system.href, label: system.ctaLabel };
      })();
      expect(link.getAttribute('href'), name).toBe(expected.href);
      expect(text(link), name).toBe(expected.label);
      if (/^https?:/.test(expected.href)) expect(link.getAttribute('target'), name).toBe('_blank');
    }
  });

  it('sets subsystems, gateway modules and the data flow in hairline grids, never boxes inside boxes', () => {
    const grids = [...page.querySelectorAll('.hairline-grid')];
    expect(grids.length).toBeGreaterThanOrEqual(4);
    for (const grid of grids) {
      for (const cell of grid.children) {
        const classes = [...cell.querySelectorAll('*'), cell].flatMap((el) => [...el.classList]);
        expect(classes.filter((c) => BORDER_WIDTH.test(c) || /^bg-/.test(c) || /^rounded/.test(c) || c === 'card-surface')).toEqual([]);
      }
    }
    const core = cardFor('Banterpacks')!;
    expect(core.querySelectorAll('.hairline-grid > *')).toHaveLength(4);
  });

  it('keeps the page links', () => {
    const hrefs = [...page.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    for (const href of PAGE_LINKS) expect(hrefs, href).toContain(href);
  });

  // R4 design re-judge: seven supporting systems in three columns left the
  // last card alone on its row. Project Wyvern, still in development, takes
  // its own section, laid on its side as the standalone tool is.
  it('ends no grid on an orphan: the six supporting systems fill their rows, and Project Wyvern has its own section', () => {
    const supporting = [...page.querySelectorAll('#supporting-systems article')].map((a) => text(a.querySelector('h3')!));
    expect(supporting).toEqual(SUPPORTING.filter((name) => name !== 'Project Wyvern'));
    // two columns, then three: six fills both
    expect(supporting.length % 2).toBe(0);
    expect(supporting.length % 3).toBe(0);
    const development = page.querySelector('#in-development')!;
    expect([...development.querySelectorAll('article')].map((a) => text(a.querySelector('h3')!))).toEqual(['Project Wyvern']);
  });

  it('spends ember only on the current page and on hover: the repository links and step numbers are neutral', () => {
    // no element is painted ember at rest (hover:/group-hover: variants are fine)
    const ember = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => c === 'text-primary' || c.startsWith('text-primary/')));
    expect(ember.map((el) => text(el).slice(0, 30))).toEqual([]);
    for (const name of REPOSITORIES) {
      const cta = cardFor(name)!.querySelector('a.card-link')!.parentElement!;
      expect(cta.classList.contains('card-cta'), name).toBe(true);
      expect(cta.classList.contains('text-foreground/80'), name).toBe(true);
    }
  });

  it('closes on one quiet onward line instead of a row of link cards', () => {
    const onward = page.querySelector('nav[aria-label="Onward"]')!;
    expect([...onward.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/reports', '/episodes', '/about']);
    expect(onward.querySelector('.card-surface, .card-depth')).toBeNull();
    // every card left on the page is a repository with its picture
    expect([...page.querySelectorAll('.card-surface')].every((card) => card.querySelector('svg.rv'))).toBe(true);
  });
});

describe('platform page', () => {
  it('draws no boxed panels and no borders', () => {
    expect(page.innerHTML).not.toMatch(/signal-(panel|pill|divider)|glass-ultra|backdrop/);
    const bordered = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)));
    expect(bordered).toEqual([]);
  });

  it('reveals the grids as they scroll in', () => {
    expect(page.querySelectorAll('[data-reveal]').length).toBeGreaterThanOrEqual(REPOSITORIES.length + 3);
  });
});
