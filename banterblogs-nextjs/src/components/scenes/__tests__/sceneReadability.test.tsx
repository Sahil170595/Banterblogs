import fs from 'node:fs';
import path from 'node:path';
import type { ComponentProps, ReactElement } from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BEAT_BAR_GRID, beatBarColumns, CLEAR_OF_STICKY_NARRATION, STICKY_NARRATION } from '../_shared';
import { BftConsensus } from '../BftConsensus';
import { CognitiveAgents } from '../CognitiveAgents';
import { ProvenanceChain } from '../ProvenanceChain';
import { classifyTier, StreamingLadder } from '../StreamingLadder';
import { ZkAlignmentProof } from '../ZkAlignmentProof';
import bftData from '@/data/scenes/bft-consensus.json';
import cognitiveData from '@/data/scenes/cognitive-agents.json';
import ladderData from '@/data/scenes/streaming-ladder.json';
import provenanceData from '@/data/scenes/provenance-chain.json';
import zkData from '@/data/scenes/zk-alignment-proof.json';

// the site's smallest read text (galactic/__tests__/heroType.test.tsx)
const FLOOR_PX = 12;
const REM_PX = 16;
const SCENES = path.join(process.cwd(), 'src', 'components', 'scenes');
const SCENE_FILES = ['StreamingLadder.tsx', 'BftConsensus.tsx', 'CognitiveAgents.tsx', 'ProvenanceChain.tsx', 'ZkAlignmentProof.tsx'];
// the site header's z-index (Header.tsx: z-50); a pinned panel stays under it
const HEADER_Z = 50;
const TABBABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

type BftData = ComponentProps<typeof BftConsensus>['data'];
type BftRecord = BftData['records'][number];
const bft = bftData as unknown as BftData;

const scenes: Record<string, () => ReactElement> = {
  'streaming-ladder': () => <StreamingLadder data={ladderData as unknown as ComponentProps<typeof StreamingLadder>['data']} />,
  'bft-consensus': () => <BftConsensus data={bft} />,
  'cognitive-agents': () => <CognitiveAgents data={cognitiveData as unknown as ComponentProps<typeof CognitiveAgents>['data']} />,
  'provenance-chain': () => <ProvenanceChain data={provenanceData as unknown as ComponentProps<typeof ProvenanceChain>['data']} />,
  'zk-alignment-proof': () => <ZkAlignmentProof data={zkData as unknown as ComponentProps<typeof ZkAlignmentProof>['data']} />,
};

// Reduced motion: no scene autoplays, so only the clicks under test move a beat.
beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'matchMedia');
});

const classes = (el: Element | null | undefined) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
const toPx = (n: string, unit: string) => Number(n) * (unit === 'rem' ? REM_PX : 1);

describe('scene reading floor', () => {
  it.each(SCENE_FILES)(`sets every arbitrary text size in %s at ${FLOOR_PX}px or more`, (file) => {
    const source = fs.readFileSync(path.join(SCENES, file), 'utf8');
    const small = [...source.matchAll(/text-\[([\d.]+)(px|rem)\]/g)].filter(([, n, unit]) => toPx(n, unit) < FLOOR_PX).map(([c]) => c);
    expect(small).toEqual([]);
  });

  // a bare <sup> or <sub> renders at `smaller` (~83%), under the floor
  it.each(SCENE_FILES)(`sizes every superscript and subscript in %s at ${FLOOR_PX}px or more`, (file) => {
    const source = fs.readFileSync(path.join(SCENES, file), 'utf8');
    for (const [tag] of source.matchAll(/<su[pb]\b[^>]*>/g)) {
      const size = /text-\[([\d.]+)(px|rem)\]/.exec(tag);
      expect(size, tag).not.toBeNull();
      expect(toPx(size![1], size![2]), tag).toBeGreaterThanOrEqual(FLOOR_PX);
    }
  });

  it('wraps each ZK per-bit strip onto two rows below md, so its cells hold 12px labels on a phone', () => {
    const { container } = render(scenes['zk-alignment-proof']());
    // the last beat, where every zone and its strip is revealed
    const beats = screen.getAllByRole('button', { name: /^beat \d+ of \d+$/ });
    act(() => beats[beats.length - 1].click());
    const strips = [...container.querySelectorAll<HTMLElement>('[role="list"][aria-label^="Per-bit"]')];
    expect(strips).toHaveLength(3);
    for (const strip of strips) {
      const bits = strip.children.length;
      expect(strip.style.getPropertyValue('--bit-cols'), strip.getAttribute('aria-label')!).toBe(String(bits));
      expect(strip.style.getPropertyValue('--bit-cols-narrow')).toBe(String(Math.ceil(bits / 2)));
      expect(classes(strip)).toContain('grid-cols-[repeat(var(--bit-cols-narrow),minmax(0,1fr))]');
      expect(classes(strip)).toContain('md:grid-cols-[repeat(var(--bit-cols),minmax(0,1fr))]');
      // no inline template left to override the narrow one
      expect(strip.style.gridTemplateColumns).toBe('');
    }
  });
});

