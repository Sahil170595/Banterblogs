import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIGHT_CONFIG } from '@/lib/projects/flight-routing/experiment';
import { evaluateWorlds } from '@/lib/projects/flight-routing/worlds';
import { FlightRoutingDemo } from './FlightRoutingDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

afterEach(cleanup);

const initialWorlds = evaluateWorlds(TIGHT_CONFIG);
const renderDemo = () => render(<FlightRoutingDemo initialWorlds={initialWorlds} />);
const panel = (name: RegExp) => screen.getByRole('group', { name });
const status = () => screen.getByTestId('episode-status').textContent;

describe('flight routing demo', () => {
  it('opens on the finding: the tight deadline, every policy over the same 64 worlds', () => {
    renderDemo();
    expect(screen.getByRole('radio', { name: /07:55/ })).toHaveProperty('checked', true);
    expect(within(panel(/^Nonstop first: 0 of 64/)).getAllByRole('button')).toHaveLength(64);
    expect(panel(/^Deadline lookahead: 40 of 64/)).toBeTruthy();
    // the replay below opens on world 1 under lookahead, already played out
    expect(status()).toBe('Arrived on time');
    expect(screen.getByRole('button', { name: /World 1, seed 42/, pressed: true })).toBeTruthy();
  });

  it('replays the world a square stands for, under that panel’s policy', () => {
    renderDemo();
    fireEvent.click(within(panel(/^Nonstop first/)).getByRole('button', { name: /World 1, seed 42: late/ }));
    expect(status()).toBe('Arrived late');
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'nonstop');
    expect(screen.getByText(/Seed 42 · Nonstop first/)).toBeTruthy();
  });

  it('rewinds a decision, takes another flight and lets the policy finish', () => {
    renderDemo();
    fireEvent.click(screen.getByRole('button', { name: 'Restart this world' }));
    expect(status()).toBe('In progress');
    fireEvent.click(screen.getByRole('radio', { name: 'Choose F1 to ORD' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take F1' }));
    expect(status()).toBe('No onward flight');
    fireEvent.click(screen.getByRole('button', { name: 'Rewind one decision' }));
    expect(status()).toBe('In progress');
    fireEvent.click(screen.getByRole('button', { name: 'Let the policy finish' }));
    expect(status()).toBe('Arrived on time');
  });

  it('recomputes every panel when the deadline moves', () => {
    renderDemo();
    fireEvent.click(screen.getByRole('radio', { name: /09:00/ }));
    expect(panel(/^Nonstop first: 55 of 64/)).toBeTruthy();
    expect(panel(/^Deadline lookahead: 55 of 64/)).toBeTruthy();
  });

  it('refuses settings that break the scenario and keeps the grid it had', () => {
    renderDemo();
    fireEvent.change(screen.getByRole('textbox', { name: 'Deadline (minutes)' }), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to all worlds' }));
    expect(screen.getByRole('alert').textContent).toContain('Deadline must not exceed');
    expect(panel(/^Deadline lookahead: 40 of 64/)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Flight attempts' }), { target: { value: 'two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to all worlds' }));
    expect(screen.getByRole('alert').textContent).toBe('Flight attempts must be a whole number.');
  });

  it('moves through a panel with the arrow keys', () => {
    renderDemo();
    const grid = panel(/^Deadline lookahead/);
    const first = within(grid).getByRole('button', { name: /World 1,/ });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^World 9,/);
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^World 64,/);
  });

  it('exports the trip as versioned JSON', () => {
    const create = vi.fn(() => 'blob:trace');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderDemo();
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON trace' }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toBe('Trace exported.');
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
