import type { CSSProperties } from 'react';

// The first-load entrance (globals.css, "first-load entrance"): a page head
// rises in groups one --stagger-group apart, then the first content items one
// --stagger-item apart. The pre-paint gate opens the window on a full load
// (prePaint.ts) and EntranceWindow closes it on the first client navigation,
// so none of this plays when a page is reached through the router.

export const ENTRANCE_GROUP_CLASS = 'entrance-group';
export const ENTRANCE_ITEM_ATTRIBUTE = 'data-entrance-item';
/** a page head's groups: the title with its eyebrow, the lede, the meta row */
export const HEAD_ENTRANCE_GROUPS = 3;
/** the motion brief's cap: every step of a staged entrance starts within this */
export const MAX_ENTRANCE_START_MS = 400;
// mirrors of --stagger-group and --stagger-item (entrance.test.tsx pins them)
export const STAGGER_GROUP_MS = 80;
export const STAGGER_ITEM_MS = 50;

type EntranceStyle = CSSProperties & Record<`--${string}`, number>;

/** Props that make an element entrance group `group` (0 starts on the first frame). */
export function entranceGroup(group: number): { className: string; style: EntranceStyle } {
  return { className: ENTRANCE_GROUP_CLASS, style: { '--group': group } };
}

/**
 * Props that make an element the `index`-th item of the first content group,
 * starting after `after` groups. Items past the cap start with the last one
 * that fits, so a long list never delays the sequence.
 */
export function entranceItem(
  index: number,
  after: number = HEAD_ENTRANCE_GROUPS,
): { [ENTRANCE_ITEM_ATTRIBUTE]: ''; style: EntranceStyle } {
  const lastStep = Math.max(0, Math.floor((MAX_ENTRANCE_START_MS - after * STAGGER_GROUP_MS) / STAGGER_ITEM_MS));
  return {
    [ENTRANCE_ITEM_ATTRIBUTE]: '',
    style: { '--entrance-i': Math.min(index, lastStep), '--entrance-items-after': after },
  };
}