describe('BFT pending phases', () => {
  const MATRIX = 'PBFT phase by replica matrix';
  const VIEW_CHANGE = 'View change votes by replica';
  const PHASES = ['pre_prepare', 'prepare', 'commit'] as const;
  const PHASE_NAME = { pre_prepare: 'Pre-prepare', prepare: 'Prepare', commit: 'Commit', view_change: 'view change' } as const;
  const STATUS_LABEL: Record<string, string> = { sent: 'sent', rejected: 'refused', equivocation: 'byzantine', timeout: 'timeout' };
  const OUTCOME_WORDS = /sent|leader|refused|byzantine|timeout|quorum reached|more needed/i;

  const radios = (group: string) => within(screen.getByRole('radiogroup', { name: group })).getAllByRole('radio');
  const cellsOf = (grid: string) => within(screen.getByRole('grid', { name: grid })).getAllByRole('gridcell');
  const counter = (label: string) => screen.getByRole('group', { name: new RegExp(`^${label}:`) });
  const cellLabel = (cell: HTMLElement) => cell.getAttribute('aria-label')!.split(': ')[1];

  // today's final cell: its event's status, the prepare leader's implicit vote, or nothing
  function finalLabel(record: BftRecord, replica: string, phase: keyof typeof PHASE_NAME): string {
    const event = record.matrix[replica]?.[phase] ?? null;
    if (event) return STATUS_LABEL[event.status] ?? event.status;
    const leader = phase === 'view_change' ? record.leader_after : record.outcome.view_changed ? record.leader_after : record.leader;
    return phase === 'prepare' && replica === leader ? 'leader' : '—';
  }

  function openScenario(index: number) {
    act(() => radios('BFT scenarios')[index].click());
  }
  function jumpToBeat(index: number) {
    act(() => radios('Beat selector')[index].click());
  }

  it.each(bft.records.map((r, i) => [r.step_id, i] as const))('%s: shows no outcome at the first beat', (_id, index) => {
    render(scenes['bft-consensus']());
    openScenario(index);
    const record = bft.records[index];
    expect(record.beats[0].target_phase).toBeNull();

    const cells = cellsOf(MATRIX);
    expect(cells).toHaveLength(PHASES.length * bft.cluster.replicas.length);
    for (const cell of cells) {
      expect(cell.textContent, cell.getAttribute('aria-label')!).toBe('—');
      expect(cellLabel(cell)).toBe('pending');
      expect(cell.closest('[aria-hidden="true"]')).toBeNull();
    }
    if (record.outcome.view_changed) {
      for (const cell of cellsOf(VIEW_CHANGE)) {
        expect(cell.textContent).toBe('—');
        expect(cellLabel(cell)).toBe('pending');
      }
    }
    for (const label of ['prepare votes', 'commit votes']) {
      const group = counter(label);
      expect(group.textContent).not.toMatch(OUTCOME_WORDS);
      expect(group.textContent).toMatch(/pending/);
      expect(group.textContent).not.toMatch(/\d\s*\/\s*\d.*quorum/);
      expect(group.getAttribute('aria-label')).toBe(`${label}: pending`);
    }
  });

  it('reveals a phase, and its counter, only once the walkthrough reaches it', () => {
    render(scenes['bft-consensus']());
    const record = bft.records[0];
    const firstPrepare = record.beats.findIndex((b) => b.target_phase === 'prepare');
    jumpToBeat(firstPrepare);
    for (const cell of cellsOf(MATRIX)) {
      const [replica, phase] = cell.getAttribute('aria-label')!.split(': ')[0].split(' ');
      const id = PHASES.find((p) => PHASE_NAME[p] === phase)!;
      expect(cellLabel(cell), `${replica} ${phase}`).toBe(id === 'commit' ? 'pending' : finalLabel(record, replica, id));
    }
    expect(counter('prepare votes').textContent).toMatch(/quorum reached/);
    expect(counter('commit votes').textContent).not.toMatch(OUTCOME_WORDS);
  });

  it.each(bft.records.map((r, i) => [r.step_id, i] as const))('%s: renders the final state at the last beat', (_id, index) => {
    render(scenes['bft-consensus']());
    openScenario(index);
    const record = bft.records[index];
    jumpToBeat(record.beats.length - 1);

    for (const cell of cellsOf(MATRIX)) {
      const [replica, phase] = cell.getAttribute('aria-label')!.split(': ')[0].split(' ');
      const id = PHASES.find((p) => PHASE_NAME[p] === phase)!;
      expect(cellLabel(cell), `${replica} ${phase}`).toBe(finalLabel(record, replica, id));
      // soft hyphens let a long label break at a syllable in a narrow cell
      expect(cell.textContent!.replace(/­/g, '')).toBe(finalLabel(record, replica, id));
    }
    if (record.outcome.view_changed) {
      for (const cell of cellsOf(VIEW_CHANGE)) {
        const replica = cell.getAttribute('aria-label')!.split(' ')[0];
        expect(cellLabel(cell)).toBe(finalLabel(record, replica, 'view_change'));
      }
    }
    const counts = { 'prepare votes': record.counts.prepares_total, 'commit votes': record.counts.commits_total };
    for (const [label, count] of Object.entries(counts)) {
      const group = counter(label);
      expect(group.getAttribute('aria-label')).toBe(`${label}: ${count} of ${record.quorum_size} needed for quorum`);
      expect(group.textContent).toContain(`${count}/ ${record.quorum_size}`);
      expect(group.textContent).toContain(count >= record.quorum_size ? 'quorum reached' : `${record.quorum_size - count} more needed`);
    }
  });
});

