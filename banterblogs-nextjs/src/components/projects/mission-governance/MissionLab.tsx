'use client';
import { useState } from 'react';
import { CheckCheck, CornerDownLeft, Download, Fingerprint, Pause, Play, RotateCcw, ShieldCheck, SkipForward, Square, X, Zap, ArrowRight } from 'lucide-react';
import { applyCommand, createSession, FAULT_LABELS, TRANSITIONS, type Command, type Fault, type Mission } from '@/lib/projects/mission-governance/engine';
import { DEFAULT_MISSION, TEMPLATES } from '@/lib/projects/mission-governance/fixtures';
import { makeBundle, verifyBundle, type Bundle, type Verification } from '@/lib/projects/mission-governance/replay';
import { MissionEditor } from './MissionEditor';
import { MissionFigure } from './MissionFigure';
import styles from './mission.module.css';

export function MissionLab() {
  const [session,setSession]=useState(()=>createSession(DEFAULT_MISSION));
  const [template,setTemplate]=useState<keyof typeof TEMPLATES>('patrol');
  const [fault,setFault]=useState<Fault>('battery');
  const [revision,setRevision]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [bundle,setBundle]=useState<Bundle|null>(null);
  const [verification,setVerification]=useState<Verification|null>(null);
  const [importText,setImportText]=useState('');
  const terminal=TRANSITIONS[session.state].length===0;
  function command(c:Command) {
    setError('');setNotice('');
    try { setSession(applyCommand(session,c));setBundle(null);setVerification(null); }
    catch (cause) { const message=cause instanceof Error?cause.message:'Mission command failed.';console.error('Mission lab:',message);setError(message); }
  }
  function reset(mission:Mission) {
    setSession(createSession(mission));setRevision(revision+1);setBundle(null);setVerification(null);setError('');setNotice('New draft mission; earlier validation and approval cleared.');
  }
  async function artifact(action:'export'|'verify'|'import') {
    setBusy(true);setError('');setNotice('');
    try {
      if (action==='import') {
        if (importText.length>1000000) throw new Error('Replay input exceeds the 1 MB limit.');
        setVerification(await verifyBundle(JSON.parse(importText)));
      } else {
        const result=await makeBundle(session);setBundle(result);
        if (action==='verify') setVerification(await verifyBundle(result));
        else {
          const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{ type:'application/json' }));
          const link=document.createElement('a');link.href=url;link.download='synthetic-mission-replay.json';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);setNotice('Replay bundle exported.');
        }
      }
    } catch (cause) { const message=cause instanceof Error?cause.message:'Replay operation failed.';console.error('Mission artifact:',message);setError(message); }
    finally { setBusy(false); }
  }
  return <div className={styles.lab}>
    <div className={styles.fixtureBar}>
      <label>Synthetic mission fixture<select aria-label="Synthetic mission fixture" disabled={busy} value={template} onChange={e=>setTemplate(e.target.value as keyof typeof TEMPLATES)}><option value="patrol">Four-waypoint patrol</option><option value="concave">Concave geofence</option><option value="boundary">Boundary + altitude failure</option></select></label>
      <button disabled={busy} onClick={()=>reset(TEMPLATES[template])}><ArrowRight size={16}/>Load fixture</button>
      <button disabled={busy} aria-label="Reset mission" title="Reset active mission" onClick={()=>reset(session.mission)}><RotateCcw size={17}/></button>
    </div>
    <div className={styles.commands}>
      <button disabled={busy||session.state!=='draft'} aria-label="Validate mission" onClick={()=>command({ type:'validate' })}><CheckCheck size={16}/>Validate</button>
      <button disabled={busy||session.state!=='awaiting_approval'} aria-label="Approve simulation" onClick={()=>command({ type:'approve' })}><ShieldCheck size={16}/>Approve</button>
      <button disabled={busy||session.state!=='approved'} aria-label="Start simulation" onClick={()=>command({ type:'start' })}><Play size={16}/>Start</button>
      <button disabled={busy||session.state!=='executing'} aria-label="Step mission" onClick={()=>command({ type:'step' })}><SkipForward size={16}/>Step</button>
      <button disabled={busy||!['executing','paused'].includes(session.state)} aria-label={session.state==='paused'?'Resume mission':'Pause mission'} title={session.state==='paused'?'Resume mission':'Pause mission'} onClick={()=>command({ type:session.state==='paused'?'resume':'pause' })}>{session.state==='paused'?<Play size={17}/>:<Pause size={17}/>}</button>
      <button disabled={busy||!['executing','paused','rtl'].includes(session.state)} aria-label="Return to launch" title="Return to launch (mock)" onClick={()=>command({ type:'return' })}><CornerDownLeft size={17}/></button>
    </div>
    <div className={styles.status} aria-live="polite" aria-atomic="true">
      <div><span>Mission state</span><strong data-testid="mission-state">{session.state}</strong></div>
      <div><span>Mock progress</span><strong data-testid="mission-progress">{session.progress} / {session.mission.waypoints.length}</strong></div>
      <div><span>Clock / mode</span><strong>{(session.clockMs/1000).toFixed(1)}s / {session.adapter.mode}</strong></div>
    </div>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <div className={styles.visualGrid}>
      <MissionFigure session={session}/>
      <section className={styles.health} aria-label="Synthetic health and fault injection">
        <h2>Runtime health</h2><dl>
          <div><dt>Battery / floor</dt><dd>{session.health.battery}% / {session.mission.minBattery}%</dd></div>
          <div><dt>Link / cutoff</dt><dd>{session.health.link.toFixed(2)} / 0.30</dd></div>
          <div><dt>Telemetry / limit</dt><dd>{session.health.available?`${session.health.ageMs} / ${session.mission.freshnessMs} ms`:'Missing'}</dd></div>
          <div><dt>Estimator</dt><dd>{session.health.estimator}</dd></div>
          <div><dt>Armed / in air</dt><dd>{String(session.adapter.armed)} / {String(session.adapter.inAir)}</dd></div>
        </dl>
        <div className={styles.faultBar}><label>Fault scenario<select aria-label="Fault scenario" value={fault} disabled={busy||terminal} onChange={e=>setFault(e.target.value as Fault)}>{Object.entries(FAULT_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button disabled={busy||terminal} aria-label="Inject fault" onClick={()=>command({ type:'fault',fault })}><Zap size={16}/>Inject</button></div>
        <div className={styles.secondaryCommands}><button disabled={busy||!['executing','paused'].includes(session.state)} aria-label="Abort mission" onClick={()=>command({ type:'abort' })}><Square size={16}/>Abort</button><button disabled={busy||session.state!=='awaiting_approval'} aria-label="Reject approval" onClick={()=>command({ type:'reject' })}><X size={16}/>Reject approval</button></div>
      </section>
    </div>
    <MissionEditor key={revision} mission={session.mission} disabled={busy} onApply={reset}/>
    <section className={styles.checkSection} aria-label="Validation evidence">
      <div className={styles.sectionHead}><h2>Validation evidence</h2><span>{session.approval??'No synthetic approval'}</span></div>
      {!session.checks.length?<p className={styles.muted}>Validation not run.</p>:<ul className={styles.checks}>{session.checks.map(c=><li key={c.name}><span className={c.status==='failed'?styles.red:c.status==='warning'?styles.amber:styles.green}>{c.status}</span><strong>{c.name.replaceAll('_',' ')}</strong><code>{c.reason}</code></li>)}</ul>}
    </section>
    <section className={styles.traceSection} aria-label="Mission event trace">
      <div className={styles.sectionHead}><h2>Event trace</h2><span>{session.events.length} events / {session.journal.length} commands</span></div>
      <ol className={styles.events}>{session.events.map(e=><li key={e.seq}>
        <span className={styles.eventTime}>#{e.seq} / {(e.clockMs/1000).toFixed(1)}s</span><div><strong>{e.prior??'created'} <ArrowRight size={12}/> {e.next}</strong><code>{e.reason}</code><span>{e.kind} / {e.actor}</span></div>
      </li>)}</ol>
    </section>
    <section className={styles.replay} aria-label="Replay and content integrity">
      <div className={styles.sectionHead}><h2>Replay integrity</h2><div className={styles.secondaryCommands}><button disabled={busy} aria-label="Verify replay" onClick={()=>void artifact('verify')}><Fingerprint size={16}/>Verify replay</button><button disabled={busy} aria-label="Export replay" onClick={()=>void artifact('export')}><Download size={16}/>Export</button></div></div>
      {verification&&<p role="status" className={verification.valid?styles.green:styles.red}>{verification.reason}</p>}
      {bundle&&<dl className={styles.hashes}>{Object.entries(bundle.manifest).map(([name,hash])=><div key={name}><dt>{name}</dt><dd>{hash}</dd></div>)}</dl>}
      <details className={styles.import}><summary>Verify an exported bundle</summary><label>Replay bundle JSON<textarea aria-label="Replay bundle JSON" rows={6} spellCheck={false} maxLength={1000000} disabled={busy} value={importText} onChange={e=>setImportText(e.target.value)}/></label><button disabled={busy||!importText.trim()} onClick={()=>void artifact('import')}><Fingerprint size={16}/>Verify imported bundle</button></details>
    </section>
    <p role="status" className={styles.notice}>{busy?'Computing SHA-256 and replay...':notice}</p>
  </div>;
}
