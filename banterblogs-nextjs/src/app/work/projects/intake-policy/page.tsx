import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import IntakeLab from '@/components/projects/intake-policy/IntakeLab';
import styles from '@/components/projects/intake-policy/intake.module.css';
import { CASES } from '@/lib/projects/intake-policy/cases';
import { evaluate } from '@/lib/projects/intake-policy/engine';
import { routeLabels } from '@/lib/projects/intake-policy/model';

export const metadata: Metadata = {
  title: 'Intake Policy Sandbox | Work',
  description: 'A deterministic, synthetic intake-policy sandbox and engineering study of perception, policy authority, guarded routing and traceability.',
};
const source = 'https://github.com/Sahil170595/Banterblogs/tree/codex/demo-intake-policy/banterblogs-nextjs/src';
const findings = CASES.map(c => ({ ...c, result: evaluate(c.features) }));

export default function IntakePolicyPage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/work" className={styles.back}><ArrowLeft size={15} aria-hidden />Work</Link>
      <div className={styles.eyebrow}>Deterministic policy / synthetic categorical data</div>
      <h1>Intake Policy Sandbox</h1>
      <p>Inspect how safety gates, operational weights and incomplete evidence change a review plan.
        This is an engineering simulation, not medical guidance or a clinically validated triage system.
        No patient data, live model, coverage verification, scheduling or external escalation.</p>
      <nav className={styles.nav} aria-label="Project sections">
        <a href="#demo">Workbench</a><a href="#underlying-system">Underlying system</a>
        <a href="#findings">Findings</a><a href="#method">Methodology</a><a href="#reproduce">Reproduction</a>
      </nav>
    </header>
    <IntakeLab />
    <article className={styles.article} aria-label="Intake policy engineering study">
      <section id="underlying-system">
        <h2>Underlying system: advisory perception, explicit authority</h2>
        <p>The underlying work is a server-side intake-processing pipeline, not a chat interface with a hidden prompt.
          I implemented separate perception, urgency scoring, orchestration and output-assembly stages so that interpreting
          a message did not automatically authorize an action. The engineering question was how to use uncertain language
          signals while keeping policy decisions inspectable, recoverable and owned by staff.</p>
        <p>Source inspection for this edition verified four stages and eight tool wrappers. Those are architecture counts,
          not throughput measurements. The original runner processes a batch serially, records each item separately,
          and assembles a summary. Its per-item error boundary produces a manual-review fallback while retaining tool calls
          already recorded for that item. This matters when a later stage fails: a plausible replacement summary must not
          erase evidence of what ran earlier.</p>
        <h3>1. Perception is a signal bundle, not the decision</h3>
        <p>The original perception stage always computes deterministic text signals. With provider credentials available,
          an SDK-backed fast model can return a structured tool payload. Safety signals, low classification confidence,
          ambiguity or disagreement with the deterministic backstop can trigger a stronger second tier. If the stronger
          tier fails, the fast result is retained and the attempted path is recorded; without a usable fast result,
          processing falls back to deterministic heuristics. Exact field extraction takes precedence over model proposals
          where deterministic extraction succeeds.</p>
        <p>This is implemented optional inference, not evidence of a successful provider run in this edition. No model was
          invoked to produce the browser results. The source uses a separate abort timeout for each model call, so two tiers
          can consume two timeout windows. A comment describing a shared deadline is not the executable behavior. The design
          trades extra review opportunity for additional worst-case latency; it should not be presented as a measured speedup.</p>
        <p>The fallback keeps an item processable, but it is not equivalent to a model result. Lexicons can miss paraphrases,
          negation and context. Normalization supplies defaults for malformed or missing signals; these defaults are policy
          choices, not proof that the input was trustworthy. Recording perception provenance is necessary to distinguish
          model-assisted interpretation from heuristic recovery.</p>
        <h3>2. The scorer is deterministic policy authority</h3>
        <p>A categorical safety backstop can override the operational sum. An active care-related safety signal takes the
          highest review gate; an active non-care safety signal takes a separate prioritized-review branch. Only an ungated
          item reaches additive operational scoring. The original rule set distinguishes a same-day request that actually
          requires action from a notice with no action, and assigns urgent wording alone no weight. This prevents a loud
          subject line from substituting for an operational obligation.</p>
        <p>Structural checks can also revise the proposed classification: incomplete intake references and known-record
          evidence change downstream handling. A known record does not erase a scheduling-change request. These are
          inspectable branch rules, not learned risk estimates. Human review remains required for all outputs, including
          ordinary and low-priority items. Neither the original rules nor the synthetic rules here establish clinical validity.</p>
        <h3>3. Orchestration has a narrower effect boundary than its vocabulary suggests</h3>
        <p>The original tool surface covers record search, account verification, policy lookup, resource discovery,
          holding a resource, task creation, draft creation and escalation. In the inspected implementation, these are
          local wrappers and stubs: record/account responses come from local rules, and resource discovery filters a local
          catalog by program, language and capacity. Task, hold, draft and escalation wrappers return local identifiers or
          artifacts. They do not demonstrate a remote reservation, verified account, delivered message or notified staff member.</p>
        <p>The routing code does genuinely call these wrappers. For example, a highest-priority branch can request policy
          evidence, an escalation artifact, a staff task and a neutral draft. A change request creates a staff-review path
          rather than automatically moving an appointment. Some account states block resource suggestions. However, unknown
          account status can still reach resource preview in the original. This browser edition deliberately uses a stricter
          rule: both independent account flags must be eligible, and conflicts must be resolved before preview.</p>
        <h3>4. Audit assembly preserves actual local execution</h3>
        <p>The original trace writer appends JSON lines to disk. Item context is carried through asynchronous tool execution,
          with unique call identifiers, arguments and result summaries. The assembly stage preserves those records in the
          final item output. That file persistence is a real implemented effect; the remote operations named by stub results
          are not. This distinction is the central lesson: call provenance and a returned ID can prove local execution,
          but cannot by themselves prove a customer outcome.</p>
        <p>The inspected tests cover branch-specific outputs, review requirements and restrictions on automatic resource
          holds. I did not rerun the original fixture suite or carry its results into this page. The original supplied inbox,
          catalog, policy text and identity examples are not distributed here. A sanitized full-source edition can expose
          more of that architecture later; this page links only to freshly authored public demo code.</p>
      </section>
      <section id="findings">
        <h2>Findings: source-derived rules versus new synthetic results</h2>
        <p>The source-derived finding is architectural: uncertain perception can be advisory without becoming policy
          authority, provided the scorer, routing constraints and audit boundary are explicit. A safety gate implemented
          before the sum cannot be canceled by a negative promotion weight. Conversely, a model fallback that always returns
          a bundle may conceal reduced evidence quality unless its provenance survives output assembly.</p>
        <p>The table below is computed on the server from this edition&apos;s independent categorical cases and default policy.
          It is not an original benchmark, clinical accuracy estimate, learned-policy result or live service outcome.
          Each row is reproducible through the corresponding preset and the public engine.</p>
        <div className={styles.tableWrap}><table>
          <caption>New synthetic cases / default policy / no random seed</caption>
          <thead><tr><th>Case</th><th>Priority</th><th>Operational sum</th><th>Route</th><th>Preview count</th></tr></thead>
          <tbody>{findings.map(c => <tr key={c.id}><th scope="row">{c.title}</th><td>{c.result.priority}</td>
            <td>{c.result.operationalScore === null ? 'Bypassed' : c.result.operationalScore}</td><td>{routeLabels[c.result.route]}</td><td>{c.result.resources.length}</td></tr>)}</tbody>
        </table></div>
        <p>A promotion with a care-related flag reaches P0 even though promotion otherwise contributes a negative weight.
          A same-day change requiring action reaches prioritized operations review. A same-day notice without required
          action does not receive the same-day bonus, and its urgent-word flag adds zero. Missing reference presence,
          ambiguous record association and conflicting account flags each suppress resource preview for different reasons.
          A fully eligible case can still have no resource match because catalog language, program and positive capacity
          must all agree. An empty preview is not automatically an account failure.</p>
        <p>Editable weights reveal another separation: a same-day operational case can move from P1 to P2, while the same
          case with the independent backstop remains P0 and reports no operational sum. The contribution display marks
          bypassed scoring rather than publishing a misleading total underneath the categorical gate.</p>
      </section>
      <section id="method">
        <h2>Methodology and browser adaptation</h2>
        <p>The browser accepts only categorical features and presence flags. There are no names, dates of birth, contact
          addresses, member identifiers, message bodies or diagnoses to enter. Strict schemas reject unknown keys, invalid
          enums, fractional or out-of-range policy values and non-finite numbers. The catalog and presets are validated too.
          This edition starts after perception: the visitor edits asserted signals, not raw text interpreted by a model.</p>
        <p>The synthetic policy is independently authored. Its default operational weights are +3 for today plus required
          action, +1 for a complaint with a time element, -1 for a notice with no required action, and -3 for a promotion.
          The high and low operational thresholds are +3 and -3. These are demonstrative constants, not copied operational
          policies, recommendations for use with patients or estimates learned from data. Advanced controls change only
          this additive branch; the categorical gates remain fixed.</p>
        <ol>
          <li>Validate a complete feature and policy snapshot before computing any result.</li>
          <li>Resolve independent and advisory safety gates before additive scoring.</li>
          <li>Apply structural evidence checks and preserve specialized request categories.</li>
          <li>Select a review route with explicit precedence; filter the local catalog only on eligible intake routes.</li>
          <li>Create a neutral unsent template where appropriate, recording each rule&apos;s evidence and local effect.</li>
        </ol>
        <p>There is no hidden service call behind the route plan. Queue openings are illustrative capacity entries, not
          appointments. The engine does not decrement them, hold them, send messages, create remote tasks or escalate to a
          person. Alternate language is a routing feature; the draft remains a primary-language template and explicitly
          requires translation review. Generating English text under an alternate-language label would be false fidelity.</p>
        <p>The UI holds a draft configuration separately from the applied result. Editing a case or weight does not silently
          relabel old evidence. Evaluate replaces the applied snapshot only after successful validation; reset restores the
          default snapshot. Export includes the applied features, policy, trace, result, format versions and a null seed
          because the calculation is deterministic. Import recomputes that result and rejects inconsistent receipts.</p>
        <p>Public implementation evidence: <a href={`${source}/lib/projects/intake-policy/engine.ts`}>decision engine and replay</a>,{' '}
          <a href={`${source}/lib/projects/intake-policy/model.ts`}>typed policy and catalog boundary</a>,{' '}
          <a href={`${source}/lib/projects/intake-policy/cases.ts`}>synthetic cases</a>, and{' '}
          <a href={`${source}/lib/projects/intake-policy/engine.test.ts`}>focused rule tests</a>.
          The article and findings table are server-rendered; only the workbench needs client interaction.</p>
      </section>
      <section id="limits">
        <h2>Failure cases and limits</h2>
        <p>These controls cannot establish whether a safety flag, record match or eligibility assertion is true. An incorrectly
          asserted flag yields a deterministic but potentially wrong route. The independent backstop mitigates one advisory
          disagreement; it does not solve signal extraction, ambiguity, adversarial text or false negatives. Operational
          thresholds are not a substitute for validated clinical or organizational policy.</p>
        <p>Route precedence is also a tradeoff. Safety review wins over missing intake references; a change request retains
          its operations route rather than being reclassified as an account inquiry. That does not authorize resource
          allocation: preview is restricted to eligible intake/existing-record routes. A downstream implementation would
          need explicit authorization, reconciled identity, idempotency, persisted workflow state and verified delivery
          receipts before these proposals could become external actions.</p>
        <p>The original local record matching, account rules and catalog are narrow fixture behaviors, not production identity
          resolution or verification. This edition substitutes explicit categorical association and independent account flags.
          It omits original raw-message perception, provider inference, disk-backed asynchronous tool traces, multilingual
          source templates, batch execution and service integration. It exposes the policy and evidence boundary, not the
          complete original engine.</p>
        <p>Receipt replay checks deterministic consistency, not authenticity. Anyone can author a new consistent synthetic
          receipt. There is no signature, patient workflow, access-control service, trained policy, medical recommendation
          or model-quality evaluation here. Unit tests establish specified software behavior; they cannot establish clinical
          safety, staffing response time, appointment availability or patient outcomes.</p>
      </section>
      <section id="reproduce">
        <h2>Reproduction</h2>
        <p>Start with a named synthetic case and evaluate it. Inspect the applied priority, gate, route and rule trace.
          For a counterexample, lower the today weight on the same-day change case and evaluate again; then set the independent
          backstop. Operational priority changes in the first experiment, while the fixed safety gate takes precedence in
          the second. Clear a required reference or set either account flag to unknown to observe preview withholding.</p>
        <p>Export the applied result and import it again to recompute the full receipt. Pending control edits are intentionally
          absent from the export. Reset returns the initial case and policy, including the applied result. No credentials,
          paid API, random seed or source corpus are required.</p>
        <pre><code>{`npm run test -- --run src/lib/projects/intake-policy/engine.test.ts src/components/projects/intake-policy/IntakeLab.test.tsx src/app/work/projects/intake-policy/page.test.tsx --maxWorkers=1
npm run lint -- src/lib/projects/intake-policy src/components/projects/intake-policy src/app/work/projects/intake-policy`}</code></pre>
        <p>The focused suite checks fixed gates across all request/safety/context/backstop combinations, missing fields,
          unknown/conflicting account flags, catalog filters, invalid input, trace references, replay tampering and UI applied
          state. Production build and real-browser desktop/mobile QA are separate coordinator checks, not evidence implied
          by these unit tests.</p>
      </section>
    </article>
  </main>;
}