describe('Cognitive task picker', () => {
  it('shows every scenario task in full, unclamped', () => {
    render(scenes['cognitive-agents']());
    const options = within(screen.getByRole('radiogroup', { name: 'Task scenarios' })).getAllByRole('radio');
    const records = (cognitiveData as { records: Array<{ task_description: string }> }).records;
    expect(options).toHaveLength(records.length);
    records.forEach(({ task_description }, i) => {
      const text = [...options[i].querySelectorAll('span')].find((span) => span.textContent === task_description);
      expect(text, task_description).toBeDefined();
      for (let el: Element | null = text!; el && el !== options[i].parentElement; el = el.parentElement) {
        expect(classes(el).filter((c) => /(?:^|:)(?:line-clamp-|truncate$|max-h-|overflow-hidden$)/.test(c)), task_description).toEqual([]);
      }
    });
  });
});

describe('narration beside its visual', () => {
  // the beat-driven visual each narration describes
  const VISUAL: Record<string, () => HTMLElement[]> = {
    'streaming-ladder': () => screen.getAllByText(ladderData.tiers[ladderData.tiers.length - 1].name, { exact: false }),
    'bft-consensus': () => [screen.getByRole('grid', { name: 'PBFT phase by replica matrix' })],
    'cognitive-agents': () => screen.getAllByText('Domain Expert'),
    'provenance-chain': () => screen.getAllByText('Merkle proof'),
  };
  const PICKER: Record<string, string> = {
    'streaming-ladder': 'Reasoning step scenarios',
    'bft-consensus': 'BFT scenarios',
    'cognitive-agents': 'Task scenarios',
    'provenance-chain': 'Event timeline',
  };

  it.each(Object.keys(VISUAL))('%s: sizes its narration for two lines, not three', (slug) => {
    render(scenes[slug]());
    const selector = screen.queryByRole('radiogroup', { name: 'Beat selector' }) ?? screen.getByRole('tablist', { name: 'Beat selector' });
    const panel = selector.parentElement!;
    const text = [...panel.children].find((child) => classes(child).includes('font-serif'))!;
    expect(text).toBeDefined();
    expect(classes(panel).filter((c) => /min-h-/.test(c))).toEqual([]);
    expect(classes(text).filter((c) => /min-h-/.test(c))).toEqual(['min-h-[2lh]']);
  });

  it.each(Object.keys(VISUAL))('%s: pins its narration on wide screens, under the header, inside the narrated section', (slug) => {
    const { container } = render(scenes[slug]());
    const pinned = [...container.querySelectorAll('*')].filter((el) => classes(el).includes('lg:sticky'));
    expect(pinned).toHaveLength(1);
    const [sticky] = pinned;
    expect(classes(sticky)).toEqual(expect.arrayContaining(STICKY_NARRATION.split(' ')));
    expect(sticky.querySelector('[aria-label="Beat selector"]')).not.toBeNull();
    // it unpins where the narrated visual ends, before the scene's picker
    const section = sticky.parentElement!;
    const visual = VISUAL[slug]();
    expect(visual.length).toBeGreaterThan(0);
    for (const el of visual) expect(section.contains(el)).toBe(true);
    expect(section.contains(screen.getByRole('radiogroup', { name: PICKER[slug] }))).toBe(false);
  });

  // WCAG 2.4.11: a control the pinned panel could cover is scrolled clear of it
  it.each(Object.keys(VISUAL))('%s: keeps focus clear of the pinned panel', (slug) => {
    const { container } = render(scenes[slug]());
    const dots = screen.queryAllByRole('radio', { name: /^Jump to beat/ });
    const tabs = dots.length ? dots : screen.getAllByRole('tab', { name: /^Jump to beat/ });
    act(() => tabs[tabs.length - 1].click());
    const sticky = [...container.querySelectorAll('*')].find((el) => classes(el).includes('lg:sticky'))!;
    const after = [...sticky.parentElement!.querySelectorAll<HTMLElement>(TABBABLE)].filter(
      // `hidden` (display: none) takes nothing out of the tab order it never joined
      (el) => !sticky.contains(el) && sticky.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING && !el.closest('[inert]') && !classes(el).includes('hidden'),
    );
    // the chain's hex rows each carry an expand button
    if (slug === 'provenance-chain') expect(after.length).toBeGreaterThan(0);
    for (const el of after) expect(classes(el), el.outerHTML.slice(0, 80)).toContain(CLEAR_OF_STICKY_NARRATION);
  });

  it('keeps the pinned panel under the header, on an opaque ground', () => {
    const z = Number(/lg:z-(\d+)/.exec(STICKY_NARRATION)?.[1]);
    expect(z).toBeGreaterThan(0);
    expect(z).toBeLessThan(HEADER_Z);
    expect(STICKY_NARRATION).toMatch(/lg:top-\[calc\(var\(--site-header-height\)\+[\d.]+rem\)\]/);
    expect(STICKY_NARRATION.split(' ')).toContain('lg:bg-background');
  });

  it('leaves the ZK scene unpinned', () => {
    const { container } = render(scenes['zk-alignment-proof']());
    expect([...container.querySelectorAll('*')].filter((el) => classes(el).includes('lg:sticky'))).toEqual([]);
  });
});

