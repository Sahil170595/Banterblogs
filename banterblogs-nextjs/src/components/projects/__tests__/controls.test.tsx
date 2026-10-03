import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Segmented, UnderTheHood } from '../controls';

// live QA: Escape left an open panel open
describe('under the hood', () => {
  it('closes on Escape and hands focus back to its summary', () => {
    render(
      <UnderTheHood summary="Settings">
        <button type="button">Inside</button>
      </UnderTheHood>,
    );
    const details = screen.getByText('Settings').closest('details')!;
    details.open = true;
    screen.getByRole('button', { name: 'Inside' }).focus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'Escape' });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(details.querySelector('summary'));
  });
});

// A segmented option's quiet note is part of its name: a screen reader heard
// "Harm ×2penalty 3" when the two ran together.

describe('segmented choice', () => {
  it('names an option with its note, apart from its label', () => {
    render(
      <Segmented
        legend="Reward"
        name="reward"
        options={[
          { value: 'default', label: 'Gain − 1.5 × harm' },
          { value: 'harsh', label: 'Harm ×2', note: 'penalty 3' },
        ]}
        value="default"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Gain − 1.5 × harm' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Harm ×2, penalty 3' })).toBeTruthy();
  });
});
