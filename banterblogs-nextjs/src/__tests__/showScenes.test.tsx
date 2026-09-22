import type { ComponentType } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import BftConsensusPage from '@/app/show/bft-consensus/page';
import CognitiveAgentsPage from '@/app/show/cognitive-agents/page';
import ProvenanceChainPage from '@/app/show/provenance-chain/page';
import StreamingLadderPage from '@/app/show/streaming-ladder/page';
import ZkAlignmentProofPage from '@/app/show/zk-alignment-proof/page';
import { contrast, over, token, type Rgb } from '@/test/contrast';

// Final WIG re-judge P1-11 (carried): the sweep of the scene bodies. At rest,
// the beat label beside the step counter and Provenance's "Merkle root" were
// text-primary/80 (4.01:1), the ZK bit indices 7-8px text-muted-foreground/70
// (3.4:1), and BFT's not-yet-reached rows faded to 1.2-2.8:1. Every beat of
// every scene is swept here from the tokens: text clears AA on the surface it
// sits on, and text a scene dims to mark a step not reached yet clears 3:1.
// The sweep sees opacity set by class, or inline on the first render
// (framer-motion's initial={false}); a fade framer-motion animates in later
// frames (the ladder's, agents' and chain's cards not yet revealed) is not
// rendered in jsdom, so it is not scored here.

const PAGES: Array<[string, ComponentType]> = [
  ['streaming-ladder', StreamingLadderPage],
  ['bft-consensus', BftConsensusPage],
  ['cognitive-agents', CognitiveAgentsPage],
  ['provenance-chain', ProvenanceChainPage],
  ['zk-alignment-proof', ZkAlignmentProofPage],
];

const AA_TEXT = 4.5;
const AA_LARGE = 3;
// the bar for text a scene dims to mark a step it has not reached
const DIMMED_STATE = 3;
const LARGE_TEXT_PX = 24;
const MIN_INDEX_PX = 10;
// options walked per selector; every scene has fewer
const MAX_STATES = 40;
const NAMED_SIZE: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72 };
const TEXT_TOKENS = ['muted-foreground', 'foreground', 'primary', 'accent', 'status-green', 'status-amber', 'status-blue'];
const SURFACE_TOKENS = ['card', 'background', 'muted', 'accent', 'primary', 'secondary'];

const classesOf = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
const base = (el: Element) => classesOf(el).filter((c) => !c.includes(':'));
const alphaOf = (value: string | undefined) => (value === undefined ? 1 : value.startsWith('[') ? Number(value.slice(1, -1)) : Number(value) / 100);

function chainOf(el: Element, root: Element): Element[] {
  const chain: Element[] = [];
  for (let at: Element | null = el; at && root.contains(at); at = at.parentElement) chain.push(at);
  return chain;
}

function sizeOf(chain: Element[]): number {
  for (const el of chain) {
    for (const c of base(el)) {
      const arbitrary = /^text-\[(\d+(?:\.\d+)?)px\]$/.exec(c);
      if (arbitrary) return Number(arbitrary[1]);
      const named = /^text-(xs|sm|base|lg|xl|[2-7]xl)$/.exec(c);
      if (named) return NAMED_SIZE[named[1]];
    }
  }
  return NAMED_SIZE.base;
}

function colourOf(chain: Element[]): { rgb: Rgb; alpha: number } | null {
  const pattern = new RegExp(`^text-(${TEXT_TOKENS.join('|')})(?:/(\\d+|\\[[\\d.]+\\]))?$`);
  for (const el of chain) {
    for (const c of base(el)) {
      const match = pattern.exec(c);
      if (match) return { rgb: token(match[1]), alpha: alphaOf(match[2]) };
    }
  }
  return null;
}