describe('Streaming pending tiers', () => {
  type LadderData = ComponentProps<typeof StreamingLadder>['data'];
  const ladder = ladderData as unknown as LadderData;
  const tierRow = (id: string) => document.querySelector<HTMLElement>(`[data-tier="${id}"]`)!;
  // what a reached tier shows: its verdict and the line under it
  const verdictOf = (record: LadderData['records'][number], tier: string) =>
    [classifyTier(record, tier).label, classifyTier(record, tier).sublabel].filter(Boolean);
  const openRecord = (index: number) =>
    act(() => within(screen.getByRole('radiogroup', { name: 'Reasoning step scenarios' })).getAllByRole('radio')[index].click());
  const beatTabs = () => within(screen.getByRole('tablist', { name: 'Beat selector' })).getAllByRole('tab');

  it.each(ladder.records.map((r, i) => [r.step_id, i] as const))('%s: shows no unreached tier\'s verdict at the first beat', (_id, index) => {
    render(scenes['streaming-ladder']());
    openRecord(index);
    const record = ladder.records[index];
    const reached = record.beats[0].target_tier;
    for (const tier of ladder.tiers) {
      const row = tierRow(tier.id);
      expect(row, tier.id).not.toBeNull();
      if (tier.id === reached) continue;
      for (const words of verdictOf(record, tier.id)) expect(row.textContent, `${tier.id}: "${words}"`).not.toContain(words);
      expect(row.textContent, tier.id).toMatch(/pending/);
    }
  });

  it.each(ladder.records.map((r, i) => [r.step_id, i] as const))('%s: shows every tier\'s verdict at the last beat', (_id, index) => {
    render(scenes['streaming-ladder']());
    openRecord(index);
    const record = ladder.records[index];
    act(() => beatTabs()[record.beats.length - 1].click());
    for (const tier of ladder.tiers) {
      const row = tierRow(tier.id);
      expect(row.textContent, tier.id).not.toMatch(/pending/);
      for (const words of verdictOf(record, tier.id)) expect(row.textContent, `${tier.id}: "${words}"`).toContain(words);
    }
  });
});

