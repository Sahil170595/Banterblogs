import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NAV_RECEDE_RESET_MS, NAV_START_EVENT } from '@/components/motion/navRecede';
import { NavigationHold } from '../GalacticScene';

// Phase R5 (design re-judge P1-C, perf re-judge P2): the scene kept rendering
// while the next page rendered. It now stands still from the click, through
// its own render loop rather than a React render: pausing it through props
// re-rendered the whole scene inside the click's task and started the view
// transition about 10 ms later.

const store = vi.hoisted(() => ({ setFrameloop: vi.fn() }));
vi.mock('@react-three/fiber', () => ({
  useThree: (select: (state: typeof store) => unknown) => select(store),
}));

describe('scene hold for a navigation away', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.setFrameloop.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const leave = () => act(() => void window.dispatchEvent(new Event(NAV_START_EVENT)));

  it('stops the render loop as the navigation starts', () => {
    render(<NavigationHold frozen={false} />);
    leave();

    expect(store.setFrameloop).toHaveBeenCalledWith('never');
  });

  it('runs again if the page stays, as it ran before', () => {
    render(<NavigationHold frozen={false} />);
    leave();
    act(() => vi.advanceTimersByTime(NAV_RECEDE_RESET_MS));

    expect(store.setFrameloop).toHaveBeenLastCalledWith('always');
  });

  it('comes back on demand only when the scene was paused', () => {
    render(<NavigationHold frozen />);
    leave();
    act(() => vi.advanceTimersByTime(NAV_RECEDE_RESET_MS));

    expect(store.setFrameloop).toHaveBeenLastCalledWith('demand');
  });

  it('lets go of the event when the scene goes', () => {
    const { unmount } = render(<NavigationHold frozen={false} />);
    unmount();
    leave();

    expect(store.setFrameloop).not.toHaveBeenCalled();
  });
});