// the page, then every surface from the outermost in
function surfaceOf(chain: Element[]): Rgb {
  const pattern = new RegExp(`^bg-(${SURFACE_TOKENS.join('|')})(?:/(\\d+|\\[[\\d.]+\\]))?$`);
  let surface = token('background');
  for (const el of [...chain].reverse()) {
    if (el.classList.contains('signal-panel-strong')) surface = over(token('card'), 0.95, surface);
    for (const c of base(el)) {
      const match = pattern.exec(c);
      if (match) surface = over(token(match[1]), alphaOf(match[2]), surface);
    }
  }
  return surface;
}

function opacityOf(chain: Element[]): number {
  return chain.reduce((product, el) => {
    const inline = (el as HTMLElement).style?.opacity;
    if (inline) return product * Number(inline);
    const faded = base(el).map((c) => /^opacity-(\d+)$/.exec(c)).find(Boolean);
    return faded ? product * (Number(faded[1]) / 100) : product;
  }, 1);
}

function sweep(root: Element): string[] {
  const failures: string[] = [];
  const texts = [...root.querySelectorAll('*')].filter(
    (el) =>
      !el.closest('header, .sr-only, [hidden]') &&
      [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
  );
  for (const el of texts) {
    const chain = chainOf(el, root);
    const colour = colourOf(chain);
    if (!colour) continue;
    const surface = surfaceOf(chain);
    const opacity = opacityOf(chain);
    // a faded element composites its text and surfaces together over what
    // lies outside it: the surfaces above its outermost faded ancestor
    const outermostFaded = chain.map((a) => opacityOf([a]) < 1).lastIndexOf(true);
    const beneath = outermostFaded < 0 ? surface : surfaceOf(chain.slice(outermostFaded + 1));
    const text = over(over(colour.rgb, colour.alpha, surface), opacity, beneath);
    const backdrop = over(surface, opacity, beneath);
    const ratio = contrast(text, backdrop);
    const needed = opacity < 1 ? DIMMED_STATE : sizeOf(chain) >= LARGE_TEXT_PX ? AA_LARGE : AA_TEXT;
    if (ratio < needed) failures.push(`"${(el.textContent ?? '').trim().slice(0, 32)}" ${ratio.toFixed(2)}:1 < ${needed}`);
  }
  return failures;
}

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

// every state a scene's selectors reach: each option of its first radio
// group (the step or record), and under each, every option of the others
// (the beats)
function everyState(container: Element, visit: () => void) {
  const radios = (group: number) =>
    [...container.querySelectorAll('[role="radiogroup"]')][group]?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [];
  const groups = () => container.querySelectorAll('[role="radiogroup"]').length;
  visit();
  for (let outer = 0; outer < Math.min(radios(0).length, MAX_STATES); outer++) {
    act(() => radios(0)[outer].click());
    visit();
    for (let group = 1; group < groups(); group++) {
      for (let inner = 0; inner < Math.min(radios(group).length, MAX_STATES); inner++) {
        act(() => radios(group)[inner].click());
        visit();
      }
    }
  }
}

describe.each(PAGES)('/show/%s body', (_slug, Page) => {
  it('clears AA in every state, and 3:1 where it dims a step not reached yet', () => {
    const { container } = render(<Page />);
    const failures = new Set<string>();
    everyState(container, () => sweep(container).forEach((failure) => failures.add(failure)));
    expect([...failures]).toEqual([]);
  });
});

describe('ZK bit strips', () => {
  it('set each bit index at 10px or larger', () => {
    const { container } = render(<ZkAlignmentProofPage />);
    const indices = [...container.querySelectorAll('[role="listitem"] span')].filter((span) => span.querySelector('sup, sub'));
    expect(indices.length).toBeGreaterThan(0);
    for (const index of indices) {
      expect(sizeOf(chainOf(index, container)), index.textContent ?? '').toBeGreaterThanOrEqual(MIN_INDEX_PX);
      // the digits sit in the sup or sub: it is set at the index's own size
      const digits = index.querySelector('sup, sub')!;
      expect(classesOf(digits), index.textContent ?? '').toContain(`text-[${MIN_INDEX_PX}px]`);
    }
  });
});
