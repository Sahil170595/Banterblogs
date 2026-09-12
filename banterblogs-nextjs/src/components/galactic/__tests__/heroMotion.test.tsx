import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GalacticHero } from '../GalacticHero';
import { GalacticBackdrop } from '../GalacticBackdrop';

vi.mock('../GalacticScene', () => ({ default: () => <div data-testid="scene" /> }));

// covers the scene gate's idle-callback deadline and its setTimeout fallback
const SCENE_MAX_WAIT_MS = 2500;

describe('landing motion', () => {
  it('keeps the pill dot static (a pulse is reserved for genuinely live state)', () => {
    const html = renderToStaticMarkup(<GalacticHero />);

    expect(html).toContain('Select a system');
    expect(html).not.toContain('animate-pulse');
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

    it('publishes its running and paused state', async () => {
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
