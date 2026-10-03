import { describe, expect, it } from 'vitest';
import { advance, analyze, exportTrace, freshSession, replayTrace } from './engine';

describe('seeded scheduling engine', () => {
  it('replays exactly for the same inputs, without modifying its session', () => {
    const session = freshSession();
    const before = JSON.stringify(session);
    expect(analyze(session)).toEqual(analyze(session));
    expect(JSON.stringify(session)).toBe(before);
    const other = freshSession();
    other.config.seed++;
    expect(analyze(other).events.map(e => e.sampledWpm)).not.toEqual(analyze(session).events.map(e => e.sampledWpm));
  });
  it('enforces all forward-feasible invariants across many seeds', () => {
    for (let seed = 0; seed < 40; seed++) {
      const session = freshSession(); session.config.seed = seed;
      const result = analyze(session);
      expect(result.violations).toEqual([]);
      expect(result.events).toHaveLength(session.events.length);
      expect(result.metrics.admitted + result.metrics.deferred).toBe(session.events.length);
      expect(result.events.every(e => e.sampledWpm >= 30 && e.sampledWpm <= 80)).toBe(true);
    }
  });
  it('uses real content length and explicit typing/pause components', () => {
    const session = freshSession();
    session.config.wpmMean = 60; session.config.wpmStd = 0; session.config.pauseProbability = 0;
    session.events[0].text = 'one two three four five six';
    const event = analyze(session).events[0];
    expect(event.wordCount).toBe(6);
    expect(event.typingMs).toBe(6000);
    expect(event.pauseMs).toBe(0);
    session.config.pauseProbability = 1;
    expect(analyze(session).events.every(e => e.pauseMs >= 5000 && e.pauseMs <= 45000)).toBe(true);
  });
  it('moves pre-opening work forward and reports after-hours infeasibility', () => {
    const before = freshSession(); before.config.start = '2026-01-12T08:00:00Z';
    const result = analyze(before);
    expect(result.events.filter(e => e.scheduledAt !== null).every(e => e.scheduledAt! >= Date.parse('2026-01-12T09:00:00Z'))).toBe(true);
    const after = analyze(freshSession('after-hours'));
    expect(after.metrics.admitted).toBe(0);
    expect(after.metrics.deferred).toBe(after.events.length);
    expect(after.violations).toEqual([]);
  });
  it('does not compress preparation into an infeasible deadline', () => {
    const session = freshSession('tight');
    const safe = analyze(session);
    expect(safe.metrics.deferred).toBeGreaterThan(0);
    expect(safe.violations).toEqual([]);
    session.config.boundsPolicy = 'clamp-audit';
    const clamped = analyze(session);
    expect(clamped.violations.some(v => v.code === 'preparation')).toBe(true);
    expect(clamped.violations.some(v => v.code === 'business-hours')).toBe(true);
    expect(clamped.violations.some(v => v.code === 'burst')).toBe(true);
  });
  it('exposes off-hours conflicts in a source-style clamp audit', () => {
    const session = freshSession('after-hours'); session.config.boundsPolicy = 'clamp-audit';
    const result = analyze(session);
    expect(result.metrics.admitted).toBe(session.events.length);
    expect(result.violations.some(v => v.code === 'business-hours')).toBe(true);
    expect(result.events.every(e => e.scheduledAt! <= result.end)).toBe(true);
  });
  it('preserves the recorded v1 synthetic finding counts', () => {
    expect(analyze(freshSession()).metrics).toMatchObject({ admitted: 12, deferred: 0, pauseCount: 7, violationCount: 0 });
    const tight = freshSession('tight');
    expect(analyze(tight).metrics).toMatchObject({ admitted: 1, deferred: 11, violationCount: 0 });
    tight.config.boundsPolicy = 'clamp-audit';
    expect(analyze(tight).metrics).toMatchObject({ admitted: 12, deferred: 0, violationCount: 33 });
    expect(analyze(freshSession('after-hours')).metrics).toMatchObject({ admitted: 0, deferred: 12, gapCv: null, businessAdherence: null });
  });
  it('projects overnight work into the next UTC opening without backward adjustment', () => {
    const session = freshSession('after-hours'); session.config.durationMinutes = 1000;
    const result = analyze(session), nextOpening = Date.parse('2026-01-13T09:00:00Z');
    expect(result.metrics.admitted).toBeGreaterThan(0);
    expect(result.events.filter(e => e.scheduledAt !== null).every(e => e.scheduledAt! >= nextOpening)).toBe(true);
    expect(result.violations).toEqual([]);
  });
  it('audits backward assignment before sorting and repairs signed proposals in forward mode', () => {
    const session = freshSession();
    Object.assign(session.config, { seed: 3, start: '2026-01-12T10:13:00Z', durationMinutes: 10, wpmMean: 80, wpmStd: 0, pauseProbability: 0, distribution: 'uniform', boundsPolicy: 'clamp-audit' });
    expect(analyze(session).violations.filter(v => v.code === 'order').map(v => v.eventId)).toEqual(['E09', 'E12']);
    session.config.boundsPolicy = 'forward';
    expect(analyze(session).violations).toEqual([]);
  });
  it('enforces the rolling burst limit rather than merely adding random delay', () => {
    const session = freshSession();
    session.config.durationMinutes = 10; session.config.distribution = 'uniform';
    session.config.pauseProbability = 0; session.config.wpmStd = 0;
    session.events.forEach(e => { e.text = 'Synthetic work'; });
    const result = analyze(session);
    for (const event of result.events.filter(e => e.scheduledAt !== null)) {
      const peers = result.events.filter(e => e.scheduledAt !== null && e.scheduledAt! > event.scheduledAt! - 90000 && e.scheduledAt! <= event.scheduledAt!);
      expect(peers.length).toBeLessThanOrEqual(3);
    }
  });
  it.each([
    ['seed', NaN], ['seed', -1], ['durationMinutes', 0], ['durationMinutes', Infinity],
    ['pauseProbability', 2], ['businessStart', 18], ['start', '2026-02-30T10:00:00Z'],
  ])('rejects invalid %s = %s', (key, value) => {
    const session = freshSession();
    Object.assign(session.config, { [key]: value });
    expect(() => analyze(session)).toThrow();
  });
  it('rejects empty content, duplicate IDs, and stale simulation cursors', () => {
    const empty = freshSession(); empty.events[0].text = '  ';
    expect(() => analyze(empty)).toThrow();
    const duplicate = freshSession(); duplicate.events[1].id = duplicate.events[0].id;
    expect(() => analyze(duplicate)).toThrow(/Duplicate/);
    const stale = freshSession('after-hours'); stale.processed = 1;
    expect(() => analyze(stale)).toThrow(/cursor/);
  });
  it('steps a virtual clock only, and reset restores the initial session', () => {
    const initial = freshSession();
    const stepped = advance(initial);
    expect(stepped.processed).toBe(1);
    expect(analyze(stepped).simulation.processedIds).toHaveLength(1);
    expect(analyze(stepped).simulation.delivery).toBe('simulated-only');
    expect(initial.processed).toBe(0);
    expect(freshSession()).toEqual(initial);
  });
  it('exports versioned configuration/seed and recomputes tampered results on replay', () => {
    const trace = exportTrace(advance(freshSession()));
    expect(trace.version).toBe('scheduling-lab/v1');
    trace.result.metrics.admitted = 999;
    const replayed = replayTrace(JSON.stringify(trace));
    expect(exportTrace(replayed)).toEqual(exportTrace(advance(freshSession())));
    expect(() => replayTrace('{}')).toThrow(/version/);
  });
});
