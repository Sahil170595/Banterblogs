import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MissionDemo } from './MissionDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

afterEach(cleanup);

const matrix = () => screen.getByRole('region', { name: 'Each fault and how the flight ends' });
const checks = () => screen.getByRole('region', { name: 'Pre-flight checks' });
const log = () => screen.getByRole('region', { name: 'Event log' });

describe('mission demo', () => {
  it('opens on no telemetry: two warnings, every waypoint flown, the guard only logging', () => {
    render(<MissionDemo />);
    expect(
      screen.getByText(/The sample mission declares that a lost link means return to launch\. Nothing reads that field\. With no telemetry at all, it passes the pre-flight check with two warnings and flies all 6 waypoints; when telemetry goes stale or stops mid-flight, the guard logs it and the flight goes on\./),
    ).toBeTruthy();
    expect(within(checks()).getAllByText(/^warning/)).toHaveLength(2);
    expect(within(log()).getByText(/blocked\.no_telemetry, and nothing else/)).toBeTruthy();
  });

  it('flies a matrix cell: a weak link mid-flight comes home', () => {
    render(<MissionDemo />);
    const row = within(matrix()).getByRole('row', { name: /Weak link/ });
    fireEvent.click(within(row).getAllByRole('button')[1]);
    expect(within(log()).getByText('rtl')).toBeTruthy();
    expect(screen.getByText(/rtl · degraded\.link_quality/)).toBeTruthy();
  });

  it('leaves a resumed mission executing with nothing watching', () => {
    render(<MissionDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Battery below the floor' }));
    fireEvent.click(screen.getByRole('radio', { name: 'After a pause and resume' }));
    expect(screen.getByText('executing at waypoint 2, unwatched')).toBeTruthy();
    expect(screen.getByText(/nothing starts it again/)).toBeTruthy();
  });

  it('passes the notched fence and marks where its leg leaves', () => {
    render(<MissionDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Healthy telemetry' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Notched fence' }));
    expect(within(checks()).getByText('geofence containment').closest('li')?.getAttribute('data-status')).toBe('passed');
    expect(screen.getByText(/the straight leg between them crosses the notch/)).toBeTruthy();
  });
});
