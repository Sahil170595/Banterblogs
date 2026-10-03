import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MissionDemo } from './MissionDemo';
import { checkReason } from './words';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

// jsdom lays nothing out and has no scrollIntoView or matchMedia; a picked
// cell reveals the map through both (components/projects/reveal.ts)
const scrollIntoView = vi.fn();
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup();
  scrollIntoView.mockClear();
});

const matrix = () => screen.getByRole('region', { name: 'Each fault and how the flight ends' });
const checks = () => screen.getByRole('region', { name: 'Pre-flight checks' });
const log = () => screen.getByRole('region', { name: 'Event log' });

describe('mission demo', () => {
  it('opens on no telemetry: two warnings, every waypoint flown, the guard only logging', () => {
    render(<MissionDemo />);
    expect(
      screen.getByText(
        /Every mission must declare what the drone does if its link is lost; the sample mission says return to launch\. Nothing in the code reads that field\. With no telemetry at all, the mission passes its pre-flight check with two warnings and flies all 6 waypoints; when telemetry goes stale or stops mid-flight, the safety guard logs it and the flight goes on\./,
      ),
    ).toBeTruthy();
    expect(within(checks()).getAllByText(/^warning · no telemetry to check/)).toHaveLength(2);
    expect(within(log()).getByText(/blocked\.no_telemetry, and nothing else/)).toBeTruthy();
  });

  it('puts the caveat beside the finding and the colour key before the table', () => {
    const { container } = render(<MissionDemo />);
    const text = container.textContent ?? '';
    const caveat = text.indexOf('a real PX4 flight controller has its own link-loss failsafe');
    const key = text.indexOf('flew the whole route while the guard could not see the drone');
    expect(caveat).toBeGreaterThan(-1);
    expect(key).toBeGreaterThan(caveat);
    expect(key).toBeLessThan(text.indexOf('Healthy telemetry'));
  });

  it('says what the guard did in words, keeps its codes in the title, and names every cell’s column', () => {
    render(<MissionDemo />);
    const row = within(matrix()).getByRole('row', { name: /Stale telemetry/ });
    const [, midFlight] = within(row).getAllByRole('button');
    expect(midFlight.textContent).toMatch(/guard logged “telemetry stale” and did nothing else/);
    expect(midFlight.getAttribute('title')).toMatch(/blocked\.telemetry_stale/);
    for (const cell of within(matrix()).getAllByRole('cell')) expect(cell.getAttribute('data-label')).toBeTruthy();
  });

  it('flies a matrix cell on the map below: a weak link mid-flight comes home', () => {
    render(<MissionDemo />);
    const row = within(matrix()).getByRole('row', { name: /Weak link/ });
    fireEvent.click(within(row).getAllByRole('button')[1]);
    expect(within(log()).getByText('rtl')).toBeTruthy();
    expect(screen.getByText('returning to launch: link weak')).toBeTruthy();
    expect(screen.getByText('Fence and route: 3 of 6 waypoints flown')).toBeTruthy();
    expect(screen.getByText('where it turned for home')).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('numbers each place on the route once, flown twice', () => {
    render(<MissionDemo />);
    expect(screen.getByText('1 · 4')).toBeTruthy();
    expect(screen.getByText('3 · 6')).toBeTruthy();
  });

  it('reads the source’s check reasons in plain words', () => {
    expect(checkReason('battery_24_below_25')).toBe('battery 24%, below the 25% floor');
    expect(checkReason('telemetry_age_3000ms_exceeds_1500ms')).toBe('telemetry 3000 ms old, over the 1500 ms limit');
    expect(checkReason('waypoint_seq_2_outside_geofence')).toBe('waypoint 2 outside the fence');
    expect(checkReason('something_new')).toBe('something new');
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
