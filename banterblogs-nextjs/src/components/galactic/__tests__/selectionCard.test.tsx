import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SelectionCard } from '../SelectionCard';

afterEach(cleanup);

describe('galactic selection card focus contract', () => {
  it('acts as a modal focus island while the atlas is paused', () => {
    render(<SelectionCard selection={{ kind: 'core' }} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: 'Close details' });
    const cta = screen.getByRole('link', { name: /Explore the platform/i });

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cta);

    fireEvent.keyDown(cta, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
  });
});
