import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LivePulse } from '../LivePulse';

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
const observers = vi.hoisted(() => [] as Array<{ callback: ObserverCallback; disconnected: boolean }>);

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      disconnected = false;
      constructor(public callback: ObserverCallback) {
        observers.push(this);
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
  );
});

afterEach(cleanup);

describe('live pulse', () => {
  it('marks the dot in or out of view as it crosses the viewport, and lets go on unmount', () => {
    const { container, unmount } = render(<LivePulse label="Latest" />);
    const dot = container.querySelector<HTMLElement>('.live-dot')!;

    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toBe('Latest');
    act(() => observers.at(-1)!.callback([{ isIntersecting: true }]));
    expect(dot.dataset.inview).toBe('true');
    act(() => observers.at(-1)!.callback([{ isIntersecting: false }]));
    expect(dot.dataset.inview).toBe('false');

    unmount();
    expect(observers.at(-1)!.disconnected).toBe(true);
  });

  it('loops 2-3 s only under the motion gate, paused unless on screen, and never under reduced motion', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const period = /--motion-pulse:\s*(\d+)ms/.exec(css);
    expect(Number(period?.[1])).toBeGreaterThanOrEqual(2000);
    expect(Number(period?.[1])).toBeLessThanOrEqual(3000);

    const animated = [...css.matchAll(/([^{}]+)\{[^{}]*animation:\s*live-pulse[^{}]*\}/g)].map((m) => m[1].trim());
    expect(animated.length).toBeGreaterThan(0);
    for (const selector of animated) expect(selector).toMatch(/^html\[data-motion="on"\]/);
    expect(css).toMatch(/html\[data-motion="on"\] \.live-dot::after \{[^}]*animation-play-state:\s*paused/);
    expect(css).toMatch(/html\[data-motion="on"\] \.live-dot\[data-inview="true"\]::after \{[^}]*animation-play-state:\s*running/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.live-dot::after \{[^}]*animation:\s*none\s*!important/);
  });
});
