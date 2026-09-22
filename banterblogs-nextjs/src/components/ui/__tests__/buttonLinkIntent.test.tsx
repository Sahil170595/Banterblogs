import type { ReactNode } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ButtonLink } from '../Button';

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
  it('does not prefetch an in-site page on sight, and does once the pointer rests on it', () => {
    const anchor = link({ href: '/papers', intent: true });
    expect(anchor.dataset.prefetch).toBe('off');
    fireEvent.pointerEnter(anchor);
    expect(anchor.dataset.prefetch).toBe('auto');
  });

  it('keeps the pill: same classes as the plain button link', () => {
    const plain = link({ href: '/papers' }).className;
    cleanup();
    expect(link({ href: '/papers', intent: true }).className).toBe(plain);
  });

  it('leaves the default as it was, and an outside link opening in a new tab', () => {
    expect(link({ href: '/papers' }).dataset.prefetch).toBe('auto');
    cleanup();
    const outside = link({ href: 'https://github.com/Sahil170595', intent: true });
    expect(outside.getAttribute('target')).toBe('_blank');
    expect(outside.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
