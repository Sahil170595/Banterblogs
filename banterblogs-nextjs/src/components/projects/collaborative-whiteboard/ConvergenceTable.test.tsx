import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ConvergenceTable } from './ConvergenceTable';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

afterEach(cleanup);

const table = () => screen.getByRole('table');

describe('the convergence table', () => {
  // review: echoes, sequence numbers and the red were explained only below the table
  it('defines its terms and its red before the table', () => {
    const { container } = render(<ConvergenceTable />);
    const legend = screen.getByText(/Each row is one timing/);
    expect(legend.compareDocumentPosition(table()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(legend.textContent).toMatch(/echo/);
    expect(legend.textContent).toMatch(/seq 1 and seq 2/);
    expect(legend.textContent).toMatch(/6 of 8 rows/);
    expect(container.textContent).toMatch(/sequence numbers?/);
  });

  it('says which way Sceneledger applies echoes today and which is the fix shown here', () => {
    render(<ConvergenceTable />);
    const group = screen.getByRole('group', { name: 'Each client applies the server’s echoes' });
    expect(within(group).getByText('As they arrive').parentElement?.textContent).toMatch(/what Sceneledger does now/);
    expect(within(group).getByText('In sequence order').parentElement?.textContent).toMatch(/the fix shown here/);
    fireEvent.click(within(group).getByText('In sequence order'));
    expect(within(table()).queryAllByText(/not the database/)).toHaveLength(0);
    expect(screen.getByText(/Each row is one timing/).textContent).toMatch(/0 of 8 rows/);
  });

  // a phone stacks each row into a card (reading.css .demo-stack), naming every value
  it('keeps a table to assistive technology and labels every cell with its column', () => {
    render(<ConvergenceTable />);
    expect(table().getAttribute('role')).toBe('table');
    expect(table().className).toMatch(/demo-stack/);
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    for (const row of within(table()).getAllByRole('row').slice(1)) {
      const cells = [...row.querySelectorAll('th, td')];
      expect(cells.map((cell) => cell.getAttribute('data-label'))).toEqual(headers);
      expect(cells[0].getAttribute('role')).toBe('rowheader');
    }
  });
});
