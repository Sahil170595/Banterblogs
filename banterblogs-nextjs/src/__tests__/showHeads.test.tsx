import type { ComponentType } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import BftConsensusPage from '@/app/show/bft-consensus/page';
import CognitiveAgentsPage from '@/app/show/cognitive-agents/page';
import ProvenanceChainPage from '@/app/show/provenance-chain/page';
import StreamingLadderPage from '@/app/show/streaming-ladder/page';
import ZkAlignmentProofPage from '@/app/show/zk-alignment-proof/page';
import { contrast, over, token, type Rgb } from '@/test/contrast';

// re-judge P1-11: the scene heads' comparison labels ran 9-11px at /70-/80
// of their token ("staged checks per step" 4.09:1, "the LLM's" 3.27:1).
// Every piece of text in a scene head is now 12px or larger and clears
// WCAG AA against the surface it sits on, through any faded card.

const PAGES: Array<[string, ComponentType]> = [
  ['streaming-ladder', StreamingLadderPage],
  ['bft-consensus', BftConsensusPage],
  ['cognitive-agents', CognitiveAgentsPage],
  ['provenance-chain', ProvenanceChainPage],
  ['zk-alignment-proof', ZkAlignmentProofPage],
];

const MIN_TEXT_PX = 12;
const LARGE_TEXT_PX = 24;
const AA_TEXT = 4.5;
const AA_LARGE = 3;
// Tailwind's named sizes, px
const NAMED_SIZE: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72 };
const TEXT_TOKENS = ['muted-foreground', 'foreground', 'primary'];

const classesOf = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
const ancestry = (el: Element, root: Element) => {
  const chain: Element[] = [];
  for (let at: Element | null = el; at && root.contains(at); at = at.parentElement) chain.push(at);
  return chain;
};

// every size a class list sets, at its base and at each breakpoint
function sizesIn(classes: string[]): number[] {
  return classes.flatMap((c) => {
    const bare = c.replace(/^(?:[a-z]+:)+/, '');
    const arbitrary = /^text-\[(\d+)px\]$/.exec(bare);
    if (arbitrary) return [Number(arbitrary[1])];
    const named = /^text-(xs|sm|base|lg|xl|[2-7]xl)$/.exec(bare);
    return named ? [NAMED_SIZE[named[1]]] : [];
  });
}

function baseSize(chain: Element[]): number {
  for (const el of chain) {
    const base = classesOf(el).filter((c) => !c.includes(':'));
    const sizes = sizesIn(base);
    if (sizes.length) return sizes[0];
  }
  return NAMED_SIZE.base;
}

function colourOf(chain: Element[]): { rgb: Rgb; alpha: number } | null {
  for (const el of chain) {
    for (const c of classesOf(el)) {
      const match = new RegExp(`^text-(${TEXT_TOKENS.join('|')})(?:/(\\d+))?$`).exec(c);
      if (match) return { rgb: token(match[1]), alpha: match[2] ? Number(match[2]) / 100 : 1 };
    }
  }
  return null;
}

function surfaceOf(chain: Element[]): Rgb {
  const page = token('background');
  for (const el of chain) {
    for (const c of classesOf(el)) {
      // a gradient card: its brightest stop
      const tint = /^from-primary\/\[(0?\.\d+)\]$/.exec(c);
      if (tint) return over(token('primary'), Number(tint[1]), page);
      const card = /^bg-card\/(\d+)$/.exec(c);
      if (card) return over(token('card'), Number(card[1]) / 100, page);
    }
  }
  return page;
}

const opacityOf = (chain: Element[]) =>
  chain.reduce((product, el) => {
    const faded = classesOf(el).map((c) => /^opacity-(\d+)$/.exec(c)).find(Boolean);
    return faded ? product * (Number(faded[1]) / 100) : product;
  }, 1);

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

describe.each(PAGES)('/show/%s head', (_slug, Page) => {
  it('sets every piece of text at 12px or larger, and at AA contrast on its surface', () => {
    const head = render(<Page />).container.querySelector('header')!;
    expect(head).not.toBeNull();
    const failures: string[] = [];
    const texts = [...head.querySelectorAll('*')].filter((el) =>
      [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
    );
    expect(texts.length).toBeGreaterThan(5);
    for (const el of texts) {
      const chain = ancestry(el, head);
      const label = (el.textContent ?? '').trim().slice(0, 32);
      const smallest = Math.min(...chain.flatMap((a) => sizesIn(classesOf(a))).concat(NAMED_SIZE.base));
      if (smallest < MIN_TEXT_PX && sizesIn(classesOf(el)).length) failures.push(`${label}: ${smallest}px`);
      const colour = colourOf(chain);
      if (!colour) continue;
      const surface = surfaceOf(chain);
      const ratio = contrast(over(colour.rgb, colour.alpha * opacityOf(chain), surface), surface);
      const needed = baseSize(chain) >= LARGE_TEXT_PX ? AA_LARGE : AA_TEXT;
      if (ratio < needed) failures.push(`${label}: ${ratio.toFixed(2)}:1 < ${needed}`);
    }
    expect(failures).toEqual([]);
  });
});
