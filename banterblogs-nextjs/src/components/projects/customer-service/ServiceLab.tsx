'use client';

import { useRef, useState } from 'react';
import { Check, ChevronRight, Download, Play, RotateCcw, ShieldCheck, SkipForward, Square, Upload } from 'lucide-react';
import { createSession, exportTrace, refunded, replayTrace, score, step } from '@/lib/projects/customer-service/engine';
import { CLAIMS, MAX_EVENTS, SCENARIOS, TOOL_LABELS, type Claim, type Config, type Event, type ToolName } from '@/lib/projects/customer-service/model';
import { PRESETS, scriptedActions, type Preset } from '@/lib/projects/customer-service/scripts';
import styles from './service.module.css';

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const MAX_TRACE_BYTES = 2_000_000;
const claimLabels: Record<Claim, string> = {
  'cancelled-and-refunded': 'Cancelled and fully refunded', cancelled: 'Order cancelled',
  'intercept-requested': 'Intercept requested (not confirmed)', refunded: 'Refund issued',
  'replacement-created': 'Replacement created', 'notification-registered': 'Stock alert registered',
  'split-tender': 'Legitimate split tender verified', unavailable: 'Order unavailable to this account', 'no-action': 'No remedy applied',
};
const resolutions = ['cancel', 'intercept', 'refund', 'replace', 'notify'] as const;
const resolutionLabels = { cancel: 'Cancel shipment', intercept: 'Request carrier intercept', refund: 'Refund selected payment', replace: 'Replace in selected finish', notify: 'Wait for stock alert' };

function eventLabel(event: Event): string {
  const a = event.action;
  if (!a) return 'Invalid command';
  if (a.kind === 'tool') return Object.hasOwn(TOOL_LABELS, a.name) ? TOOL_LABELS[a.name as ToolName] : a.name;
  if (a.kind === 'choice') return `Scripted customer choice: ${resolutionLabels[a.resolution]}`;
  if (a.kind === 'report') return `Report: ${claimLabels[a.claim]}`;
  return 'Close episode';
}

