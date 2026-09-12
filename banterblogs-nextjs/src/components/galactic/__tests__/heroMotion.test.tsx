import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GalacticHero } from '../GalacticHero';
import { GalacticBackdrop } from '../GalacticBackdrop';

vi.mock('../GalacticScene', () => ({ default: () => <div data-testid="scene" /> }));

// The pill's pulse is switched off in CSS (:has) while the pause control
// reports paused, so the server-rendered hero needs no client state.
const PULSE_OFF_WHEN_PAUSED = 'group-has-[[data-motion=paused]]/hero:animate-none';
// covers the scene gate's idle-callback deadline and its setTimeout fallback
const SCENE_MAX_WAIT_MS = 2500;

describe('landing pill pulse', () => {
  it('is wired to stop when motion is paused', () => {
    const html = renderToStaticMarkup(<GalacticHero />);

    expect(html).toMatch(/<section class="group\/hero /);
    expect(html).toContain(PULSE_OFF_WHEN_PAUSED);
  });

  describe('pause control', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () =>
          ({ getExtension: () => ({ loseContext: () => undefined }) }) as unknown as ReturnType<
            HTMLCanvasElement['getContext']
          >,
      );
      localStorage.clear();
    });

    afterEach(() => {
      cleanup();
      vi.useRealTimers();
      vi.restoreAllMocks();
      Reflect.deleteProperty(navigator, 'hardwareConcurrency');
      Reflect.deleteProperty(window, 'matchMedia');
    });

    it('publishes its state for the pulse to follow', async () => {
      render(<GalacticBackdrop />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SCENE_MAX_WAIT_MS);
      });
      const control = screen.getByRole('button', { name: 'Pause motion' });
      expect(control.dataset.motion).toBe('running');

      fireEvent.click(control);

      expect(screen.getByRole('button', { name: 'Resume motion' }).dataset.motion).toBe('paused');
    });
  });
});
