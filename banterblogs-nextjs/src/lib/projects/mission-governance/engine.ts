import { z } from 'zod';

export const TRANSITIONS = {
  draft:['validated'], validated:['awaiting_approval','rejected'], awaiting_approval:['approved','rejected'],
  approved:['staging','expired'], staging:['executing','failed'],
  executing:['paused','rtl','aborted','completed','failed','manual_handover'],
  paused:['resuming','rtl','aborted','manual_handover'], resuming:['executing'], rtl:['completed','failed'],
  manual_handover:['paused'], aborted:[], completed:[], failed:[], rejected:[], expired:[],
} as const;
export type State = keyof typeof TRANSITIONS;
export type Fault = 'healthy'|'battery'|'link'|'estimator'|'stale'|'missing'|'timeout'|'upload'|'start';
export const FAULT_LABELS: Record<Fault,string> = { healthy:'Healthy telemetry',battery:'Low battery',link:'Poor link',estimator:'Estimator fault',stale:'Stale telemetry',missing:'Missing telemetry',timeout:'Mission timeout',upload:'Upload failure',start:'Arm / start failure' };
export interface Waypoint { seq:number; x:number; y:number; altitude:number; }
export interface Mission {
  missionId:string; approvalRef:string; geofence:[number,number][]; waypoints:Waypoint[];
  maxAltitude:number; minBattery:number; freshnessMs:number; timeoutSeconds:number;
  complianceEnabled:boolean; remoteRequired:boolean; remoteStatus:'active'|'inactive'|'unknown';
  operationType:'part107'|'recreational'; airspaceRef:string;
}
const coordinate = z.number().finite().min(-100).max(200);
const syntheticRef = z.string().regex(/^synthetic-[a-z0-9-]{1,64}$/);
export const MissionSchema = z.object({
  missionId:syntheticRef, approvalRef:syntheticRef,
  geofence:z.array(z.tuple([coordinate,coordinate])).min(3).max(12),
  waypoints:z.array(z.object({ seq:z.number().int().min(1).max(100),x:coordinate,y:coordinate,altitude:z.number().finite().min(0).max(120) }).strict()).min(1).max(12),
  maxAltitude:z.number().finite().min(0).max(120), minBattery:z.number().finite().min(0).max(100),
  freshnessMs:z.number().int().min(1).max(10000), timeoutSeconds:z.number().int().min(1).max(3600),
  complianceEnabled:z.boolean(),remoteRequired:z.boolean(),remoteStatus:z.enum(['active','inactive','unknown']),
  operationType:z.enum(['part107','recreational']),airspaceRef:z.string().max(80).refine(s => !s || /^synthetic-[a-z0-9-]+$/.test(s),'Use an empty or synthetic- reference.'),
}).strict();
export const CommandSchema = z.union([
  z.object({ type:z.enum(['validate','approve','reject','start','step','pause','resume','return','abort']) }).strict(),
  z.object({ type:z.literal('fault'),fault:z.enum(['healthy','battery','link','estimator','stale','missing','timeout','upload','start']) }).strict(),
]);
export type Command = z.infer<typeof CommandSchema>;
export interface Health { available:boolean; battery:number; link:number; estimator:string; ageMs:number; }
export interface Check { name:string; status:'passed'|'failed'|'warning'; reason:string; }
export interface Event { seq:number; clockMs:number; kind:'created'|'transition'|'validation'|'fault'|'poll'|'warning'; prior:State|null; next:State; actor:string; reason:string; }
export interface Session {
  mission:Mission; state:State; clockMs:number; stagedAt:number|null; progress:number; position:Waypoint;
  health:Health; adapter:{ armed:boolean;inAir:boolean;mode:string;failure:'none'|'upload'|'start' };
  checks:Check[]; approval:string|null; events:Event[]; journal:Command[];
}
export const POLL_MS = 100;
export const MAX_COMMANDS = 256;
export function parseMission(input:unknown):Mission {
  const result=MissionSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues.map(i=>`${i.path.join('.') || 'Mission'}: ${i.message}`).join(' '));
  return result.data;
}
export function createSession(input:unknown):Session {
  return { mission:parseMission(input),state:'draft',clockMs:0,stagedAt:null,progress:0,position:{ seq:0,x:0,y:0,altitude:0 },
    health:{ available:true,battery:90,link:.95,estimator:'nominal',ageMs:50 },
    adapter:{ armed:false,inAir:false,mode:'idle',failure:'none' },checks:[],approval:null,events:[{ seq:1,clockMs:0,kind:'created',prior:null,next:'draft',actor:'fixture',reason:'mission.created' }],journal:[] };
}
export function canTransition(from:State,to:State):boolean { return (TRANSITIONS[from] as readonly string[]).includes(to); }
export function pointInside(x:number,y:number,polygon:[number,number][]):boolean {
  let inside=false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [xi,yi]=polygon[i], [xj,yj]=polygon[j];
    if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
export function validateMission(mission:Mission,health:Health):Check[] {
  const outside=mission.waypoints.find(w=>!pointInside(w.x,w.y,mission.geofence));
  const over=mission.waypoints.find(w=>w.altitude>mission.maxAltitude);
  const check=(name:string,failed:boolean,reason:string):Check=>({ name,status:failed?'failed':'passed',reason:failed?reason:'ok' });
  const checks:Check[]=[check('geofence_containment',!!outside,`waypoint_seq_${outside?.seq}_outside_geofence`),check('altitude_limit',!!over,`waypoint_seq_${over?.seq}_exceeds_${mission.maxAltitude}m`)];
  if (!health.available) checks.push(...['battery_threshold','telemetry_freshness'].map(name=>({ name,status:'warning' as const,reason:'no_telemetry_available' })));
  else checks.push(check('battery_threshold',health.battery<mission.minBattery,`battery_${health.battery}_below_${mission.minBattery}`),check('telemetry_freshness',health.ageMs>mission.freshnessMs,`telemetry_age_${health.ageMs}ms_exceeds_${mission.freshnessMs}ms`));
  if (mission.complianceEnabled) {
    if (mission.remoteRequired) checks.push(check('remote_id_compliance',mission.remoteStatus!=='active',`remote_id_${mission.remoteStatus}`));
    if (mission.operationType==='part107') checks.push({ name:'airspace_authorization',status:mission.airspaceRef?'passed':'warning',reason:mission.airspaceRef?'ok':'no_airspace_auth_ref' });
  }
  return checks;
}
export function safetyViolation(s:Session):string|null {
  if (!s.health.available) return 'blocked.no_telemetry';
  if (s.health.battery<s.mission.minBattery) return 'degraded.battery_low';
  if (s.health.link<.3) return 'degraded.link_quality';
  if (!['nominal','good','ok'].includes(s.health.estimator)) return 'degraded.estimator';
  if (s.health.ageMs>s.mission.freshnessMs) return 'blocked.telemetry_stale';
  if (s.stagedAt!==null && s.clockMs-s.stagedAt>s.mission.timeoutSeconds*1000) return 'timeout.mission';
  return null;
}
function emit(s:Session,kind:Event['kind'],actor:string,reason:string,next:State=s.state) {
  s.events.push({ seq:s.events.length+1,clockMs:s.clockMs,kind,prior:s.state,next,actor,reason });
}
function transition(s:Session,next:State,actor:string,reason:string) {
  if (!canTransition(s.state,next)) throw new Error(`Cannot transition ${s.state} to ${next}.`);
  emit(s,'transition',actor,reason,next); s.state=next;
}
function rtl(s:Session,actor:string,reason:string) {
  transition(s,'rtl',actor,reason);
  s.adapter={ ...s.adapter,mode:'rtl',armed:false,inAir:false };
}
export function applyCommand(previous:Session,input:unknown):Session {
  const parsed=CommandSchema.safeParse(input);
  if (!parsed.success) throw new Error('Choose a supported mission command or fault.');
  const command=parsed.data;
  if (previous.journal.length>=MAX_COMMANDS) throw new Error(`Replay limit ${MAX_COMMANDS} commands reached. Export and reset the mission.`);
  const s:Session=JSON.parse(JSON.stringify(previous));
  if (TRANSITIONS[s.state].length===0) throw new Error(`Mission ${s.state} is terminal. Reset to create a new mission.`);
  if (command.type==='fault') {
    const fault=command.fault;
    if (fault==='healthy') { s.health=createSession(s.mission).health; s.adapter.failure='none'; }
    if (fault==='battery') s.health.battery=Math.max(0,s.mission.minBattery-1);
    if (fault==='link') s.health.link=.2;
    if (fault==='estimator') s.health.estimator='fault';
    if (fault==='stale') s.health.ageMs=s.mission.freshnessMs+1;
    if (fault==='missing') s.health.available=false;
    if (fault==='timeout') s.clockMs=(s.stagedAt??0)+s.mission.timeoutSeconds*1000+1;
    if (fault==='upload'||fault==='start') s.adapter.failure=fault;
    emit(s,'fault','synthetic_fixture',`fixture.${fault}`);
  } else if (command.type==='validate') {
    if (s.state!=='draft') throw new Error(`Validation is only available in draft, not ${s.state}. Apply edited mission to reset approval.`);
    s.checks=validateMission(s.mission,s.health);
    emit(s,'validation','validator',s.checks.some(c=>c.status==='failed')?'validation.failed':'validation.passed');
    if (!s.checks.some(c=>c.status==='failed')) { transition(s,'validated','validator','mission.validated');transition(s,'awaiting_approval','validator','mission.awaiting_approval'); }
  } else if (command.type==='approve') {
    transition(s,'approved','synthetic_operator','mission.approved');s.approval=s.mission.approvalRef;
  } else if (command.type==='reject') transition(s,'rejected','synthetic_operator','approval.rejected');
  else if (command.type==='start') {
    transition(s,'staging','executor','mission.staging');s.stagedAt=s.clockMs;
    if (s.adapter.failure==='upload') transition(s,'failed','executor','staging.upload_failed');
    else {
      transition(s,'executing','executor','mission.executing');
      if (s.adapter.failure==='start') transition(s,'failed','executor','staging.start_failed');
      else s.adapter={ ...s.adapter,armed:true,inAir:true,mode:'mission' };
    }
  } else if (command.type==='step') {
    if (s.state!=='executing') throw new Error(`Cannot step while ${s.state}.`);
    s.clockMs+=POLL_MS;s.position={ ...s.mission.waypoints[s.progress] };s.progress++;
    emit(s,'poll','mock_adapter','mock.waypoint_poll');
    if (s.progress>=s.mission.waypoints.length) {
      s.adapter={ ...s.adapter,armed:false,inAir:false,mode:'landed' };transition(s,'completed','executor','mission.completed');
    } else {
      const violation=safetyViolation(s);
      if (violation?.startsWith('degraded.')||violation?.startsWith('timeout.')) rtl(s,'safety_guard',violation);
      else if (violation) emit(s,'warning','safety_guard',violation);
    }
  } else if (command.type==='pause') {
    if (s.state!=='paused') { transition(s,'paused','synthetic_operator','operator.pause');s.adapter.mode='hold'; }
  } else if (command.type==='resume') {
    transition(s,'resuming','synthetic_operator','operator.resume');
    transition(s,'executing','executor','mission.resumed');
    if (s.adapter.failure==='start') transition(s,'failed','executor','resume.adapter_failed');
    else s.adapter.mode='mission';
  } else if (command.type==='return') {
    if (s.state!=='rtl') rtl(s,'synthetic_operator','operator.rtl');
  } else if (command.type==='abort') { transition(s,'aborted','synthetic_operator','operator.abort');s.adapter={ ...s.adapter,armed:false,inAir:false,mode:'land' }; }
  s.journal.push(command);
  return s;
}
export function replay(mission:unknown,journal:unknown):Session {
  const commands=z.array(CommandSchema).max(MAX_COMMANDS).parse(journal);
  return commands.reduce((s,c)=>applyCommand(s,c),createSession(mission));
}
