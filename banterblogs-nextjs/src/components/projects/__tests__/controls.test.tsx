import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Segmented } from '../controls';

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
