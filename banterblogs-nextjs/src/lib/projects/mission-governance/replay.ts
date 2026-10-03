import { z } from 'zod';
import { replay, type Session } from './engine';
import { FIXTURE_VERSION } from './fixtures';

const FILES=['mission.json','journal.json','events.json','final-state.json'] as const;
type FileName=typeof FILES[number];
export interface Bundle { version:'mission-governance.bundle.v1';fixtureVersion:typeof FIXTURE_VERSION;files:Record<FileName,string>;manifest:Record<FileName,string>; }
export interface Verification { valid:boolean;reason:string;state?:string;eventCount?:number; }
export function canonicalJson(value:unknown):string {
  function sorted(input:unknown):unknown {
    if (Array.isArray(input)) return input.map(sorted);
    if (input && typeof input==='object') return Object.fromEntries(Object.entries(input).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,v])=>[key,sorted(v)]));
    if (typeof input==='number' && !Number.isFinite(input)) throw new Error('Canonical JSON requires finite numbers.');
    return input;
  }
  const result=JSON.stringify(sorted(value));
  if (result===undefined) throw new Error('Canonical JSON requires a JSON value.');
  return result;
}
export async function sha256(content:string):Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 verification requires a secure browser context (HTTPS or localhost).');
  const bytes=new TextEncoder().encode(content);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return `sha256:${Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')}`;
}
function finalState(s:Session) { const { mission: _mission,journal: _journal,events: _events,...state }=s; void _mission;void _journal;void _events;return state; }
export async function makeBundle(s:Session):Promise<Bundle> {
  const files={ 'mission.json':canonicalJson(s.mission),'journal.json':canonicalJson(s.journal),'events.json':canonicalJson(s.events),'final-state.json':canonicalJson(finalState(s)) };
  const hashes=await Promise.all(FILES.map(async name=>[name,await sha256(files[name])]));
  return { version:'mission-governance.bundle.v1',fixtureVersion:FIXTURE_VERSION,files,manifest:Object.fromEntries(hashes) as Record<FileName,string> };
}
const FileSchema=z.object({ 'mission.json':z.string().max(100000),'journal.json':z.string().max(250000),'events.json':z.string().max(500000),'final-state.json':z.string().max(100000) }).strict();
const ManifestSchema=z.object(Object.fromEntries(FILES.map(name=>[name,z.string().regex(/^sha256:[0-9a-f]{64}$/)])));
const BundleSchema=z.object({ version:z.literal('mission-governance.bundle.v1'),fixtureVersion:z.literal(FIXTURE_VERSION),files:FileSchema,manifest:ManifestSchema.strict() }).strict();
export async function verifyBundle(input:unknown):Promise<Verification> {
  const parsed=BundleSchema.safeParse(input);
  if (!parsed.success) return { valid:false,reason:'Invalid bundle version, fixture or file manifest.' };
  const bundle=parsed.data;
  for (const name of FILES) if (await sha256(bundle.files[name])!==bundle.manifest[name]) return { valid:false,reason:`Content hash mismatch: ${name}.` };
  try {
    const s=replay(JSON.parse(bundle.files['mission.json']),JSON.parse(bundle.files['journal.json']));
    if (canonicalJson(s.events)!==bundle.files['events.json'] || canonicalJson(finalState(s))!==bundle.files['final-state.json']) return { valid:false,reason:'Replay differs from recorded events or final state.' };
    return { valid:true,reason:'All four content hashes and deterministic replay match.',state:s.state,eventCount:s.events.length };
  } catch (cause) {
    const reason=cause instanceof Error?cause.message:'Malformed replay content.';
    console.error('Mission replay verification:',reason);
    return { valid:false,reason:`Invalid replay: ${reason}` };
  }
}