describe('beat bars', () => {
  // the most beats a record will carry once the scripts re-break (Provenance)
  const MOST_BEATS = 26;
  // the narrowest box a beat row gets in each band: a 320px phone, the md
  // two-column layout, the lg two-column layout (BFT, Provenance)
  const BANDS = { narrow: 248, mid: 420, wide: 660 } as const;
  const TARGET_PX = 24;

  it.each(Array.from({ length: 60 }, (_, i) => i + 1))('lays %i beats out in balanced rows, no orphan, every target 24px apart', (n) => {
    const vars = beatBarColumns(n) as Record<string, number>;
    for (const [band, width] of Object.entries(BANDS)) {
      const cols = vars[`--beat-cols-${band}`];
      const rows = Math.ceil(n / cols);
      const last = n - (rows - 1) * cols;
      expect(cols * rows, band).toBeGreaterThanOrEqual(n);
      // the last row is no more than one shorter per row above it, never a lone bar under a full row
      expect(cols - last, band).toBeLessThan(rows);
      if (cols > 1 && rows > 1) expect(last, band).toBeGreaterThan(1);
      expect(width / cols, band).toBeGreaterThanOrEqual(TARGET_PX);
    }
  });

  it(`puts ${MOST_BEATS} beats in one row on lg`, () => {
    expect((beatBarColumns(MOST_BEATS) as Record<string, number>)['--beat-cols-wide']).toBe(MOST_BEATS);
  });

  // a record stretched to the largest beat count coming
  function withBeats<T extends { records: Array<{ beats: unknown[] }> }>(data: T, n: number): T {
    const [first, ...rest] = data.records;
    const beats = Array.from({ length: n }, (_, i) => first.beats[i % first.beats.length]);
    return { ...data, records: [{ ...first, beats }, ...rest] };
  }
  const stretched: Record<string, () => ReactElement> = {
    'streaming-ladder': () => {
      const data = ladderData as unknown as ComponentProps<typeof StreamingLadder>['data'];
      // the scene opens on its own entry record; stretch that one
      return <StreamingLadder data={{ ...data, records: data.records.map((r) => withBeats({ records: [r] }, MOST_BEATS).records[0]) }} />;
    },
    'bft-consensus': () => <BftConsensus data={withBeats(bft, MOST_BEATS)} />,
    'cognitive-agents': () => (
      <CognitiveAgents data={withBeats(cognitiveData as unknown as ComponentProps<typeof CognitiveAgents>['data'], MOST_BEATS)} />
    ),
    'provenance-chain': () => (
      <ProvenanceChain data={withBeats(provenanceData as unknown as ComponentProps<typeof ProvenanceChain>['data'], MOST_BEATS)} />
    ),
  };

  it.each(Object.keys(stretched))(`%s: sets ${MOST_BEATS} beats on the shared balanced grid, each bar filling its column`, (slug) => {
    render(stretched[slug]());
    const selector = screen.queryByRole('radiogroup', { name: 'Beat selector' }) ?? screen.getByRole('tablist', { name: 'Beat selector' });
    const bars = [...selector.children] as HTMLElement[];
    expect(bars).toHaveLength(MOST_BEATS);
    expect(classes(selector)).toEqual(expect.arrayContaining(BEAT_BAR_GRID.split(' ')));
    for (const [name, value] of Object.entries(beatBarColumns(MOST_BEATS))) {
      expect(selector.style.getPropertyValue(name), name).toBe(String(value));
    }
    for (const bar of bars) {
      expect(classes(bar)).toContain('w-full');
      expect(classes(bar).filter((c) => /^(?:\w+:)?w-\d/.test(c))).toEqual([]);
      // at least 24px tall: h-6 (24px) or h-8 (32px)
      expect(classes(bar).some((c) => c === 'h-6' || c === 'h-8'), bar.outerHTML.slice(0, 60)).toBe(true);
    }
  });
});