export default function ServiceLab() {
  const [session, setSession] = useState(() => createSession());
  const [draft, setDraft] = useState<Config>(session.config);
  const [toolName, setToolName] = useState<ToolName>('order');
  const [orderId, setOrderId] = useState('S-410');
  const [paymentId, setPaymentId] = useState('PAY-A');
  const [amountCents, setAmountCents] = useState(session.config.totalCents);
  const [sku, setSku] = useState('LAMP-MOSS');
  const [resolution, setResolution] = useState<typeof resolutions[number]>('replace');
  const [claim, setClaim] = useState<Claim>('replacement-created');
  const [raw, setRaw] = useState('{"kind":"tool","name":"order","args":{"orderId":"S-410"}}');
  const [preset, setPreset] = useState<Preset>('verified');
  const [scriptIndex, setScriptIndex] = useState(0);
  const [scriptActive, setScriptActive] = useState(false);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const reward = score(session);
  const scenario = SCENARIOS.find(s => s.id === session.config.scenario)!;
  const script = scriptedActions(session.config, preset);
  const closed = session.termination !== 'open';
  const target = session.world.orders.find(o => o.id === 'S-410')!;
  const payments = session.world.payments.filter(p => p.orderId === target.id);
  const chosenEvent = session.events.find(e => e.index === selectedEvent) ?? session.events.at(-1);

  function act(input: unknown) {
    setError('');
    setScriptActive(false);
    setSession(s => step(s, input));
    setSelectedEvent(null);
  }

  function reset(config: unknown = session.config) {
    try {
      const next = createSession(config);
      setSession(next); setDraft(next.config); setAmountCents(next.config.totalCents);
      setOrderId('S-410'); setPaymentId(next.config.scenario === 'duplicate' ? 'PAY-B' : 'PAY-A');
      setToolName('order'); setSku('LAMP-MOSS');
      setScriptIndex(0); setScriptActive(false); setSelectedEvent(null); setError('');
    } catch (err) {
      console.error('Service lab configuration rejected', err);
      setError(err instanceof Error ? err.message : 'Invalid episode configuration.');
    }
  }

  function scripted(runAll: boolean) {
    let next = scriptActive ? session : createSession(session.config);
    let index = scriptActive ? scriptIndex : 0;
    do { next = step(next, script[index++]); }
    while (runAll && index < script.length && next.termination === 'open');
    setSession(next); setScriptIndex(index); setScriptActive(true); setSelectedEvent(null); setError('');
  }

  function executeTool() {
    const args: Record<string, unknown> = toolName === 'inventory' ? {} : { orderId };
    if (toolName === 'refund') Object.assign(args, { paymentId, amountCents });
    if (toolName === 'replace' || toolName === 'notify') args.sku = sku;
    act({ kind: 'tool', name: toolName, args });
  }

  function exportJSON() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportTrace(session), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `service-lab-${session.config.scenario}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_TRACE_BYTES) throw new Error('Trace exceeds the 2 MB import limit.');
      const next = replayTrace(JSON.parse(await file.text()));
      setSession(next); setDraft(next.config); setAmountCents(next.config.totalCents);
      setScriptActive(false); setScriptIndex(0); setSelectedEvent(null); setError('');
    } catch (err) {
      console.error('Service lab trace import rejected', err);
      setError(err instanceof Error ? err.message : 'Trace import failed.');
    } finally { if (fileInput.current) fileInput.current.value = ''; }
  }

  return <section id="demo" className={styles.lab} aria-label="Guarded customer-service environment">
    <form className={styles.configuration} onSubmit={e => { e.preventDefault(); reset(draft); }}>
      <label>Case<select value={draft.scenario} onChange={e => setDraft({ ...draft, scenario: e.target.value as Config['scenario'] })}>
        {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select></label>
      <label>Preferred stock<input type="number" min="0" max="6" step="1" value={Number.isFinite(draft.stock) ? draft.stock : ''} onChange={e => setDraft({ ...draft, stock: e.target.value === '' ? NaN : Number(e.target.value) })} required /></label>
      <label>Order total (cents)<input type="number" min="2" max="100000" step="2" value={Number.isFinite(draft.totalCents) ? draft.totalCents : ''} onChange={e => setDraft({ ...draft, totalCents: e.target.value === '' ? NaN : Number(e.target.value) })} required /></label>
      <button type="submit"><RotateCcw size={16} aria-hidden />New episode</button>
      <div className={styles.iconGroup}>
        <button type="button" className={styles.iconButton} title="Reset current episode" aria-label="Reset current episode" onClick={() => reset()}><RotateCcw size={18} /></button>
        <button type="button" className={styles.iconButton} title="Export versioned JSON trace" aria-label="Export versioned JSON trace" onClick={exportJSON}><Download size={18} /></button>
        <button type="button" className={styles.iconButton} title="Import and replay JSON trace" aria-label="Import and replay JSON trace" onClick={() => fileInput.current?.click()}><Upload size={18} /></button>
        <input className={styles.fileInput} ref={fileInput} type="file" accept="application/json,.json" aria-label="Trace file" onChange={e => void importJSON(e.target.files?.[0])} />
      </div>
    </form>
    {error && <div role="alert" className={styles.error}>{error}</div>}
    <div className={styles.caseBrief}>
      <div><span className={styles.eyebrow}>Synthetic customer brief / {target.id}</span><h2>{scenario.title}</h2><p>{scenario.request}</p></div>
      <div className={styles.identity}><ShieldCheck size={20} aria-hidden /><span>Session identity<strong>{session.identity}</strong><small>Human-operated browser adaptation. No live model.</small></span></div>
    </div>
    <div className={styles.scriptBar}>
      <label>Scripted control<select value={preset} onChange={e => { setPreset(e.target.value as Preset); setScriptActive(false); setScriptIndex(0); }}>
        {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select></label>
      <button onClick={() => scripted(false)} disabled={scriptActive && (scriptIndex >= script.length || closed)}><SkipForward size={16} aria-hidden />Step</button>
      <button onClick={() => scripted(true)} disabled={scriptActive && (scriptIndex >= script.length || closed)}><Play size={16} aria-hidden />Run script</button>
      <span className={styles.scriptStatus}>{scriptActive ? `${scriptIndex} / ${script.length} scripted actions` : 'Script starts a fresh episode'}</span>
    </div>
    <div className={styles.workspace}>
      <div className={styles.controls}>
        <h3>Agent workbench</h3>
        <label>Tool<select value={toolName} onChange={e => setToolName(e.target.value as ToolName)}>{Object.entries(TOOL_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Order ID<input value={orderId} maxLength={80} onChange={e => setOrderId(e.target.value)} /></label>
        <div className={styles.parameterGrid}>
          <label>Payment<select value={paymentId} onChange={e => setPaymentId(e.target.value)}>{payments.map(p => <option key={p.id}>{p.id}</option>)}<option>PAY-Z</option><option>PAY-MISSING</option></select></label>
          <label>Refund (cents)<input type="number" min="1" max="100000" step="1" value={Number.isFinite(amountCents) ? amountCents : ''} onChange={e => setAmountCents(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
        </div>
        <label>Replacement finish<select value={sku} onChange={e => setSku(e.target.value)}>{session.world.inventory.map(p => <option key={p.sku} value={p.sku}>{p.name} / {p.sku}</option>)}</select></label>
        <button className={styles.primaryButton} onClick={executeTool} disabled={closed}><ChevronRight size={17} aria-hidden />Execute tool</button>
        <div className={styles.controlBand}>
          <h4>Scripted customer choice</h4>
          <label>Resolution<select value={resolution} onChange={e => setResolution(e.target.value as typeof resolution)}>{resolutions.map(r => <option key={r} value={r}>{resolutionLabels[r]}</option>)}</select></label>
          <button disabled={closed} onClick={() => act({ kind: 'choice', resolution, orderId,
            ...(resolution === 'refund' ? { paymentId, amountCents } : {}),
            ...(['replace', 'notify'].includes(resolution) ? { sku } : {}) })}><Check size={16} aria-hidden />Record choice</button>
          <p className={styles.currentChoice}>{session.choice ? `${resolutionLabels[session.choice.resolution]} / ${session.choice.orderId}${session.choice.paymentId ? ` / ${session.choice.paymentId} / ${money(session.choice.amountCents!)}` : ''}${session.choice.sku ? ` / ${session.choice.sku}` : ''}` : 'No current authorization'}</p>
        </div>
        <div className={styles.controlBand}>
          <h4>Structured agent report</h4>
          <label>Reported outcome<select value={claim} onChange={e => setClaim(e.target.value as Claim)}>{CLAIMS.map(c => <option key={c} value={c}>{claimLabels[c]}</option>)}</select></label>
          <button disabled={closed} onClick={() => act({ kind: 'report', claim, orderId })}><Check size={16} aria-hidden />Record report</button>
        </div>
        <details className={styles.raw}><summary>Raw command</summary>
          <label>JSON payload<textarea value={raw} onChange={e => setRaw(e.target.value)} maxLength={4000} rows={5} spellCheck={false} /></label>
          <button disabled={closed} onClick={() => { try { act(JSON.parse(raw)); } catch (err) { console.error('Service lab command JSON rejected', err); setError('Invalid JSON. Use double-quoted keys and a complete object.'); } }}>Execute JSON</button>
        </details>
        <button disabled={closed} onClick={() => act({ kind: 'finish' })}><Square size={14} aria-hidden />Close episode</button>
      </div>

      <div className={styles.stateColumn}>
        <div className={styles.sectionHeading}><h3>World state</h3><span>{session.termination.replace('_', ' ')} / {session.events.length} of {MAX_EVENTS}</span></div>
        <div className={styles.lifecycle} aria-label={`Order lifecycle: ${target.status}`}>
          {(['processing', 'shipped', 'delivered'] as const).map((status, i) => <div key={status} className={target.status === status ? styles.activeStage : ''}>
            <span>{i + 1}</span><strong>{status === 'processing' ? 'Warehouse' : status === 'shipped' ? 'In transit' : 'Delivered'}</strong>
          </div>)}
        </div>
        <dl className={styles.stateFacts}>
          <div><dt>Order status</dt><dd>{target.status}</dd></div>
          <div><dt>Carrier request</dt><dd>{session.world.intercepts.includes(target.id) ? 'Requested, unconfirmed' : 'None'}</dd></div>
          <div><dt>Return</dt><dd>{session.world.returns.includes(target.id) ? 'Authorized' : 'None'}</dd></div>
          <div><dt>Replacement</dt><dd>{session.world.replacements[0]?.sku ?? 'None'}</dd></div>
          <div><dt>Stock alert</dt><dd>{session.world.notifications[0]?.sku ?? 'None'}</dd></div>
        </dl>
        <h4>Captured-funds ledger</h4>
        <div className={styles.legend}><span className={styles.retainedKey} />Retained<span className={styles.refundedKey} />Refunded</div>
        {payments.map(p => {
          const amount = refunded(session.world, p.id);
          return <div key={p.id} className={styles.paymentRow}>
            <div><strong>{p.id}</strong><span>{money(p.capturedCents)} captured</span></div>
            <div className={styles.moneyBar} role="img" aria-label={`${p.id}: ${money(p.capturedCents - amount)} retained, ${money(amount)} refunded`}>
              <span style={{ width: `${100 * (p.capturedCents - amount) / p.capturedCents}%` }} /><span style={{ width: `${100 * amount / p.capturedCents}%` }} />
            </div>
            <small>{money(amount)} refunded / {money(p.capturedCents - amount)} remaining</small>
          </div>;
        })}
        <h4>Replacement inventory</h4>
        {session.world.inventory.map(p => <div key={p.sku} className={styles.inventoryRow}>
          <span>{p.name}</span><div className={styles.stockUnits} role="img" aria-label={`${p.quantity} units available`}>
            {Array.from({ length: 6 }, (_, i) => <i key={i} className={i < p.quantity ? styles.stockFilled : ''} />)}
          </div><strong>{p.quantity}</strong>
        </div>)}
        <div className={styles.traceHeading}><h3>Action trace</h3><span>Before / after per action</span></div>
        <div className={styles.trace} aria-label="Episode actions">
          {session.events.length === 0 && <p className={styles.empty}>No tool observations or effects yet.</p>}
          {session.events.map(e => <button key={e.index} className={`${styles.traceRow} ${chosenEvent?.index === e.index ? styles.selected : ''}`} aria-pressed={chosenEvent?.index === e.index} onClick={() => setSelectedEvent(e.index)}>
            <span className={styles.sequence}>{String(e.index).padStart(2, '0')}</span><span><strong>{eventLabel(e)}</strong><small className={!e.result.ok ? styles.denied : ''}>{e.result.code} / {e.changed ? 'state changed' : 'no state change'}</small></span><ChevronRight size={14} aria-hidden />
          </button>)}
        </div>
        {chosenEvent && <div className={styles.observation} aria-live="polite">
          <strong>#{chosenEvent.index} / {chosenEvent.impact} impact</strong><p>{chosenEvent.result.message}</p>
          {chosenEvent.result.data !== undefined && <pre>{JSON.stringify(chosenEvent.result.data, null, 2)}</pre>}
          <details><summary>Input and state evidence</summary><pre>{JSON.stringify({ input: chosenEvent.input, before: chosenEvent.before, after: chosenEvent.after }, null, 2)}</pre></details>
        </div>}
      </div>

      <aside className={styles.reward} aria-label="Reward breakdown">
        <div className={styles.sectionHeading}><h3>Reward</h3><span>v1 / local rubric</span></div>
        <div className={`${styles.score} ${reward.total < 0 ? styles.negative : ''}`} aria-live="polite"><output aria-label="Total reward">{reward.total.toFixed(2)}</output><span>{reward.completed ? 'Coherent branch completed' : reward.damage ? 'Off-goal effects committed' : 'Resolution incomplete'}</span></div>
        <div className={styles.components}>{reward.components.map(c => <div key={c.label}><span>{c.label}<small>weight {c.weight.toFixed(1)}</small></span><meter min="0" max="1" value={c.value} aria-label={c.label} /><strong>{c.value.toFixed(2)}</strong></div>)}</div>
        <p className={styles.equation}>Base {reward.base.toFixed(2)} - penalties {reward.penalties.reduce((n, p) => n + p.value, 0).toFixed(2)}; then apply ceilings.</p>
        {reward.penalties.map(p => <div className={styles.deduction} key={p.label}><span>{p.label}</span><strong>-{p.value.toFixed(2)}</strong></div>)}
        {reward.ceilings.map(c => <div className={styles.ceiling} key={c.label}><span>{c.label}</span><strong>cap {c.value.toFixed(2)}</strong></div>)}
        <h4>Candidate outcome branches</h4>
        {reward.branches.map(b => <div key={b.id} className={styles.branch}>
          <strong>{b.label}</strong><span className={b.complete ? styles.good : ''}>{b.complete ? 'Complete' : 'Not complete'}</span>
          <dl><div><dt>State gate</dt><dd>{b.stateSatisfied ? 'pass' : 'fail'}</dd></div><div><dt>Ordered evidence</dt><dd>{Math.round(b.eventCoverage * 100)}%</dd></div><div><dt>Writes coherent</dt><dd>{b.coherentWrites ? 'yes' : 'no'}</dd></div><div><dt>Supported report</dt><dd>{b.reportSatisfied ? 'yes' : 'no'}</dd></div></dl>
        </div>)}
        <p className={styles.rubricNote}>Maximum one branch. Credit is never added across alternative remedies. Structured reports are assertions, not natural-language evaluation.</p>
      </aside>
    </div>
  </section>;
}
