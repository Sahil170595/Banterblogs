import { readyAt, type ReplayResult } from '@/lib/projects/send-pacing/scheduler';
import { along, span } from '../geometry';
import { clock } from './format';
import styles from './pacing.module.css';

// The schedule over the campaign: one row per message in send order. A thin
// line is the time from the previous send, when preparation started, to this
// send; a hollow ring is where the plan put it, when the plan moved it; the
// tick is the send, red when it went before the message could be typed.

const US = 1_000_000;
const MINUTE = 60 * US;
const HOUR = 60 * MINUTE;
// room past the end so the last instant's ticks stay inside the track
const RIGHT_PAD = 0.02;

export function Timeline({ result }: { result: ReplayResult }) {
  const late = new Set(result.violations.filter((v) => v.code === 'before_preparation').map((v) => v.index));
  const last = Math.max(result.end, ...result.schedule.map(readyAt), ...result.schedule.map((r) => r.sendTime));
  const from = result.start;
  const to = last + (last - from) * RIGHT_PAD;
  const at = (t: number) => along(t, from, to);
  const step = to - from > 3 * HOUR ? HOUR : 15 * MINUTE;
  const ticks: number[] = [];
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) ticks.push(t);
  return (
    <figure className={styles.timeline} aria-label={`Send times for ${result.schedule.length} messages, ${clock(result.start)} to ${clock(result.end)} UTC`}>
      <div className={styles.axis} aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} style={{ left: at(t) }}>
            {clock(t).slice(0, 5)}
          </span>
        ))}
      </div>
      <div className={styles.plot}>
        <div className={styles.overlay} aria-hidden="true">
          <i className={styles.endLine} style={{ left: at(result.end) }} />
        </div>
        <ol className={styles.rows}>
        {result.schedule.map((row, i) => {
          const planned = Math.min(result.start + Math.round(result.distribution[row.index] * US), result.end);
          return (
            <li key={row.index} data-late={late.has(i) || undefined}>
              <span className={styles.rowLabel}>{row.index + 1}</span>
              <span className={styles.track}>
                {row.sendTime > row.preparedFrom && (
                  <i className={styles.wait} style={span(row.preparedFrom, row.sendTime, from, to)} />
                )}
                {row.distributionAdjusted && <i className={styles.plan} style={{ left: at(planned) }} />}
                <i className={styles.send} style={{ left: at(row.sendTime) }} />
              </span>
            </li>
          );
        })}
        </ol>
      </div>
      <figcaption className={styles.legend}>
        <span>
          <i className={styles.wait} /> waiting since the previous send
        </span>
        <span>
          <i className={styles.plan} /> where the plan put it
        </span>
        <span>
          <i className={styles.send} /> sent
        </span>
        <span data-late="">
          <i className={styles.send} /> sent before it could be typed
        </span>
        <span>
          <i className={styles.endLine} /> campaign end
        </span>
      </figcaption>
    </figure>
  );
}
