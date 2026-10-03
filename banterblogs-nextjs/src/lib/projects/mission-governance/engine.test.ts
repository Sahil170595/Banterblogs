import { describe, expect, it } from 'vitest';
import { applyCommand, canTransition, createSession, pointInside, replay, safetyViolation, validateMission, TRANSITIONS } from './engine';
import { DEFAULT_MISSION } from './fixtures';

const ready = () => ['validate', 'approve', 'start'].reduce((s, type) => applyCommand(s, { type } as Parameters<typeof applyCommand>[1]), createSession(DEFAULT_MISSION));
describe('mission governance source-derived boundaries', () => {
  it('blocks execution before validation and approval', () => {
    expect(() => applyCommand(createSession(DEFAULT_MISSION), { type: 'start' })).toThrow(/draft/);
    const validated = applyCommand(createSession(DEFAULT_MISSION), { type: 'validate' });
    expect(validated.state).toBe('awaiting_approval');
    expect(validated.events.filter(e => e.kind === 'transition').map(e => e.next)).toEqual(['validated', 'awaiting_approval']);
    expect(() => applyCommand(validated, { type: 'start' })).toThrow(/awaiting_approval/);
    expect(ready().events.filter(e => e.kind === 'transition').map(e => e.next)).toEqual(['validated','awaiting_approval','approved','staging','executing']);
  });
  it('rejects approval and freezes terminal commands', () => {
    const rejected = applyCommand(applyCommand(createSession(DEFAULT_MISSION), { type: 'validate' }), { type: 'reject' });
    expect(rejected.state).toBe('rejected');
    expect(() => applyCommand(rejected, { type: 'approve' })).toThrow();
    expect(TRANSITIONS.rejected).toEqual([]);
    expect(canTransition('draft', 'executing')).toBe(false);
    expect(canTransition('paused', 'completed')).toBe(false);
  });
  it('retains ray-casting edge asymmetry and waypoint-only geometry', () => {
    const p = DEFAULT_MISSION.geofence;
    expect(pointInside(50, 50, p)).toBe(true);
    expect(pointInside(0, 50, p)).toBe(true);
    expect(pointInside(100, 50, p)).toBe(false);
    expect(pointInside(101, 50, p)).toBe(false);
  });
  it('collects validation failures without treating warnings as failures', () => {
    const mission = { ...DEFAULT_MISSION, airspaceRef: '', waypoints: [{ seq: 1, x: 150, y: 20, altitude: 60 }] };
    const checks = validateMission(mission, { ...createSession(DEFAULT_MISSION).health, battery: 10, ageMs: 1501 });
    expect(checks.filter(c => c.status === 'failed').map(c => c.name)).toEqual(['geofence_containment','altitude_limit','battery_threshold','telemetry_freshness']);
    expect(checks.find(c => c.name === 'airspace_authorization')?.status).toBe('warning');
    const none = applyCommand(applyCommand(createSession(DEFAULT_MISSION), { type: 'fault', fault: 'missing' }), { type: 'validate' });
    expect(none.state).toBe('awaiting_approval');
    expect(none.checks.filter(c => c.status === 'warning')).toHaveLength(2);
  });
  it('accepts exact altitude, battery, link and freshness thresholds', () => {
    const s = createSession(DEFAULT_MISSION);
    s.health = { ...s.health, battery: 30, link: .3, ageMs: 1500 };
    expect(validateMission(s.mission, s.health).every(c => c.status !== 'failed')).toBe(true);
    expect(safetyViolation(s)).toBeNull();
  });
  it.each([['battery','degraded.battery_low'],['link','degraded.link_quality'],['estimator','degraded.estimator'],['timeout','timeout.mission']])('returns on actionable %s fault', (fault, reason) => {
    const s = applyCommand(applyCommand(ready(), { type: 'fault', fault: fault as 'battery' }), { type: 'step' });
    expect(s.state).toBe('rtl');
    expect(s.progress).toBe(1);
    expect(s.events.at(-1)?.reason).toBe(reason);
    expect(s.adapter.inAir).toBe(false);
    expect(s.position).toEqual(DEFAULT_MISSION.waypoints[0]);
  });
  it.each(['stale','missing'] as const)('reports %s telemetry without silently hardening the executor', fault => {
    const s = applyCommand(applyCommand(ready(), { type: 'fault', fault }), { type: 'step' });
    expect(s.state).toBe('executing');
    expect(s.events.at(-1)?.reason).toMatch(/^blocked\./);
  });
  it('checks completion before safety, including a last-poll fault', () => {
    let s = ready();
    for (let i=0;i<3;i++) s=applyCommand(s,{ type: 'step' });
    s=applyCommand(applyCommand(s,{ type:'fault', fault:'battery' }),{ type:'step' });
    expect(s.state).toBe('completed');
    expect(s.progress).toBe(4);
    expect(s.events.at(-1)?.reason).toBe('mission.completed');
  });
  it('pauses progress, resumes through the intermediate state and preserves idempotent pause', () => {
    const paused = applyCommand(ready(), { type: 'pause' });
    expect(applyCommand(paused, { type: 'pause' }).events).toEqual(paused.events);
    expect(() => applyCommand(paused, { type: 'step' })).toThrow(/paused/);
    const resumed = applyCommand(paused, { type: 'resume' });
    expect(resumed.events.slice(-2).map(e => e.next)).toEqual(['resuming','executing']);
    expect(applyCommand(resumed, { type: 'step' }).progress).toBe(1);
  });
  it('does not invent RTL completion or a trip back to home', () => {
    const s=applyCommand(applyCommand(ready(),{ type:'step' }),{ type:'return' });
    expect(s.state).toBe('rtl');
    expect(s.adapter).toMatchObject({ inAir:false,armed:false,mode:'rtl' });
    expect(s.position.x).toBe(DEFAULT_MISSION.waypoints[0].x);
    expect(() => applyCommand(s,{ type:'step' })).toThrow(/rtl/);
  });
  it('preserves staging failure order and exact deterministic replay', () => {
    let s=applyCommand(applyCommand(createSession(DEFAULT_MISSION),{ type:'validate' }),{ type:'approve' });
    s=applyCommand(applyCommand(s,{ type:'fault',fault:'upload' }),{ type:'start' });
    expect(s.state).toBe('failed');
    expect(s.events.at(-1)?.reason).toBe('staging.upload_failed');
    expect(replay(s.mission,s.journal)).toEqual(s);
    expect(createSession(DEFAULT_MISSION).journal).toEqual([]);
    expect(replay(ready().mission,ready().journal)).toEqual(ready());
  });
  it.each([null, { ...DEFAULT_MISSION, maxAltitude: NaN }, { ...DEFAULT_MISSION, waypoints: [] }, { ...DEFAULT_MISSION, geofence: [[0,0],[1,1]] }, { ...DEFAULT_MISSION, minBattery: 101 }, { ...DEFAULT_MISSION, approvalRef: 'real-reference' }])('rejects malformed or non-synthetic input', bad => {
    expect(() => createSession(bad)).toThrow();
  });
});
