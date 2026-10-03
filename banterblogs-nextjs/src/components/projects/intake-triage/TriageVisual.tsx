import { analyzeInfluence, OPERATIONAL_IDS, type InfluenceReport } from '@/lib/projects/intake-triage/influence';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's influence table at card size. One track per
// signal and a bar for the share of combinations it decides; the safety
// gates are the accent, and urgent wording's track stays empty. Drawn in the
// archive visuals' .rv vocabulary.

const W = 320;
const H = 180;
const PITCH = 15;
const LEFT = 48;
const TRACK = 224;
const BAR = 7;

let report: InfluenceReport | null = null;

export function TriageVisual({ accent = true }: ProjectVisualProps) {
  report ??= analyzeInfluence();
  const { influences, combinations } = report;
  const top = (H - influences.length * PITCH) / 2 + PITCH / 2;
  const tracks: string[] = [];
  const operational: string[] = [];
  const gates: string[] = [];
  influences.forEach(({ signal, decisive }, row) => {
    const y = top + row * PITCH;
    tracks.push(`M${LEFT} ${y}h${TRACK}`);
    const length = Math.round((decisive / combinations) * TRACK);
    if (length > 0) (OPERATIONAL_IDS.includes(signal.id) ? operational : gates).push(`M${LEFT} ${y}h${length}`);
  });
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={tracks.join('')} />
      <path className="d" d={operational.join('')} strokeWidth={BAR} />
      <path className="d h" d={gates.join('')} strokeWidth={BAR} />
    </svg>
  );
}
