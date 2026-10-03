import { describe, expect, it } from 'vitest';
import { freshCorpus } from './corpus';
import { DEFAULT_CONFIG, runRetrieval } from './engine';

describe('synthetic starter corpus', () => {
  it('is validated, reproducible and independently resettable', () => {
    const changed = freshCorpus(); changed[0].title = 'Modified';
    expect(freshCorpus()[0].title).toBe('Search latency under load');
    expect(freshCorpus()).toHaveLength(18);
  });
  it('default run demonstrates meaningful relaxation and channel disagreement', () => {
    const run = runRetrieval(freshCorpus(), DEFAULT_CONFIG);
    expect(run.attempts.map((a) => a.dropped?.field ?? null)).toEqual([null, 'year', 'kind']);
    expect(run.finalFilters.map((f) => f.field)).toEqual(['collection']);
    expect(run.status).toBe('ready');
    expect(run.bodyIds).not.toEqual(run.metadataIds);
    expect(run.rows.some((r) => r.violations.length > 0)).toBe(true);
  });
});
