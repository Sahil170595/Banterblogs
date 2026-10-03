'use client';

import { businessWindows } from '@/lib/projects/scheduling-lab/engine';
import type { Config, Result } from '@/lib/projects/scheduling-lab/types';
import styles from './lab.module.css';

export default function Timeline({ config, result, selected, enabledIds, onSelect }: { config: Config; result: Result; selected: string; enabledIds: string[]; onSelect: (id: string) => void }) {
  const left = 72, plotWidth = 840, rowHeight = 31, height = result.events.length * rowHeight + 65;
  const x = (time: number) => left + Math.max(0, Math.min(1, (time - result.start) / (result.end - result.start))) * plotWidth;
  return <div className={styles.chartScroll} role="region" aria-label="Scheduling timeline" tabIndex={0}>
    <svg viewBox={`0 0 1000 ${height}`} className={styles.chart} role="group" aria-label="Preparation spans, planned slots, scheduled events and open business windows">
      {businessWindows(config).map(window => <rect key={window.start} x={x(window.start)} y={35} width={x(window.end) - x(window.start)} height={height - 60} className={styles.businessBand} />)}
      {[0, 0.25, 0.5, 0.75, 1].map(fraction => <g key={fraction}><line x1={left + plotWidth * fraction} x2={left + plotWidth * fraction} y1={28} y2={height - 25} className={styles.gridLine} /><text x={left + plotWidth * fraction} y={18} textAnchor="middle" className={styles.tick}>{(config.durationMinutes * fraction).toFixed(config.durationMinutes < 10 ? 1 : 0)}m</text></g>)}
      <line x1={x(result.simulation.clock)} x2={x(result.simulation.clock)} y1={28} y2={height - 25} className={styles.clockLine} />
      {result.events.map((event, index) => {
        const y = 49 + index * rowHeight;
        const bad = result.violations.some(v => v.eventId === event.id);
        const processed = result.simulation.processedIds.includes(event.id);
        const enabled = enabledIds.includes(event.id);
        const typingEnd = event.previousAt + event.typingMs;
        return <g key={event.id} role="button" tabIndex={enabled ? 0 : -1} aria-label={`Select timeline event ${event.id}`} aria-pressed={selected === event.id} aria-disabled={!enabled}
          onClick={() => { if (enabled) onSelect(event.id); }} onKeyDown={e => { if (enabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(event.id); } }} className={styles.chartRow}>
          <rect x={4} y={y - 13} width={988} height={27} className={selected === event.id ? styles.activeChartRow : styles.chartHit} />
          <text x={12} y={y + 4} className={styles.eventId}>{event.id}</text>
          <line x1={left} x2={left + plotWidth} y1={y} y2={y} className={styles.rowLine} />
          <rect x={x(event.previousAt)} y={y - 4} width={Math.max(0, x(typingEnd) - x(event.previousAt))} height={8} className={styles.typingBar} />
          <rect x={x(typingEnd)} y={y - 4} width={Math.max(0, x(event.preparedAt) - x(typingEnd))} height={8} className={styles.pauseBar} />
          <line x1={x(event.plannedAt)} x2={x(event.plannedAt)} y1={y - 8} y2={y + 8} className={styles.plannedTick} />
          {event.scheduledAt === null ? <text x={930} y={y + 4} className={styles.deferredText}>deferred</text> : <circle cx={x(event.scheduledAt)} cy={y} r={processed ? 6 : 4.5} className={bad ? styles.invalidDot : processed ? styles.processedDot : styles.scheduledDot}><title>{`${event.id}: scheduled in simulation at ${new Date(event.scheduledAt).toISOString()}`}</title></circle>}
        </g>;
      })}
      <text x={left} y={height - 7} className={styles.tick}>{config.start.slice(0, 10)} / UTC / elapsed campaign time</text>
    </svg>
  </div>;
}
