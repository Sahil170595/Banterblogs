'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Check, ChevronRight, Download, Play, ShieldCheck, SkipForward, Square, Upload } from 'lucide-react';
import { refunded } from '@/lib/projects/customer-service/engine';
import { CLAIMS, MAX_EVENTS, SCENARIOS, TOOL_LABELS, type Claim, type Config, type Event, type ToolName } from '@/lib/projects/customer-service/model';
import { score } from '@/lib/projects/customer-service/reward';
import { PRESETS, type Preset } from '@/lib/projects/customer-service/scripts';
import { controls } from '../controls';
import { percent } from '../geometry';
import { money, signedScore } from './format';
import type { ServiceDemo } from './useServiceDemo';
import styles from './service.module.css';

// The environment under the board: the case, the agent's workbench, the
// world it changes, and the reward that world earns.

const CLAIM_LABELS: Record<Claim, string> = {
  'cancelled-and-refunded': 'Cancelled and fully refunded',
  cancelled: 'Order cancelled',
  'intercept-requested': 'Intercept requested (not confirmed)',
  refunded: 'Refund issued',
  'replacement-created': 'Replacement created',
  'notification-registered': 'Stock alert registered',
  'split-tender': 'Legitimate split tender verified',
  unavailable: 'Order unavailable to this account',
  'no-action': 'No remedy applied',
};
const RESOLUTIONS = ['cancel', 'intercept', 'refund', 'replace', 'notify'] as const;
type Resolution = (typeof RESOLUTIONS)[number];
const RESOLUTION_LABELS: Record<Resolution, string> = {
  cancel: 'Cancel shipment',
  intercept: 'Request carrier intercept',
  refund: 'Refund the selected payment',
  replace: 'Replace in the selected finish',
  notify: 'Wait for a stock alert',
};
const STAGES = [
  { status: 'processing', label: 'Warehouse' },
  { status: 'shipped', label: 'In transit' },
  { status: 'delivered', label: 'Delivered' },
] as const;
const TARGET_ORDER = 'S-410';
const FOREIGN_PAYMENT = 'PAY-Z';
const MISSING_PAYMENT = 'PAY-MISSING';
const STOCK_SLOTS = 6;
const PERCENT = 100;

function eventLabel(event: Event): string {
  const a = event.action;
  if (!a) return 'Invalid command';
  if (a.kind === 'tool') return Object.hasOwn(TOOL_LABELS, a.name) ? TOOL_LABELS[a.name as ToolName] : a.name;
  if (a.kind === 'choice') return `Customer chose: ${RESOLUTION_LABELS[a.resolution]}`;
  if (a.kind === 'report') return `Report: ${CLAIM_LABELS[a.claim]}`;
  return 'Close episode';
}

