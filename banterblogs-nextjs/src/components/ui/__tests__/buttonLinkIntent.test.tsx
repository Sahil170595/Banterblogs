import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ButtonLink } from '../Button';
import { INTENT_DWELL_MS } from '../IntentLink';

// R5 (perf re-judge): a ButtonLink in view at load prefetched its page on
// sight. `intent` routes an in-site button through IntentLink, so it
// prefetches when the pointer rests on it, it takes focus or it is pressed.

// prefetch never reaches the DOM; surface it on the anchor
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ prefetch, children, onNavigate: _onNavigate, ...props }: { prefetch?: boolean | null; onNavigate?: unknown; children?: ReactNode }) =>
      createElement('a', { ...props, 'data-prefetch': prefetch === false ? 'off' : 'auto' }, children),
  };
});

afterEach(cleanup);

const link = (props: { href: string; intent?: boolean }) =>
  render(
    <ButtonLink variant="primary" {...props}>
      Papers
    </ButtonLink>,
  ).getByRole('link');

describe('ButtonLink with intent', () => {
  // R5 perf (P1-B): a pointer counts once it has rested for the dwell, so a
  // list scrolling under a resting cursor prefetches nothing
  it('does not prefetch an in-site page on sight, and does once the pointer rests on it', () => {
    vi.useFakeTimers();
    try {
      const anchor = link({ href: '/papers', intent: true });
      expect(anchor.dataset.prefetch).toBe('off');
      fireEvent.pointerEnter(anchor, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS));
      expect(anchor.dataset.prefetch).toBe('auto');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the pill: same classes as the on-sight button link', () => {
    const plain = link({ href: '/papers', intent: false }).className;
    cleanup();
    expect(link({ href: '/papers', intent: true }).className).toBe(plain);
  });

  // R5 perf (P1-A, P1-C): every in-site ButtonLink prefetches on intent unless
  // it asks otherwise, so a new one cannot bring viewport prefetch back
  it('prefetches on intent by default, on sight with intent={false}, and opens an outside link in a new tab', () => {
    expect(link({ href: '/papers' }).dataset.prefetch).toBe('off');
    cleanup();
    expect(link({ href: '/papers', intent: false }).dataset.prefetch).toBe('auto');
    cleanup();
    const outside = link({ href: 'https://github.com/Sahil170595', intent: true });
    expect(outside.getAttribute('target')).toBe('_blank');
    expect(outside.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
