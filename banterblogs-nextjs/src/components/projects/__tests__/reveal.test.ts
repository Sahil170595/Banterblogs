import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REVEALED_CLASS, revealResult } from '../reveal';

// A click in a demo's table changes a result further down; revealResult
// scrolls to it only when the visitor could not already see it.

const VIEWPORT = 800;

function result(top: number, bottom: number) {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) });
  element.scrollIntoView = vi.fn();
  return element;
}

beforeEach(() => {
  vi.stubGlobal('innerHeight', VIEWPORT);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('revealResult', () => {
  it('leaves a result alone when it is wholly on screen', () => {
    const element = result(500, 700);
    revealResult(element);
    expect(element.scrollIntoView).not.toHaveBeenCalled();
    expect(element.classList.contains(REVEALED_CLASS)).toBe(true);
  });

  it('scrolls to a result that starts low on screen and runs off it', () => {
    const element = result(700, 1400);
    revealResult(element);
    expect(element.scrollIntoView).toHaveBeenCalled();
  });

  it('leaves a tall result alone when its start is near the top', () => {
    const element = result(100, 2000);
    revealResult(element);
    expect(element.scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls to a result below the screen or above it', () => {
    for (const [top, bottom] of [
      [900, 1100],
      [-600, -100],
    ]) {
      const element = result(top, bottom);
      revealResult(element);
      expect(element.scrollIntoView).toHaveBeenCalled();
    }
  });

  // live QA: a result just under the top edge sat behind the sticky header and counted as seen
  it('treats a result under the sticky header as hidden, and scrolls it to just below the header', () => {
    const element = result(40, 300);
    revealResult(element);
    expect(element.scrollIntoView).toHaveBeenCalled();
    expect(element.style.scrollMarginTop).toBe('88px');
  });
});
