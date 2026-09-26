import type { ComponentProps, ReactElement } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProvenanceChain } from '../ProvenanceChain';
import { StreamingLadder } from '../StreamingLadder';
import { ZkAlignmentProof } from '../ZkAlignmentProof';
import ladderData from '@/data/scenes/streaming-ladder.json';
import provenanceData from '@/data/scenes/provenance-chain.json';
import zkData from '@/data/scenes/zk-alignment-proof.json';

// framer reads the motion preference once and caches it for the module; the
// server has none. This stands in for both sides of a hydration.
const { preference } = vi.hoisted(() => ({ preference: { reduced: null as boolean | null } }));
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => preference.reduced,
}));

const provenance = () => <ProvenanceChain data={provenanceData as unknown as ComponentProps<typeof ProvenanceChain>['data']} />;
const ladder = () => <StreamingLadder data={ladderData as unknown as ComponentProps<typeof StreamingLadder>['data']} />;
const zk = () => <ZkAlignmentProof data={zkData as unknown as ComponentProps<typeof ZkAlignmentProof>['data']} />;

const TABBABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

beforeEach(() => {
  preference.reduced = true;
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
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'matchMedia');
  document.body.innerHTML = '';
});

// re-judge P1-9: `inert: ''` is false to React 19, so hidden cards kept
// eight focusable buttons (axe aria-hidden-focus). A card the walkthrough
// has not reached now shows only "pending", so it holds nothing focusable;
// it must still carry inert, in case a control ever lands in it again.
describe('Provenance chain', () => {
  it('makes every card it hides inert, with nothing inside to take focus', () => {
    const { container } = render(provenance());
    const hidden = [...container.querySelectorAll('[aria-hidden="true"][data-phase]')];
    expect(hidden.length).toBeGreaterThan(0);
    for (const card of hidden) {
      const label = card.textContent?.slice(0, 40);
      expect(card.hasAttribute('inert'), label).toBe(true);
      expect(card.querySelector(TABBABLE), label).toBeNull();
    }
  });
});

// re-judge P1-10: role="grid" held gridcells with no rows (axe
// aria-required-children and aria-required-parent, critical)
describe('ZK alignment proof', () => {
  it('lists its per-bit cells, each still named, with no grid roles left', () => {
    const { container } = render(zk());
    expect(container.querySelectorAll('[role="grid"], [role="gridcell"], [role="row"]')).toHaveLength(0);
    const lists = [...container.querySelectorAll('[role="list"][aria-label]')];
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) {
      const items = [...list.children];
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.getAttribute('role')).toBe('listitem');
        expect(item.getAttribute('aria-label')).toMatch(/^bit \d+/);
      }
    }
  });
});

// re-judge P2-25: React #418 on /show/streaming-ladder under reduced motion
// and on /show/zk-alignment-proof under a de-DE locale
describe('hydration', () => {
  async function hydrationErrors(scene: () => ReactElement, onClient: () => void): Promise<string[]> {
    preference.reduced = null;
    const host = document.createElement('div');
    host.innerHTML = renderToString(scene());
    document.body.append(host);

    onClient();
    const errors: string[] = [];
    const logged = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    await act(async () => {
      hydrateRoot(host, scene(), { onRecoverableError: (error) => errors.push(`recoverable: ${String(error)}`) });
    });
    logged.mockRestore();
    return errors.filter((message) => /hydrat|did not match|#418/i.test(message));
  }

  it('hydrates the streaming ladder cleanly for a visitor who reduces motion', async () => {
    const errors = await hydrationErrors(ladder, () => {
      preference.reduced = true;
    });
    expect(errors).toEqual([]);
  });

  it('hydrates the ZK proof cleanly in a locale that groups digits differently', async () => {
    const toLocaleString = Number.prototype.toLocaleString;
    const errors = await hydrationErrors(zk, () => {
      preference.reduced = true;
      // a de-DE visitor: the default locale groups with a full stop
      vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (this: number, locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
        return toLocaleString.call(this, locales ?? 'de-DE', options);
      });
    });
    expect(errors).toEqual([]);
  });
});
