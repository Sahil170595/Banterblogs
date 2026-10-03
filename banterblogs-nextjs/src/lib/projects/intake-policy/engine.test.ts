import { describe, expect, it } from 'vitest';
import { DEFAULT_CASE, DEFAULT_POLICY, evaluate, exportRun, replayRun } from './engine';

describe('deterministic intake-policy authority', () => {
  it('starts with an ordinary reviewable referral, never autonomous execution', () => {
    const r = evaluate(DEFAULT_CASE, DEFAULT_POLICY);
    expect(r.priority).toBe('P2');
    expect(r.route).toBe('intake-review');
    expect(r.humanReview).toBe(true);
    expect(r.externalEffects).toEqual([]);
  });
  it.each(['possible', 'clear'])('gives care-related safety %s precedence over promotion and negative weights', safety => {
    const r = evaluate({ ...DEFAULT_CASE, request: 'promotion', safety, careRelated: true, actionRequired: false }, DEFAULT_POLICY);
    expect(r.priority).toBe('P0');
    expect(r.gate).toBe('care-safety');
    expect(r.operationalScore).toBeNull();
    expect(r.route).toBe('specialist-review');
    expect(r.draft?.text).not.toMatch(/scheduled|verified|sent|escalated/i);
  });
  it('cannot disable the backstop by selecting no advisory safety signal', () => {
    expect(evaluate({ ...DEFAULT_CASE, backstop: true, safety: 'none' }).priority).toBe('P0');
  });
  it('non-care safety requests specialist review without a P0 event', () => {
    const r = evaluate({ ...DEFAULT_CASE, safety: 'possible', careRelated: false });
    expect(r.priority).toBe('P1');
    expect(r.gate).toBe('general-safety');
    expect(r.route).toBe('specialist-review');
  });
  it('shouting carries no weight, and a today deadline needs a real action', () => {
    expect(evaluate({ ...DEFAULT_CASE, shout: true }).priority).toBe('P2');
    expect(evaluate({ ...DEFAULT_CASE, deadline: 'today' }).priority).toBe('P1');
    expect(evaluate({ ...DEFAULT_CASE, request: 'notice', deadline: 'today', actionRequired: false }).priority).toBe('P2');
  });
  it('retains a change request even when an existing record is known', () => {
    expect(evaluate({ ...DEFAULT_CASE, request: 'change', knownRecord: 'matched', deadline: 'today' }).route).toBe('operations-review');
  });
  it('requires structural fields on new referral cases before resource preview', () => {
    for (const field of Object.keys(DEFAULT_CASE.fields)) {
      const r = evaluate({ ...DEFAULT_CASE, fields: { ...DEFAULT_CASE.fields, [field]: false } });
      expect(r.classification).toBe('incomplete-intake');
      expect(r.missing).toContain(field);
      expect(r.route).toBe('information-followup');
      expect(r.resources).toEqual([]);
    }
  });
  it('requires reconciliation for unknown or conflicting synthetic account status', () => {
    expect(evaluate({ ...DEFAULT_CASE, recordStatus: 'unknown' }).route).toBe('account-review');
    expect(evaluate({ ...DEFAULT_CASE, documentStatus: 'unknown' }).route).toBe('account-review');
    expect(evaluate({ ...DEFAULT_CASE, documentStatus: 'unknown' }).resources).toEqual([]);
    const mismatch = evaluate({ ...DEFAULT_CASE, documentStatus: 'eligible', recordStatus: 'expired' });
    expect(mismatch.route).toBe('account-review');
    expect(mismatch.conflict).toBe(true);
    expect(mismatch.resources).toEqual([]);
    expect(mismatch.draft?.text).not.toMatch(/verified|scheduled/i);
  });
  it('ambiguous matches never become a known record by default', () => {
    const r = evaluate({ ...DEFAULT_CASE, knownRecord: 'ambiguous' });
    expect(r.route).toBe('identity-review');
    expect(r.resources).toEqual([]);
    const absent = evaluate({ ...DEFAULT_CASE, request: 'existing', knownRecord: 'none' });
    expect(absent.route).toBe('identity-review');
    expect(absent.resources).toEqual([]);
  });
  it('uses synthetic program/language/capacity filters for preview only', () => {
    const r = evaluate({ ...DEFAULT_CASE, language: 'alternate', program: 'daily-living' });
    expect(r.resources.length).toBeGreaterThan(0);
    expect(r.resources.every(p => p.language === 'alternate' && p.program === 'daily-living' && p.openings > 0)).toBe(true);
    expect(r.plan.every(p => p.mode === 'proposal' || p.mode === 'local-computation')).toBe(true);
    expect(r.draft?.language).toBe('primary');
    expect(r.draft?.translationRequired).toBe(true);
  });
  it('operational weights change a decision but never a safety gate', () => {
    const c = { ...DEFAULT_CASE, deadline: 'today' };
    expect(evaluate(c).priority).toBe('P1');
    expect(evaluate(c, { ...DEFAULT_POLICY, todayWeight: 1 }).priority).toBe('P2');
    expect(evaluate({ ...c, backstop: true }, { ...DEFAULT_POLICY, todayWeight: 1 }).priority).toBe('P0');
  });
  it.each([{ safety: 'maybe' }, { request: 'unknown' }, { careRelated: 'true' }, { fields: {} }, { patientName: 'identifying data is prohibited' }])('rejects invalid or identifying inputs %j', patch => {
    expect(() => evaluate({ ...DEFAULT_CASE, ...patch })).toThrow();
  });
  it.each([{ todayWeight: NaN }, { todayWeight: -1 }, { fastThreshold: 0 }, { noticeWeight: 1 }, { fastThreshold: 9 }])('rejects invalid policy %j', patch => {
    expect(() => evaluate(DEFAULT_CASE, { ...DEFAULT_POLICY, ...patch })).toThrow();
  });
  it('exports a versioned result with no randomness or external effects and replays it', () => {
    const r = evaluate({ ...DEFAULT_CASE, deadline: 'today' });
    const trace = exportRun(r);
    expect(trace.seed).toBeNull();
    expect(replayRun(JSON.parse(JSON.stringify(trace)))).toEqual(r);
    expect(() => replayRun({ ...trace, version: 'unsupported' })).toThrow();
    expect(() => replayRun({ ...trace, result: { ...r, priority: 'P0' } })).toThrow();
    expect(evaluate(DEFAULT_CASE)).toEqual(evaluate(DEFAULT_CASE));
  });
  it('preserves fixed gates and trace references across all request/safety combinations', () => {
    for (const request of ['referral', 'existing', 'change', 'question', 'billing', 'complaint', 'notice', 'promotion']) {
      for (const safety of ['none', 'possible', 'clear']) {
        for (const careRelated of [false, true]) {
          for (const backstop of [false, true]) {
            const r = evaluate({ ...DEFAULT_CASE, request, safety, careRelated, backstop });
            expect(r.humanReview).toBe(true);
            expect(r.externalEffects).toEqual([]);
            expect(r.plan.flatMap(p => p.evidence).every(id => r.trace.some(t => t.rule === id))).toBe(true);
            if (backstop || (safety !== 'none' && careRelated)) {
              expect(r.priority).toBe('P0');
              expect(r.operationalScore).toBeNull();
              expect(r.resources).toEqual([]);
            }
          }
        }
      }
    }
  });
});
