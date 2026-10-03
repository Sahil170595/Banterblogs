'use client';

import { useRef, useState, type FormEvent, type RefObject } from 'react';
import { Check, ChevronRight, Download, Play, ShieldCheck, SkipForward, Square, Upload } from 'lucide-react';
import { backsClaim } from '@/lib/projects/customer-service/claims';
import { refunded } from '@/lib/projects/customer-service/engine';
import {
  CLAIMS,
  MAX_EVENTS,
  SCENARIOS,
  TOOL_LABELS,
  type Claim,
  type Config,
  type Event,
  type Session,
  type ToolName,
} from '@/lib/projects/customer-service/model';
import { score, SCORE_CEILING, SCORE_FLOOR } from '@/lib/projects/customer-service/reward';
import { PRESETS, type Preset } from '@/lib/projects/customer-service/scripts';
import { controls, UnderTheHood } from '../controls';
import { percent } from '../geometry';
import { money, signedScore } from './format';
import type { ServiceDemo } from './useServiceDemo';
import styles from './service.module.css';

// The environment under the board: the case, the world the loaded trajectory
// changed and the reward that world earns; under the hood, the controls to
// start a fresh episode and act as the agent by hand.

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
const CAPTURE_ORDINALS = ['first', 'second'];

/** a result code, glossed; the code itself stays beside it */
const RESULT_GLOSSES: Record<string, string> = {
  consent_required: 'Refused: no customer choice matches this write',
  not_found_or_unavailable: 'Refused: not available to this account',
  policy_denied: 'Refused by the shop rules',
  invalid_arguments: 'Refused: arguments the tool does not accept',
  unknown_tool: 'Refused: no such tool',
  idempotent_replay: 'Already recorded: no second effect',
  choice_recorded: 'Customer choice recorded',
  finished: 'Episode closed',
};
const IMPACT_GLOSSES: Record<Event['impact'], string> = {
  read: 'looks, changes nothing',
  reversible: 'a change that can be undone',
  external: 'moves money or goods, or calls the carrier',
};
/** results whose message is the parser's own wording, kept under the details */
const RAW_MESSAGE_CODES = new Set(['invalid_arguments', 'unknown_tool']);

/** a payment id with what it is, so the trace says which capture was refunded */
function paymentName(session: Session, id: string): string {
  const own = session.world.payments.filter((p) => p.orderId === TARGET_ORDER).map((p) => p.id);
  const at = own.indexOf(id);
  if (at >= 0) return `${id} (${CAPTURE_ORDINALS[at] ?? `#${at + 1}`} capture)`;
  if (id === FOREIGN_PAYMENT) return `${id} (another account’s capture)`;
  return `${id} (no such capture)`;
}

function eventLabel(session: Session, event: Event): string {
  const a = event.action;
  if (!a) return 'Invalid command';
  if (a.kind === 'tool') {
    const name = Object.hasOwn(TOOL_LABELS, a.name) ? TOOL_LABELS[a.name as ToolName] : a.name;
    const { paymentId, amountCents } = a.args;
    return a.name === 'refund' && typeof paymentId === 'string' && typeof amountCents === 'number'
      ? `${name}: ${money(amountCents)} on ${paymentName(session, paymentId)}`
      : name;
  }
  if (a.kind === 'choice') return `Customer chose: ${RESOLUTION_LABELS[a.resolution]}${a.paymentId ? `, ${paymentName(session, a.paymentId)}` : ''}`;
  if (a.kind === 'report') return `Report: ${CLAIM_LABELS[a.claim]}`;
  return 'Close episode';
}

function resultGloss(session: Session, event: Event): string {
  const known = RESULT_GLOSSES[event.result.code];
  if (known) return known;
  const a = event.action;
  if (a?.kind === 'report')
    return backsClaim(event.before, a.claim, a.orderId, session.identity) ? 'The world supports this report' : 'The world contradicts this report';
  return event.changed ? 'Changed the world' : 'Read only, no change';
}

