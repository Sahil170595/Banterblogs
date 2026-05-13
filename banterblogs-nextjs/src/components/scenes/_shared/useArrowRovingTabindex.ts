'use client';

import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Hook factory for the ARIA radiogroup arrow-key-roving-tabindex
 * pattern.
 *
 * Returns a memoized `onKeyDown` handler. Wire it to a `role="radiogroup"`
 * div whose children are `role="radio"` buttons with
 * `tabIndex={isActive ? 0 : -1}`.
 *
 * Handles ArrowLeft/Right/Up/Down (wraps), Home (first), End (last).
 * Calls `preventDefault` only on handled keys.
 *
 * Required when you use the radiogroup ARIA pattern — without arrow-key
 * nav, keyboard users can Tab in but cannot navigate between options,
 * which breaks the radiogroup contract.
 */
export function useArrowRovingTabindex(
  currentIdx: number,
  count: number,
  setIdx: (idx: number) => void,
) {
  return useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (count === 0) return;
      let next: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (currentIdx + 1) % count;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (currentIdx - 1 + count) % count;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = count - 1;
      }
      if (next !== null) {
        e.preventDefault();
        setIdx(next);
      }
    },
    [currentIdx, count, setIdx],
  );
}
