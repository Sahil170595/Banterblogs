import { describe,expect,it } from 'vitest';
import cases from './reference-cases.json';
import { applyCommand,canTransition,createSession,pointInside,TRANSITIONS,type Fault,type State } from './engine';
import { DEFAULT_MISSION,TEMPLATES } from './fixtures';
describe('Python-derived reference cases',()=>{
  it('matches every legal and forbidden state pair',()=>{
    expect(TRANSITIONS).toEqual(cases.graph);
    for (const from of Object.keys(cases.graph) as State[]) for (const to of Object.keys(cases.graph) as State[])
      expect(canTransition(from,to)).toBe((cases.graph[from] as string[]).includes(to));
  });
  it.each(cases.execution)('matches executor case $case',c=>{
    let s=createSession({ ...DEFAULT_MISSION,waypoints:DEFAULT_MISSION.waypoints.slice(0,c.count) });
    s=applyCommand(s,{ type:'validate' });s=applyCommand(s,{ type:'approve' });s=applyCommand(s,{ type:'start' });
    s=applyCommand(s,{ type:'fault',fault:c.fault as Fault });
    while (s.state==='executing') s=applyCommand(s,{ type:'step' });
    expect(s.state).toBe(c.state);expect(s.progress).toBe(c.progress);expect(s.events.at(-1)?.reason).toBe(c.reason);
  });
  it.each(cases.validation)('matches validator case $case',c=>{
    let s=applyCommand(createSession(DEFAULT_MISSION),{ type:'fault',fault:c.fault as Fault });
    s=applyCommand(s,{ type:'validate' });
    expect(!s.checks.some(check=>check.status==='failed')).toBe(c.passed);
    expect(s.checks.filter(check=>check.status==='failed').map(check=>check.name)).toEqual(c.failed);
    expect(s.checks.filter(check=>check.status==='warning').map(check=>check.name)).toEqual(c.warnings);
  });
  it('shows the concave geofence segment counterexample without inventing segment enforcement',()=>{
    const s=applyCommand(createSession(TEMPLATES.concave),{ type:'validate' });
    expect(s.state).toBe('awaiting_approval');
    const [a,b]=s.mission.waypoints;
    expect((a.x+b.x)/2).toBe(50);expect((a.y+b.y)/2).toBe(50);
    // Both endpoints are inside; the midpoint lies in the removed notch.
    expect(s.checks[0].status).toBe('passed');
    expect(pointInside(50,50,s.mission.geofence)).toBe(false);
  });
});
