import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionCard } from '../SelectionCard';
import { STAR_SYSTEMS } from '../systems';

describe('selection card focus restoration', () => {
  it('returns focus to the rail item that opened it', () => {
    const opener = document.createElement('a');
    opener.href = STAR_SYSTEMS[0].href;
    document.body.append(opener);
    const transientFocus = document.createElement('button');
    document.body.append(transientFocus);
    transientFocus.focus();

    const { getByRole, unmount } = render(
      <SelectionCard
        selection={{ kind: 'star', system: STAR_SYSTEMS[0] }}
        onClose={vi.fn()}
        restoreFocusTo={opener}
      />,
    );

    expect(document.activeElement).toBe(getByRole('button', { name: 'Close details' }));
    unmount();
    expect(document.activeElement).toBe(opener);

    opener.remove();
    transientFocus.remove();
  });
});
