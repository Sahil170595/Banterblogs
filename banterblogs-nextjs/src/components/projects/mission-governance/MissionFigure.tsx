import { pointInside, type Session } from '@/lib/projects/mission-governance/engine';
import styles from './mission.module.css';
export function MissionFigure({ session:s }: { session:Session }) {
  const points=[...s.mission.geofence,...s.mission.waypoints.map(w=>[w.x,w.y]),[s.position.x,s.position.y]];
  const minX=Math.min(...points.map(p=>p[0]))-10,maxX=Math.max(...points.map(p=>p[0]))+10;
  const minY=Math.min(...points.map(p=>p[1]))-10,maxY=Math.max(...points.map(p=>p[1]))+10;
  const scale=Math.min(440/(maxX-minX),220/(maxY-minY));
  const x=(v:number)=>40+(v-minX)*scale+(440-(maxX-minX)*scale)/2;
  const y=(v:number)=>260-(v-minY)*scale;
  return <figure className={styles.figure}>
    <figcaption><strong>Mission geometry</strong><span>Synthetic local grid, metres</span></figcaption>
    <svg viewBox="0 0 520 300" role="img" aria-label={`Synthetic geofence and ${s.mission.waypoints.length} waypoints. Mock progress ${s.progress}; last mock position ${s.position.x}, ${s.position.y}; altitude ${s.position.altitude} metres.`}>
      <path d="M 40 35 V 260 H 480" className={styles.axis} fill="none"/>
      <text x="20" y="30" className={styles.axisLabel}>Y</text><text x="487" y="265" className={styles.axisLabel}>X</text>
      <polygon points={s.mission.geofence.map(([a,b])=>`${x(a)},${y(b)}`).join(' ')} className={styles.geofence}/>
      <polyline points={s.mission.waypoints.map(w=>`${x(w.x)},${y(w.y)}`).join(' ')} className={styles.planned}/>
      {s.progress>0&&<polyline points={s.mission.waypoints.slice(0,s.progress).map(w=>`${x(w.x)},${y(w.y)}`).join(' ')} className={styles.observed}/>}
      {s.mission.waypoints.map((w,i)=><g key={i}>
        <circle cx={x(w.x)} cy={y(w.y)} r="6" className={!pointInside(w.x,w.y,s.mission.geofence)||w.altitude>s.mission.maxAltitude?styles.invalidPoint:i<s.progress?styles.observedPoint:styles.waypoint}/>
        <text x={x(w.x)+10} y={y(w.y)-10} className={styles.pointLabel}>{w.seq} / {w.altitude}m</text>
      </g>)}
      <rect x={x(s.position.x)-10} y={y(s.position.y)-10} width="20" height="20" rx="2" className={styles.position}/>
    </svg>
    <div className={styles.legend}><span className={styles.blue}>Dashed: planned</span><span className={styles.green}>Solid: observed polls</span><span className={styles.red}>Red: invalid waypoint</span><span>Square: last mock position</span></div>
  </figure>;
}
