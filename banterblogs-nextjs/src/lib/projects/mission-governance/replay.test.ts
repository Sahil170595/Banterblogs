import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { canonicalJson, makeBundle, sha256, verifyBundle } from './replay';
import { applyCommand, createSession } from './engine';
import { DEFAULT_MISSION } from './fixtures';
beforeAll(() => vi.stubGlobal('crypto', webcrypto));
describe('SHA-256 content manifest and deterministic replay', () => {
  it('uses sorted compact JSON and a standard SHA-256 vector', async () => {
    expect(canonicalJson({ z: 1, a: { c: 3, b: 2 } })).toBe('{"a":{"b":2,"c":3},"z":1}');
    expect(await sha256('abc')).toBe('sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('exports all state and replays the journal against recorded events', async () => {
    const s=applyCommand(createSession(DEFAULT_MISSION),{ type:'validate' });
    const bundle=await makeBundle(s);
    expect(bundle.version).toBe('mission-governance.bundle.v1');
    expect(await verifyBundle(bundle)).toMatchObject({ valid: true, state: 'awaiting_approval' });
  });
  it('rejects changed bytes and rehashed but impossible event histories', async () => {
    const bundle=await makeBundle(applyCommand(createSession(DEFAULT_MISSION),{ type:'validate' }));
    const changed=structuredClone(bundle);
    changed.files['events.json']=changed.files['events.json'].replace('validated','executing');
    expect((await verifyBundle(changed)).valid).toBe(false);
    changed.manifest['events.json']=await sha256(changed.files['events.json']);
    expect(await verifyBundle(changed)).toMatchObject({ valid:false, reason:'Replay differs from recorded events or final state.' });
  });
  it('rejects incomplete, unversioned or invalid JSON artifacts', async () => {
    expect((await verifyBundle({})).valid).toBe(false);
    const bundle=await makeBundle(createSession(DEFAULT_MISSION));
    delete (bundle.files as Record<string,string>)['events.json'];
    expect((await verifyBundle(bundle)).valid).toBe(false);
  });
});
