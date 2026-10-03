'use client';
import { useState, type FormEvent } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { parseMission, type Mission } from '@/lib/projects/mission-governance/engine';
import styles from './mission.module.css';

const LIMITS=[['maxAltitude','Altitude ceiling (m)',0,120],['minBattery','Battery floor (%)',0,100],['freshnessMs','Freshness limit (ms)',1,10000],['timeoutSeconds','Timeout (seconds)',1,3600]] as const;
export function MissionEditor({ mission,onApply,disabled }: { mission:Mission;onApply:(m:Mission)=>void;disabled:boolean }) {
  const [rows,setRows]=useState(mission.waypoints.map(w=>({ x:String(w.x),y:String(w.y),altitude:String(w.altitude) })));
  const [limits,setLimits]=useState(Object.fromEntries(LIMITS.map(([key])=>[key,String(mission[key])]))) ;
  const [polygon,setPolygon]=useState(JSON.stringify(mission.geofence));
  const [regulatory,setRegulatory]=useState({ complianceEnabled:mission.complianceEnabled,remoteRequired:mission.remoteRequired,remoteStatus:mission.remoteStatus,operationType:mission.operationType,airspaceRef:mission.airspaceRef });
  const [error,setError]=useState('');
  function apply(event:FormEvent) {
    event.preventDefault();setError('');
    try {
      if (rows.some(row=>Object.values(row).some(v=>!v.trim()))||Object.values(limits).some(v=>!v.trim())) throw new Error('Complete all waypoint coordinates, altitudes and limits.');
      const edited=parseMission({ ...mission,...regulatory,...Object.fromEntries(Object.entries(limits).map(([k,v])=>[k,Number(v)])),geofence:JSON.parse(polygon),waypoints:rows.map((w,i)=>({ seq:i+1,x:Number(w.x),y:Number(w.y),altitude:Number(w.altitude) })) });
      onApply(edited);
    } catch (cause) {
      const message=cause instanceof Error?cause.message:'Mission input is not valid.';
      console.error('Mission editor:',message);setError(message);
    }
  }
  return <details className={styles.editor}>
    <summary>Edit mission / Advanced settings</summary>
    <form onSubmit={apply}>
      <fieldset disabled={disabled}>
        <div className={styles.editorRows}>{rows.map((w,i)=><div key={i} className={styles.waypointRow}>
          <strong>{i+1}</strong>{(['x','y','altitude'] as const).map(key=><label key={key}>{key==='altitude'?'Altitude (m)':`${key.toUpperCase()} (m)`}<input aria-label={`Waypoint ${i+1} ${key==='altitude'?'altitude':key.toUpperCase()}`} type="number" required min={key==='altitude'?0:-100} max={key==='altitude'?120:200} step="any" value={w[key]} onChange={e=>setRows(rows.map((r,j)=>j===i?{ ...r,[key]:e.target.value }:r))}/></label>)}
          <button type="button" aria-label={`Remove waypoint ${i+1}`} title={`Remove waypoint ${i+1}`} disabled={rows.length===1} onClick={()=>setRows(rows.filter((_,j)=>j!==i))}><Trash2 size={16}/></button>
        </div>)}</div>
        <button type="button" disabled={rows.length>=12} onClick={()=>setRows([...rows,{ x:'50',y:'50',altitude:'20' }])}><Plus size={16}/>Add waypoint</button>
        <div className={styles.limitGrid}>{LIMITS.map(([key,label,min,max])=><label key={key}>{label}<input aria-label={label} type="number" required min={min} max={max} step={key==='maxAltitude'||key==='minBattery'?'any':'1'} value={limits[key]} onChange={e=>setLimits({ ...limits,[key]:e.target.value })}/></label>)}</div>
        <label>Geofence vertices [X, Y]<textarea aria-label="Geofence vertices" value={polygon} onChange={e=>setPolygon(e.target.value)} rows={3} spellCheck={false}/></label>
        <div className={styles.limitGrid}>
          <label>Remote ID status<select aria-label="Remote ID status" value={regulatory.remoteStatus} onChange={e=>setRegulatory({ ...regulatory,remoteStatus:e.target.value as Mission['remoteStatus'] })}><option>active</option><option>inactive</option><option>unknown</option></select></label>
          <label>Operation type<select aria-label="Operation type" value={regulatory.operationType} onChange={e=>setRegulatory({ ...regulatory,operationType:e.target.value as Mission['operationType'] })}><option>part107</option><option>recreational</option></select></label>
          <label>Fixture authorization reference<input aria-label="Fixture authorization reference" value={regulatory.airspaceRef} onChange={e=>setRegulatory({ ...regulatory,airspaceRef:e.target.value })}/></label>
        </div>
        <div className={styles.checkboxRow}><label><input type="checkbox" checked={regulatory.complianceEnabled} onChange={e=>setRegulatory({ ...regulatory,complianceEnabled:e.target.checked })}/>Compliance checks</label><label><input type="checkbox" checked={regulatory.remoteRequired} onChange={e=>setRegulatory({ ...regulatory,remoteRequired:e.target.checked })}/>Remote ID required</label></div>
        {error&&<p role="alert" className={styles.error}>{error}</p>}
        <button type="submit"><Check size={16}/>Apply edited mission</button>
      </fieldset>
    </form>
  </details>;
}