// The visual shows only what the narration has reached: a card or zone no
// beat has reached yet keeps its name and what it is, and holds its outcome
// back as "pending".
describe('Provenance pending phase cards', () => {
  type ChainData = ComponentProps<typeof ProvenanceChain>['data'];
  type ChainRecord = ChainData['records'][number];
  const chain = provenanceData as unknown as ChainData;
  const PHASE_IDS = ['event', 'canonical', 'sign', 'chain', 'merkle', 'verify'] as const;
  const card = (phase: string) => document.querySelector<HTMLElement>(`[data-phase="${phase}"]`)!;
  const head = (hex: string) => hex.slice(0, 10);
  // what each card shows once reached
  function outcomeOf(record: ChainRecord, phase: (typeof PHASE_IDS)[number]): string[] {
    const { crypto, event, verification } = record;
    switch (phase) {
      case 'event':
        return [head(event.payload_hash_hex), String(event.timestamp_ms)];
      case 'canonical':
        return [head(crypto.canonical_bytes_preview_hex), `${crypto.canonical_bytes_len} bytes`];
      case 'sign':
        return [head(crypto.leaf_hash_hex), head(crypto.signature_hex), head(crypto.public_key_hex)];
      case 'chain':
        return [event.prev_event_hash_hex ? head(event.prev_event_hash_hex) : 'Genesis event'];
      case 'merkle':
        return crypto.merkle_proof.siblings_hex.map(head);
      case 'verify':
        return [
          verification.sig_verifies ? 'verifies ✓' : 'fails ✗',
          verification.all_pass ? 'All three checks pass' : 'The signature check fails',
        ];
    }
  }
  const openRecord = (index: number) =>
    act(() => within(screen.getByRole('radiogroup', { name: 'Event timeline' })).getAllByRole('radio')[index].click());
  const beatRadios = () => within(screen.getByRole('radiogroup', { name: 'Beat selector' })).getAllByRole('radio');

  it.each(chain.records.map((r, i) => [r.step_id, i] as const))("%s: shows no unreached card's outcome at the first beat", (_id, index) => {
    render(scenes['provenance-chain']());
    openRecord(index);
    const record = chain.records[index];
    expect(record.beats[0].target_phase).toBeNull();
    for (const phase of PHASE_IDS) {
      const el = card(phase);
      expect(el, phase).not.toBeNull();
      for (const words of outcomeOf(record, phase)) expect(el.textContent, `${phase}: "${words}"`).not.toContain(words);
      expect(el.textContent, phase).toMatch(/pending/);
    }
  });

  it.each(chain.records.map((r, i) => [r.step_id, i] as const))("%s: shows every card's outcome at the last beat", (_id, index) => {
    render(scenes['provenance-chain']());
    openRecord(index);
    const record = chain.records[index];
    act(() => beatRadios()[record.beats.length - 1].click());
    for (const phase of PHASE_IDS) {
      const el = card(phase);
      expect(el.textContent, phase).not.toMatch(/pending/);
      for (const words of outcomeOf(record, phase)) expect(el.textContent, `${phase}: "${words}"`).toContain(words);
    }
  });
});

