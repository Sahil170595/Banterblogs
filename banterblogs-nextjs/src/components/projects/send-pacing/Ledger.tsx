import { readyAt, type ReplayResult } from '@/lib/projects/send-pacing/scheduler';
import { clockPrecise, signedSeconds, VIOLATION_LABELS } from './format';
import styles from './pacing.module.css';

// Every message's timing, in send order: when preparation started, the
// sampled typing time, when it could first go, where the plan put it, when it
// went, and the slack between going and being ready. The audit's findings
// are in the last column.

const US = 1_000_000;

export function Ledger({ result }: { result: ReplayResult }) {
  const findings = new Map<number, string[]>();
  for (const v of result.violations) findings.set(v.index, [...(findings.get(v.index) ?? []), VIOLATION_LABELS[v.code]]);
  return (
    <div className={styles.tableScroll} role="region" aria-label="Message ledger" tabIndex={0}>
      <table className={styles.ledger}>
        <thead>
          <tr>
            <th scope="col">Message</th>
            <th scope="col">Prepared from</th>
            <th scope="col">Typing</th>
            <th scope="col">Ready</th>
            <th scope="col">Plan</th>
            <th scope="col">Sent</th>
            <th scope="col">Slack</th>
            <th scope="col">Audit</th>
          </tr>
        </thead>
        <tbody>
          {result.schedule.map((row, i) => {
            const ready = readyAt(row);
            const slack = (row.sendTime - ready) / US;
            const planned = Math.min(result.start + Math.round(result.distribution[row.index] * US), result.end);
            const found = findings.get(i) ?? [];
            return (
              <tr key={row.index} data-late={slack < 0 || undefined}>
                <th scope="row">{row.index + 1}</th>
                <td>{clockPrecise(row.preparedFrom)}</td>
                <td>
                  {row.typingDuration.toFixed(1)} s
                  <span>
                    {row.wpm.toFixed(0)} wpm{row.pause > 0 ? ` + ${row.pause.toFixed(1)} s pause` : ''}
                  </span>
                </td>
                <td>{clockPrecise(ready)}</td>
                <td>{row.distributionAdjusted ? clockPrecise(planned) : <span className={styles.muted}>—</span>}</td>
                <td>{clockPrecise(row.sendTime)}</td>
                <td className={styles.slack}>{signedSeconds(slack)}</td>
                <td>{found.length ? found.join(', ') : <span className={styles.muted}>clean</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