function Episode({ demo }: { demo: ServiceDemo }) {
  const { session } = demo;
  const [draft, setDraft] = useState({ scenario: session.config.scenario, stock: String(session.config.stock), total: String(session.config.totalCents) });
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const start = (event: FormEvent) => {
    event.preventDefault();
    setError(demo.restart({ scenario: draft.scenario, stock: Number(draft.stock), totalCents: Number(draft.total) }) ?? '');
  };
  const exportJson = () => {
    try {
      const url = URL.createObjectURL(new Blob([demo.exportJson()], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `service-environment-${session.config.scenario}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      console.error('Service environment export failed:', cause);
      setError('The trace could not be exported.');
    }
  };
  const importJson = async (picked?: File) => {
    if (!picked) return;
    setError((await demo.importTrace(picked)) ?? '');
    if (file.current) file.current.value = '';
  };

  return (
    <div className={styles.episode}>
      <form className={styles.episodeForm} onSubmit={start}>
        <label className={controls.field}>
          Case
          <select value={draft.scenario} onChange={(e) => setDraft({ ...draft, scenario: e.target.value as Config['scenario'] })}>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className={controls.field}>
          Preferred-finish stock
          <input type="text" inputMode="numeric" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
        </label>
        <label className={controls.field}>
          Order total (cents)
          <input type="text" inputMode="numeric" value={draft.total} onChange={(e) => setDraft({ ...draft, total: e.target.value })} />
        </label>
        <button type="submit" className={controls.button}>
          New episode
        </button>
        <div className={styles.iconGroup}>
          <button type="button" className={controls.iconButton} aria-label="Export JSON trace" title="Export JSON trace" onClick={exportJson}>
            <Download aria-hidden="true" />
          </button>
          <button type="button" className={controls.iconButton} aria-label="Import and replay a JSON trace" title="Import and replay a JSON trace" onClick={() => file.current?.click()}>
            <Upload aria-hidden="true" />
          </button>
          <input className={styles.fileInput} ref={file} type="file" accept="application/json,.json" aria-label="Trace file" onChange={(e) => void importJson(e.target.files?.[0])} />
        </div>
      </form>
      {error && (
        <p role="alert" className={controls.error}>
          {error}
        </p>
      )}
      <div className={styles.scriptRow}>
        <label className={controls.field}>
          Scripted control
          <select value={demo.preset} onChange={(e) => demo.choosePreset(e.target.value as Preset)}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={controls.button} disabled={demo.scriptIndex !== null && demo.scriptIndex >= demo.script.length} onClick={() => demo.advanceScript(false)}>
          <SkipForward aria-hidden="true" />
          Step
        </button>
        <button type="button" className={controls.button} disabled={demo.scriptIndex !== null && demo.scriptIndex >= demo.script.length} onClick={() => demo.advanceScript(true)}>
          <Play aria-hidden="true" />
          Run script
        </button>
        <span className={controls.hint}>
          {demo.scriptIndex === null ? 'A script starts a fresh episode.' : `${demo.scriptIndex} of ${demo.script.length} scripted actions`}
        </span>
      </div>
    </div>
  );
}

function Workbench({ demo }: { demo: ServiceDemo }) {
  const { session } = demo;
  const closed = session.termination !== 'open';
  const orderPayments = session.world.payments.filter((p) => p.orderId === TARGET_ORDER).map((p) => p.id);
  const [tool, setTool] = useState<ToolName>('order');
  const [orderId, setOrderId] = useState(TARGET_ORDER);
  const [paymentId, setPaymentId] = useState(orderPayments[orderPayments.length - 1]);
  const [amount, setAmount] = useState(String(session.config.totalCents));
  const [sku, setSku] = useState(session.world.inventory[0].sku);
  const [resolution, setResolution] = useState<Resolution>('replace');
  const [claim, setClaim] = useState<Claim>('replacement-created');
  const [raw, setRaw] = useState(`{"kind":"tool","name":"order","args":{"orderId":"${TARGET_ORDER}"}}`);
  const [error, setError] = useState('');
  const amountCents = Number(amount);

  const runTool = () => {
    const args: Record<string, unknown> = tool === 'inventory' ? {} : { orderId };
    if (tool === 'refund') Object.assign(args, { paymentId, amountCents });
    if (tool === 'replace' || tool === 'notify') args.sku = sku;
    demo.act({ kind: 'tool', name: tool, args });
  };
  const runRaw = () => {
    try {
      setError('');
      demo.act(JSON.parse(raw));
    } catch (cause) {
      console.error('Service environment command JSON rejected:', cause);
      setError('That is not valid JSON. Use double-quoted keys and one complete object.');
    }
  };

  return (
    <section className={styles.column} aria-labelledby="service-workbench">
      <h4 id="service-workbench" className={styles.columnTitle}>
        Agent workbench
      </h4>
      <div className={styles.fields}>
        <label className={controls.field}>
          Tool
          <select value={tool} onChange={(e) => setTool(e.target.value as ToolName)}>
            {Object.entries(TOOL_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={controls.field}>
          Order
          <input value={orderId} maxLength={80} onChange={(e) => setOrderId(e.target.value)} />
        </label>
        <label className={controls.field}>
          Payment
          <select value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
            {[...orderPayments, FOREIGN_PAYMENT, MISSING_PAYMENT].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={controls.field}>
          Refund (cents)
          <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className={`${controls.field} ${styles.wide}`}>
          Replacement finish
          <select value={sku} onChange={(e) => setSku(e.target.value)}>
            {session.world.inventory.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.name} · {p.sku}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" className={controls.button} disabled={closed} onClick={runTool}>
        <ChevronRight aria-hidden="true" />
        Run {TOOL_LABELS[tool].toLowerCase()}
      </button>

      <div className={styles.band}>
        <label className={controls.field}>
          Customer choice (scripted)
          <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)}>
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {RESOLUTION_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={controls.button}
          disabled={closed}
          onClick={() =>
            demo.act({
              kind: 'choice',
              resolution,
              orderId,
              ...(resolution === 'refund' ? { paymentId, amountCents } : {}),
              ...(resolution === 'replace' || resolution === 'notify' ? { sku } : {}),
            })
          }
        >
          <Check aria-hidden="true" />
          Record choice
        </button>
        <p className={controls.hint}>
          {session.choice
            ? `Authorized: ${RESOLUTION_LABELS[session.choice.resolution]} · ${session.choice.orderId}${session.choice.paymentId ? ` · ${session.choice.paymentId} · ${money(session.choice.amountCents!)}` : ''}${session.choice.sku ? ` · ${session.choice.sku}` : ''}`
            : 'Nothing authorized yet: every write needs a matching choice.'}
        </p>
      </div>

      <div className={styles.band}>
        <label className={controls.field}>
          Agent report
          <select value={claim} onChange={(e) => setClaim(e.target.value as Claim)}>
            {CLAIMS.map((c) => (
              <option key={c} value={c}>
                {CLAIM_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={controls.button} disabled={closed} onClick={() => demo.act({ kind: 'report', claim, orderId })}>
          <Check aria-hidden="true" />
          Record report
        </button>
      </div>

      <details className={styles.raw}>
        <summary>Raw command</summary>
        <label className={controls.field}>
          JSON payload
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} maxLength={4000} rows={4} spellCheck={false} />
        </label>
        <button type="button" className={controls.button} disabled={closed} onClick={runRaw}>
          Run JSON
        </button>
        {error && (
          <p role="alert" className={controls.error}>
            {error}
          </p>
        )}
      </details>
      <button type="button" className={controls.button} disabled={closed} onClick={() => demo.act({ kind: 'finish' })}>
        <Square aria-hidden="true" />
        Close the episode
      </button>
    </section>
  );
}

function WorldState({ demo }: { demo: ServiceDemo }) {
  const { session } = demo;
  const order = session.world.orders.find((o) => o.id === TARGET_ORDER)!;
  const payments = session.world.payments.filter((p) => p.orderId === TARGET_ORDER);
  const [picked, setPicked] = useState<number | null>(null);
  const shown = session.events.find((e) => e.index === picked) ?? session.events[session.events.length - 1];

  return (
    <section className={styles.column} aria-labelledby="service-world">
      <h4 id="service-world" className={styles.columnTitle}>
        The world <span>{session.termination === 'open' ? 'open' : session.termination.replace('_', ' ')} · {session.events.length} of {MAX_EVENTS} actions</span>
      </h4>
      <ol className={styles.lifecycle} aria-label={`Order ${order.id}: ${order.status}`}>
        {STAGES.map((stage) => (
          <li key={stage.status} data-current={order.status === stage.status || undefined}>
            {stage.label}
          </li>
        ))}
        {order.status === 'cancelled' && <li data-current="">Cancelled</li>}
      </ol>
      <dl className={styles.facts}>
        <div>
          <dt>Return</dt>
          <dd>{session.world.returns.includes(order.id) ? 'Authorized' : 'None'}</dd>
        </div>
        <div>
          <dt>Replacement</dt>
          <dd>{session.world.replacements[0]?.sku ?? 'None'}</dd>
        </div>
        <div>
          <dt>Carrier intercept</dt>
          <dd>{session.world.intercepts.includes(order.id) ? 'Requested, unconfirmed' : 'None'}</dd>
        </div>
        <div>
          <dt>Stock alert</dt>
          <dd>{session.world.notifications[0]?.sku ?? 'None'}</dd>
        </div>
      </dl>

      <h5 className={styles.subTitle}>Captured funds</h5>
      {payments.map((p) => {
        const back = refunded(session.world, p.id);
        return (
          <div key={p.id} className={styles.payment}>
            <div className={styles.paymentHead}>
              <strong>{p.id}</strong>
              <span>
                {money(back)} refunded of {money(p.capturedCents)}
              </span>
            </div>
            <span className={styles.ledgerBar} role="img" aria-label={`${p.id}: ${money(p.capturedCents - back)} kept, ${money(back)} refunded`}>
              <span style={{ width: percent(back / p.capturedCents) }} />
            </span>
          </div>
        );
      })}

      <h5 className={styles.subTitle}>Replacement stock</h5>
      {session.world.inventory.map((p) => (
        <div key={p.sku} className={styles.stock}>
          <span>{p.name}</span>
          <span className={styles.units} role="img" aria-label={`${p.quantity} in stock`}>
            {Array.from({ length: STOCK_SLOTS }, (_, i) => (
              <i key={i} data-filled={i < p.quantity || undefined} />
            ))}
          </span>
          <strong>{p.quantity}</strong>
        </div>
      ))}

      <h5 className={styles.subTitle}>Actions</h5>
      {session.events.length === 0 ? (
        <p className={controls.hint}>No actions yet.</p>
      ) : (
        <ol className={styles.trace} aria-label="Actions">
          {session.events.map((e) => (
            <li key={e.index}>
              <button type="button" aria-pressed={shown?.index === e.index} onClick={() => setPicked(e.index)}>
                <span className={styles.seq}>{String(e.index).padStart(2, '0')}</span>
                <span className={styles.traceText}>
                  <strong>{eventLabel(e)}</strong>
                  <span data-ok={e.result.ok || undefined}>
                    {e.result.code} · {e.changed ? 'changed the world' : 'no change'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {shown && (
        <div className={styles.observation} aria-live="polite">
          <strong>
            #{shown.index} · {shown.impact} impact
          </strong>
          <p>{shown.result.message}</p>
          <details>
            <summary>Input, result and state before and after</summary>
            <pre>{JSON.stringify({ input: shown.input, data: shown.result.data, before: shown.before, after: shown.after }, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  );
}

function Reward({ demo }: { demo: ServiceDemo }) {
  const reward = score(demo.session);
  const deductions = reward.penalties.reduce((n, p) => n + p.value, 0);
  const state = reward.completed ? 'A coherent outcome is complete' : reward.damage ? 'Effects outside every coherent outcome' : 'No outcome complete yet';
  return (
    <section className={styles.column} aria-labelledby="service-reward">
      <h4 id="service-reward" className={styles.columnTitle}>
        Reward <span>{reward.weightsVersion}</span>
      </h4>
      <p className={styles.score} data-tone={reward.completed ? (reward.total < 1 ? 'partial' : 'resolved') : 'failed'} aria-live="polite">
        <output aria-label="Total reward">{signedScore(reward.total)}</output>
        <span>{state}</span>
      </p>
      <dl className={styles.components}>
        {reward.components.map((c) => (
          <div key={c.label}>
            <dt>
              {c.label} <span>× {c.weight.toFixed(1)}</span>
            </dt>
            <dd>
              <span className={styles.meter} aria-hidden="true">
                <span style={{ width: percent(c.value) }} />
              </span>
              {Math.round(c.value * PERCENT)}%
            </dd>
          </div>
        ))}
      </dl>
      <p className={controls.hint}>
        Base {reward.base.toFixed(2)} − deductions {deductions.toFixed(2)}, then the lowest ceiling.
      </p>
      {reward.penalties.map((p) => (
        <p key={p.label} className={styles.adjustment} data-kind="deduction">
          <span>{p.label}</span>
          <strong>−{p.value.toFixed(2)}</strong>
        </p>
      ))}
      {reward.ceilings.map((c) => (
        <p key={c.label} className={styles.adjustment} data-kind="ceiling">
          <span>{c.label}</span>
          <strong>cap {signedScore(c.value)}</strong>
        </p>
      ))}
      <h5 className={styles.subTitle}>Outcome branches</h5>
      <ul className={styles.branches}>
        {reward.branches.map((b) => (
          <li key={b.id} data-complete={b.complete || undefined}>
            <strong>{b.label}</strong>
            <span>
              {b.complete
                ? 'Complete'
                : [!b.stateSatisfied && 'world not in this state', !b.coherentWrites && 'writes outside it', b.eventCoverage < 1 && `${Math.round(b.eventCoverage * PERCENT)}% of its evidence`, !b.reportSatisfied && 'no supported report']
                    .filter(Boolean)
                    .join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      <p className={controls.hint}>One branch at most; credit is never added across alternative remedies.</p>
    </section>
  );
}

export function ServiceLab({ demo }: { demo: ServiceDemo }) {
  const { session } = demo;
  const scenario = SCENARIOS.find((s) => s.id === session.config.scenario)!;
  const configKey = JSON.stringify(session.config);
  return (
    <div className={styles.lab}>
      <div className={styles.brief}>
        <div>
          <h3 className={styles.briefTitle}>{scenario.title}</h3>
          <p className={styles.briefText}>{scenario.request}</p>
        </div>
        <p className={styles.identity}>
          <ShieldCheck aria-hidden="true" />
          <span>
            Signed in as <strong>{session.identity}</strong>
          </span>
        </p>
      </div>
      <Episode key={configKey} demo={demo} />
      <div className={styles.columns}>
        <Workbench key={`bench-${configKey}`} demo={demo} />
        <WorldState key={`world-${configKey}-${session.events.length}`} demo={demo} />
        <Reward demo={demo} />
      </div>
    </div>
  );
}