/** the form's starting values: what the loaded trajectory last chose and reported, so the form never contradicts the trace */
function draftFrom(session: Session, orderPayments: string[]) {
  const choice = session.choice;
  const lastTool = session.events.flatMap((e) => (e.action?.kind === 'tool' ? [e.action] : [])).at(-1);
  const lastReport = session.events.flatMap((e) => (e.action?.kind === 'report' ? [e.action] : [])).at(-1);
  const lastOrder = typeof lastTool?.args.orderId === 'string' ? lastTool.args.orderId : TARGET_ORDER;
  return {
    tool: lastTool && Object.hasOwn(TOOL_LABELS, lastTool.name) ? (lastTool.name as ToolName) : 'order',
    orderId: choice?.orderId ?? lastOrder,
    paymentId: choice?.paymentId ?? orderPayments[orderPayments.length - 1],
    amount: String(choice?.amountCents ?? session.config.totalCents),
    sku: choice?.sku ?? session.world.inventory[0].sku,
    resolution: (choice?.resolution ?? 'replace') as Resolution,
    claim: lastReport?.claim ?? 'replacement-created',
  };
}

function Episode({ demo }: { demo: ServiceDemo }) {
  const { session } = demo;
  const [draft, setDraft] = useState({
    scenario: session.config.scenario,
    stock: String(session.config.stock),
    total: String(session.config.totalCents),
  });
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
      <p className={controls.hint}>An episode is one run of the environment from a fresh fixture, until it is closed or stopped.</p>
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
            <span className={controls.iconLabel}>Export JSON trace</span>
          </button>
          <button
            type="button"
            className={controls.iconButton}
            aria-label="Import and replay a JSON trace"
            title="Import and replay a JSON trace"
            onClick={() => file.current?.click()}
          >
            <Upload aria-hidden="true" />
            <span className={controls.iconLabel}>Import and replay a JSON trace</span>
          </button>
          <input
            className={styles.fileInput}
            ref={file}
            type="file"
            accept="application/json,.json"
            aria-label="Trace file"
            onChange={(e) => void importJson(e.target.files?.[0])}
          />
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
        <button
          type="button"
          className={controls.button}
          disabled={demo.scriptIndex !== null && demo.scriptIndex >= demo.script.length}
          onClick={() => demo.advanceScript(false)}
        >
          <SkipForward aria-hidden="true" />
          Step
        </button>
        <button
          type="button"
          className={controls.button}
          disabled={demo.scriptIndex !== null && demo.scriptIndex >= demo.script.length}
          onClick={() => demo.advanceScript(true)}
        >
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
  const [initial] = useState(() => draftFrom(session, orderPayments));
  const [tool, setTool] = useState<ToolName>(initial.tool);
  const [orderId, setOrderId] = useState(initial.orderId);
  const [paymentId, setPaymentId] = useState(initial.paymentId);
  const [amount, setAmount] = useState(initial.amount);
  const [sku, setSku] = useState(initial.sku);
  const [resolution, setResolution] = useState<Resolution>(initial.resolution);
  const [claim, setClaim] = useState<Claim>(initial.claim);
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
      console.warn('Service environment command JSON rejected:', cause);
      setError('That is not valid JSON. Use double-quoted keys and one complete object.');
    }
  };

  return (
    <section className={styles.column} aria-labelledby="service-workbench">
      <h4 id="service-workbench" className={styles.columnTitle}>
        Agent workbench <span>Act as the agent: every tool call goes through the same checks as the scripts.</span>
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
              <option key={p} value={p}>
                {paymentName(session, p)}
              </option>
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
        The world{' '}
        <span>
          the order records the tools read and change · {session.termination === 'open' ? 'open' : session.termination.replace('_', ' ')} ·{' '}
          {session.events.length} of {MAX_EVENTS} actions
        </span>
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
              <strong>{paymentName(session, p.id)}</strong>
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
                  <strong>{eventLabel(session, e)}</strong>
                  <span data-ok={e.result.ok || undefined}>
                    {resultGloss(session, e)} · <code>{e.result.code}</code>
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
            #{shown.index} · {shown.impact} impact: {IMPACT_GLOSSES[shown.impact]}
          </strong>
          <p>{RAW_MESSAGE_CODES.has(shown.result.code) ? `${resultGloss(session, shown)}.` : shown.result.message}</p>
          <details>
            <summary>Input, result and state before and after</summary>
            <pre>
              {JSON.stringify(
                {
                  input: shown.input,
                  result: { code: shown.result.code, message: shown.result.message, data: shown.result.data },
                  before: shown.before,
                  after: shown.after,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}

const COMPONENT_GLOSSES: Record<string, string> = {
  Outcome: 'the world reached an acceptable outcome',
  'Prior evidence': 'share of writes made after the reads they need and a matching customer choice',
  'Supported report': 'earned only when the case is resolved and no report contradicted the world',
};

/** the reward in one sentence: which state the episode ended in and the cap that held it */
function explain(reward: ReturnType<typeof score>): string {
  const cap = reward.ceilings.length ? Math.min(...reward.ceilings.map((c) => c.value)) : SCORE_CEILING;
  if (reward.completed) {
    const credit = reward.branches.find((b) => b.id === reward.selectedBranch)?.credit ?? SCORE_CEILING;
    return credit < SCORE_CEILING
      ? `A partial remedy: the request is made but nothing is delivered, so the outcome counts for ${credit} of ${SCORE_CEILING} and the reward is held at ${signedScore(cap)}.`
      : 'Resolved: the world reached an acceptable outcome and the report matches it.';
  }
  return reward.damage
    ? `Not resolved: its effects fit none of the acceptable outcomes, so the reward is held at ${signedScore(cap)} or below.`
    : `Not resolved: no acceptable outcome is complete, so the reward is held at ${signedScore(cap)} or below.`;
}

function Reward({ demo }: { demo: ServiceDemo }) {
  const reward = score(demo.session);
  const deductions = reward.penalties.reduce((n, p) => n + p.value, 0);
  const state = reward.completed
    ? 'A coherent outcome is complete'
    : reward.damage
      ? 'Effects outside every coherent outcome'
      : 'No outcome complete yet';
  return (
    <section className={styles.column} aria-labelledby="service-reward">
      <h4 id="service-reward" className={styles.columnTitle}>
        Reward{' '}
        <span>
          a score from {signedScore(SCORE_FLOOR)} to {signedScore(SCORE_CEILING)} · rubric {reward.weightsVersion}
        </span>
      </h4>
      <p className={styles.score} data-tone={reward.completed ? (reward.total < 1 ? 'partial' : 'resolved') : 'failed'} aria-live="polite">
        <output aria-label="Total reward">{signedScore(reward.total)}</output>
        <span>{state}</span>
      </p>
      <p className={styles.explain}>{explain(reward)}</p>
      <dl className={styles.components}>
        {reward.components.map((c) => (
          <div key={c.label}>
            <dt>
              {c.label} <span>× {c.weight.toFixed(1)}</span>
              {COMPONENT_GLOSSES[c.label] && <small>{COMPONENT_GLOSSES[c.label]}</small>}
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
        Weighted sum {reward.base.toFixed(2)} − deductions {deductions.toFixed(2)}, then the lowest ceiling.
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
      <h5 className={styles.subTitle}>Outcome branches: the acceptable outcomes for this case</h5>
      <ul className={styles.branches}>
        {reward.branches.map((b) => (
          <li key={b.id} data-complete={b.complete || undefined}>
            <strong>{b.label}</strong>
            <span>
              {b.complete
                ? 'Complete'
                : [
                    !b.stateSatisfied && 'world not in this state',
                    !b.coherentWrites && 'writes outside it',
                    b.eventCoverage < 1 && `${Math.round(b.eventCoverage * PERCENT)}% of its evidence`,
                    !b.reportSatisfied && 'no supported report',
                  ]
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

export function ServiceLab({ demo, labRef }: { demo: ServiceDemo; labRef?: RefObject<HTMLDivElement | null> }) {
  const { session } = demo;
  const scenario = SCENARIOS.find((s) => s.id === session.config.scenario)!;
  const configKey = JSON.stringify(session.config);
  // the workbench restarts from each newly loaded trajectory, so its fields match the trace
  const benchKey = `bench-${configKey}-${demo.selected ?? 'manual'}-${demo.scriptIndex ?? ''}`;
  return (
    <div className={styles.lab} ref={labRef}>
      <div className={styles.brief}>
        <div>
          <h3 className={styles.briefTitle}>{scenario.title}</h3>
          <p className={styles.briefText}>{scenario.request}</p>
        </div>
        <p className={styles.identity}>
          <ShieldCheck aria-hidden="true" />
          <span>
            Signed in as <strong>{session.identity}</strong>, the customer the agent acts for; the tools see only this account’s orders.
          </span>
        </p>
      </div>
      <div className={styles.columns}>
        <WorldState key={`world-${configKey}-${session.events.length}`} demo={demo} />
        <Reward demo={demo} />
      </div>
      <UnderTheHood summary="Run it yourself: new episodes, scripted controls, the agent workbench and trace export">
        <Episode key={configKey} demo={demo} />
        <Workbench key={benchKey} demo={demo} />
      </UnderTheHood>
    </div>
  );
}
