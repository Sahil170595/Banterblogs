import { readyAt, type ReplayResult } from '@/lib/projects/send-pacing/scheduler';
import { controls } from '../controls';
import { clockPrecise, signedSeconds, VIOLATION_LABELS } from './format';
import styles from './pacing.module.css';

// Every message's timing, in send order: when typing started (the previous
// send, which the scheduler prepares it from), the sampled typing time, when
// it was typed by, where the plan put it, when it went, and the margin
// between going and being typed. The audit's findings are in the last column.

const US = 1_000_000;

export const LEDGER_COLUMNS = {
  message: 'Message',
  starts: 'Typing starts',
  typing: 'Typing time',
  ready: 'Typed by',
  plan: 'Planned',
  sent: 'Sent',
  margin: 'Margin',
  audit: 'Audit',
} as const;

export function Ledger({ result }: { result: ReplayResult }) {
  const findings = new Map<number, string[]>();
  for (const v of result.violations) findings.set(v.index, [...(findings.get(v.index) ?? []), VIOLATION_LABELS[v.code]]);
  return (
    <div className={styles.ledgerBlock}>
      <h3 className={styles.blockTitle}>Message ledger</h3>
      <p className={controls.hint}>
        Margin is the time sent minus the time typed by: below zero, the message went before it could have been typed. Planned is the slot the
        campaign plan gave it, when the plan moved it.
      </p>
      <div className={styles.tableScroll} role="region" aria-label="Message ledger" tabIndex={0}>
        <table className={`${styles.ledger} ${controls.stackTable}`} role="table">
          <thead role="rowgroup">
            <tr role="row">
              {Object.values(LEDGER_COLUMNS).map((name) => (
                <th key={name} scope="col" role="columnheader">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {result.schedule.map((row, i) => {
              const ready = readyAt(row);
              const margin = (row.sendTime - ready) / US;
              const planned = Math.min(result.start + Math.round(result.distribution[row.index] * US), result.end);
              const found = findings.get(i) ?? [];
              return (
                <tr key={row.index} role="row" data-late={margin < 0 || undefined}>
                  <th scope="row" role="rowheader">
                    {row.index + 1}
                  </th>
                  <td role="cell" data-label={LEDGER_COLUMNS.starts}>
                    {clockPrecise(row.preparedFrom)}
                  </td>
                  <td role="cell" data-label={LEDGER_COLUMNS.typing}>
                    {/* one value of two lines, so a phone card aligns it like the single-line ones */}
                    <div className={styles.cellValue}>
                      {row.typingDuration.toFixed(1)} s
                      <span>
                        {row.wpm.toFixed(0)} wpm{row.pause > 0 ? ` + ${row.pause.toFixed(1)} s pause` : ''}
                      </span>
                    </div>
                  </td>
                  <td role="cell" data-label={LEDGER_COLUMNS.ready}>
                    {clockPrecise(ready)}
                  </td>
                  <td role="cell" data-label={LEDGER_COLUMNS.plan}>
                    {row.distributionAdjusted ? clockPrecise(planned) : <span className={styles.muted}>—</span>}
                  </td>
                  <td role="cell" data-label={LEDGER_COLUMNS.sent}>
                    {clockPrecise(row.sendTime)}
                  </td>
                  <td role="cell" data-label={LEDGER_COLUMNS.margin} className={styles.slack}>
                    {signedSeconds(margin)}
                  </td>
                  <td role="cell" data-label={LEDGER_COLUMNS.audit}>
                    {found.length ? found.join(', ') : <span className={styles.muted}>clean</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