describe('Cognitive pending agent cards', () => {
  type AgentsData = ComponentProps<typeof CognitiveAgents>['data'];
  type TaskRecord = AgentsData['records'][number];
  const agents = cognitiveData as unknown as AgentsData;
  // each card's name and role, which stay
  const ROLE: Record<string, [string, string]> = {
    analytical: ['Analytical', 'task decomposition'],
    creative: ['Creative', 'lateral signals'],
    adversarial: ['Adversarial', 'structural risk'],
    domain_expert: ['Domain Expert', 'multi-domain taxonomy'],
  };
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  function verdictOf(record: TaskRecord, agent: string): string[] {
    const v = record.verdicts;
    switch (agent) {
      case 'analytical':
        return [v.analytical.assessment, `conf · ${pct(v.analytical.confidence)}`];
      case 'creative':
        return [`bigrams · ${v.creative.bigram_count}`, `conf · ${pct(v.creative.confidence)}`];
      case 'adversarial':
        return [v.adversarial.recommendation, `risk · ${pct(v.adversarial.risk_score)}`, `conf · ${pct(v.adversarial.confidence)}`];
      default:
        return [v.domain_expert.detected_domain, `conf · ${pct(v.domain_expert.confidence)}`];
    }
  }
  const card = (agent: string) => document.querySelector<HTMLElement>(`[data-agent="${agent}"]`)!;
  const openRecord = (index: number) =>
    act(() => within(screen.getByRole('radiogroup', { name: 'Task scenarios' })).getAllByRole('radio')[index].click());
  const beatRadios = () => within(screen.getByRole('radiogroup', { name: 'Beat selector' })).getAllByRole('radio');

  it.each(agents.records.map((r, i) => [r.step_id, i] as const))("%s: shows only each card's name and role, pending, at the first beat", (_id, index) => {
    render(scenes['cognitive-agents']());
    openRecord(index);
    expect(agents.records[index].beats[0].target_agent).toBeNull();
    for (const [agent, [title, role]] of Object.entries(ROLE)) {
      expect(card(agent), agent).not.toBeNull();
      expect(card(agent).textContent, agent).toBe(`${title}${role}pending`);
      expect(card(agent).querySelector('[role="progressbar"]'), agent).toBeNull();
    }
    expect(screen.queryByText('Meta-controller')).toBeNull();
  });

  it.each(agents.records.map((r, i) => [r.step_id, i] as const))('%s: shows every verdict and the meta-controller at the last beat', (_id, index) => {
    render(scenes['cognitive-agents']());
    openRecord(index);
    const record = agents.records[index];
    act(() => beatRadios()[record.beats.length - 1].click());
    for (const agent of Object.keys(ROLE)) {
      expect(card(agent).textContent, agent).not.toMatch(/pending/);
      for (const words of verdictOf(record, agent)) expect(card(agent).textContent, `${agent}: "${words}"`).toContain(words);
    }
    expect(screen.getByText('Meta-controller')).toBeTruthy();
  });
});

describe('ZK pending zones', () => {
  type ZkData = ComponentProps<typeof ZkAlignmentProof>['data'];
  type ZkRecord = ZkData['records'][number];
  const zk = zkData as unknown as ZkData;
  const zone = (id: string) => document.querySelector<HTMLElement>(`[data-zone="${id}"]`)!;
  function outcomeOf(record: ZkRecord, id: 'construction' | 'verifier'): string[] {
    const refused = record.expected_outcome === 'creation_refused';
    if (id === 'construction') return refused ? ['Construction skipped'] : [record.range_proof!.value_commitment_hex.slice(0, 12)];
    if (refused) return ['Nothing reaches the verifier'];
    const failing = record.verifier_check.bit_checks.find((c) => !c.ok)?.bit_index ?? null;
    return failing === null ? ['✓', 'bits committed consistently'] : ['×', `short-circuited at bit ${failing}`];
  }
  const openRecord = (index: number) =>
    act(() => within(screen.getByRole('radiogroup', { name: 'Choose alignment-proof scenario' })).getAllByRole('radio')[index].click());
  const beatButtons = () => screen.getAllByRole('button', { name: /^beat \d+ of \d+$/ });

  it.each(zk.records.map((r, i) => [r.scenario_id, i] as const))("%s: shows no unreached zone's outcome at the first beat", (_id, index) => {
    render(scenes['zk-alignment-proof']());
    openRecord(index);
    const record = zk.records[index];
    expect(record.beats[0].target_phase).toBe('prover');
    for (const id of ['construction', 'verifier'] as const) {
      expect(zone(id), id).not.toBeNull();
      for (const words of outcomeOf(record, id)) expect(zone(id).textContent, `${id}: "${words}"`).not.toContain(words);
      expect(zone(id).textContent, id).toMatch(/pending/);
    }
    expect(zone('prover').textContent).not.toMatch(/pending/);
  });

  it.each(zk.records.map((r, i) => [r.scenario_id, i] as const))("%s: shows every zone's outcome at the last beat", (_id, index) => {
    render(scenes['zk-alignment-proof']());
    openRecord(index);
    const record = zk.records[index];
    act(() => beatButtons()[record.beats.length - 1].click());
    for (const id of ['construction', 'verifier'] as const) {
      expect(zone(id).textContent, id).not.toMatch(/pending/);
      for (const words of outcomeOf(record, id)) expect(zone(id).textContent, `${id}: "${words}"`).toContain(words);
    }
  });
});
