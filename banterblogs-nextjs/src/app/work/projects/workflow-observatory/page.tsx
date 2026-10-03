import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Observatory } from '@/components/projects/workflow-observatory/Observatory';
import { DEFAULT_CONFIG, DEMO_SOURCE, ORIGINAL_SOURCE, completion, initialSite, observeModel, transition, type Event } from '@/lib/projects/workflow-observatory/engine';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Workflow Observatory',
  description: 'A controlled same-origin workflow executor with condition-based completion, actual DOM evidence, injected failures and recomputed event replay.',
  alternates: { canonical: '/work/projects/workflow-observatory' },
};

const prefix: Event[] = [{ type: 'open' }, { type: 'fill', value: DEFAULT_CONFIG.title }, { type: 'select', value: DEFAULT_CONFIG.room }];
function fixtureState(events: Event[], failure = DEFAULT_CONFIG.failure) {
  return events.reduce((state, event) => transition(state, event, { ...DEFAULT_CONFIG, failure }), initialSite());
}
const examples = [
  { label: 'Valid form, not submitted', state: fixtureState(prefix) },
  { label: 'Save still pending', state: fixtureState([...prefix, { type: 'submit' }]) },
  { label: 'Success notice, no record', state: fixtureState([...prefix, { type: 'submit' }, { type: 'settle' }], 'false-toast') },
  { label: 'Matching committed reservation', state: fixtureState([...prefix, { type: 'submit' }, { type: 'settle' }]) },
  { label: 'Committed to the wrong room', state: fixtureState([...prefix, { type: 'select', value: 'south' }, { type: 'submit' }, { type: 'settle' }]) },
];
const originalFile = (path: string) => `${ORIGINAL_SOURCE.replace('/tree/', '/blob/')}/${path}`;

export default function WorkflowObservatoryPage() {
  return <div className={styles.page}>
    <Link className={styles.back} href="/work"><ArrowLeft size={15} />Back to work</Link>
    <header className={styles.header}><h1>Workflow Observatory</h1><p>Execute a controlled scheduling task. Inspect the dialog, form, pending save, committed record, and evidence that separates action success from task completion.</p></header>
    <nav className={styles.nav} aria-label="Project sections"><a href="#demo">Execution</a><a href="#underlying-system">Underlying system</a><a href="#findings">Findings</a><a href="#method">Method</a><a href="#reproduce">Reproduction</a></nav>
    <section id="demo" aria-label="Interactive workflow execution"><Observatory /></section>
    <p className={styles.fidelity}><strong>Controlled browser application.</strong> Native controls execute inside this same-origin synthetic fixture. The plan is curated, records are in memory, and evidence is sampled DOM state. This is not unrestricted external browsing, live model planning, a screenshot recorder, or the original Playwright runtime.</p>

    <article className={styles.article} aria-label="Workflow execution technical report">
      <section id="question"><h2>A click is not a completed task</h2>
        <p>A workflow can change substantially while its URL remains constant. A dialog opens, input becomes valid, a request starts, a toast appears, and a record becomes visible. Treating those as one page loses the evidence needed to distinguish an attempted action from a completed user outcome. Conversely, taking a screenshot after every click does not prove the task succeeded.</p>
        <p>I implemented this edition around a narrower, testable question: <strong>what observable postconditions justify saying a reservation was created?</strong> The live fixture is a fresh scheduling interface, not a recording of another site. The executor really clicks its button, enters text, selects a room, submits the form, and waits for a matching committed row. Every run has an inspectable plan, action-level before/after evidence, failure reason, completion gate, and versioned export.</p>
      </section>

      <section id="underlying-system"><h2>Underlying system: Parallax</h2>
        <p><a href={ORIGINAL_SOURCE}>Parallax</a> is the original public Python system: an interpreter creates structured plans, a navigator executes them through Playwright, an observer captures browser state, and an archivist writes datasets and reports. The linked source is pinned to the revision inspected for this write-up. No old session databases, screenshots, page captures, or trace archives are imported into this demo.</p>
        <h3>The real implemented pipeline</h3>
        <ol>
          <li>The <a href={originalFile('parallax/agents/interpreter.py')}>interpreter</a> requests a structured execution plan from a provider and validates it against its quality rules. Plans can represent navigation, clicks, filling, selection, submission, uploads, waits, and other actions.</li>
          <li>The <a href={originalFile('parallax/agents/navigator.py')}>navigator</a> limits the action sequence, resolves locators, waits for interactable controls, executes actions, and captures state after successes and failures. Its implementation includes bounded retries, delayed typing when value verification fails, alternate selection strategies, cancellation checks, and optional vision-based fallbacks.</li>
          <li>The <a href={originalFile('parallax/observer/detectors.py')}>observer detectors</a> combine URL, roles, dialog presence, notice presence, form validity, loaders, and role-set differences. The observer can capture multiple viewport sizes and focused dialog images, attach significance metadata, and retain a state signature. Those signals can identify meaningful changes without navigation.</li>
          <li>The <a href={originalFile('parallax/agents/archivist.py')}>archivist</a> serializes states to JSONL and SQLite and produces readable reports. A separate trace controller records Playwright screenshots and snapshots into a trace archive. The command-line runner wires these components together and performs a final completion check.</li>
        </ol>
        <h3>Source-derived findings, not a new benchmark</h3>
        <p><strong>Fallback navigation is not autonomous planning.</strong> The <a href={originalFile('parallax/llm/local_provider.py')}>local provider</a> can request an actual plan from a local model service. When certain requests, parsing, or empty outputs fail, its fallback is a minimal navigation step to the starting URL. The corresponding source test checks that fallback shape. It does not establish that a task such as creating a record can be completed without a functioning planner. This edition uses an explicit curated plan and makes no model-capability claim.</p>
        <p><strong>Interactive completion has a weaker proxy than a committed outcome.</strong> The original <a href={originalFile('parallax/core/completion.py')}>completion validator</a> classifies plans as exploratory or interactive. Exploration checks normalized destination slugs against observed URLs, with a configurable minimum number of targets. Interactive plans look for a post-action signal such as a notice, valid form, or relevant significance metadata. These are useful signals, but a valid form can exist before saving and a notice can appear without the desired record. The browser edition exposes that distinction with a deliberately misleading notice and a stronger, task-specific record gate.</p>
        <p><strong>Structural change is evidence, not correctness.</strong> The original role-tree comparison computes Jaccard similarity over role/name pairs, while its state signature hashes URL and role information. Two states with the same URL and roles can still differ in field values or committed data. This edition therefore retains field values, save phase, and record fields alongside role-set distance. A large distance means the UI structure changed; it is not a completion confidence score.</p>
        <p><strong>Capture is an intervention.</strong> Multi-viewport screenshots resize the running page and then restore a viewport. That can cause responsive reflow and additional asynchronous behavior. The source includes tests for restoration, but resizing remains a reason to separate execution evidence from presentation captures. Screenshot redaction is configurable; its image-processing helper can return the original image on failure. It should not be treated as a fail-closed privacy guarantee.</p>
        <p>These findings come from inspecting implementation and source tests, not rerunning historical authenticated workflows or publishing a new success-rate estimate. The original system&apos;s provider and Playwright features are real source paths, but this page does not claim fresh production acceptance of them.</p>
        <h3>Design tradeoffs</h3>
        <p>Separating plan creation, execution, observation, and archiving gives each responsibility a clear contract. Semantic locator recovery reduces brittleness when labels or layout change, but broad text matches and site-specific overrides can also select the wrong control. Retries help transient detachment; retrying a submit without an idempotency boundary can duplicate a real operation. Optional vision can help with perception, but adds provider latency, cost, and uncertainty and does not replace a precise postcondition.</p>
        <p>State capture and readable reports preserve failure context, while accumulation of screenshots, role trees, and archives increases storage and privacy obligations. Quality-rule validation can reject malformed outputs, but cannot itself prove a user task succeeded. The central lesson is to keep <strong>attempted action, observed transition, captured evidence, and validated completion</strong> separate in both code and claims.</p>
      </section>

      <section id="findings"><h2>Fresh fixture findings and counterexamples</h2>
        <p><strong>Derived synthetic gate results.</strong> The following table is recomputed on the server from this edition&apos;s state-transition functions. It is not an original Parallax result, a browser timing benchmark, or an aggregate agent score. The interactive tool separately samples its rendered DOM during actual execution.</p>
        <div className={styles.tableScroll} tabIndex={0} aria-label="Scrollable synthetic completion counterexamples"><table>
          <caption>Same requested task; different observed states. A valid form or success notice alone does not satisfy the record gate.</caption>
          <thead><tr><th scope="col">Fixture state</th><th scope="col">Form valid</th><th scope="col">Success notice</th><th scope="col">Record exists</th><th scope="col">Completion</th></tr></thead>
          <tbody>{examples.map(example => { const state = observeModel(example.state); const gate = completion(state, DEFAULT_CONFIG); return <tr key={example.label}><td>{example.label}</td><td>{state.formValid === null ? 'No open form' : state.formValid ? 'Yes' : 'No'}</td><td>{state.toast === 'success' ? 'Yes' : 'No'}</td><td>{state.recordId ? 'Yes' : 'No'}</td><td>{gate.complete ? 'Met' : 'Unmet'}</td></tr>; })}</tbody>
        </table></div>
        <p>Label drift supplies a concrete locator counterexample. Exact-name selection cannot find the renamed button. The configured alias fallback can recover because the fixture has a known alternate accessible name. This is deterministic recovery over one declared alias, not a general planner discovering a new strategy.</p>
        <p>The save is asynchronous. A fixed 200 ms wait can finish while a 700 ms save is still pending; a condition wait with a sufficient deadline can observe the committed row. The times are configurable synthetic delays, not measurements of an external service. Actual action durations in the trace include this browser&apos;s scheduling and rendering and are not latency guarantees.</p>
        <p>The misleading-toast failure emits a success notice and closes the dialog without creating a record. A notice-only gate would accept it; this gate does not. The rejection failure keeps the form and emits an error. A title shorter than three non-whitespace characters cannot submit. An insufficient action budget leaves required actions unexecuted and does not silently count a partial run as complete.</p>
      </section>

      <section id="method"><h2>Method: execute, observe, validate</h2>
        <p>The <a href={DEMO_SOURCE}>new demo source</a> has a pure state-transition engine, a small native DOM adapter, and a React application. Runtime configuration and replay events are validated at a typed boundary. There is no arbitrary script evaluation, external URL parameter, remote browser, provider credential, network request, or imported session.</p>
        <p>The native adapter is scoped to the fixture root. It resolves the declared button name, sets the title and room through native controls and their events, checks form validity, and clicks the actual submit button. It samples the rendered dialog, inputs, notice, table row, and role/name tokens. The application&apos;s timer transitions a pending save to a committed record, rejection, or misleading notice according to the chosen failure case.</p>
        <p>Completion requires a committed in-memory record with the requested trimmed title and room, completed save state, closed dialog, and success notice. Every condition is evaluated separately. Bounded polling checks those conditions rather than inferring success from elapsed time or cursor position. Timeout, stop, reset, and unmount cleanup cancel pending work. Generation checks prevent a cancelled older run from modifying a newer run.</p>
        <p>Each action retains its before/after snapshot, elapsed time, status, failure reason, and Jaccard role-set distance. The trace can be inspected one action at a time. Native form values and committed row fields matter independently of role changes. All fixtures are newly authored and synthetic; the saved record is intentionally session-local and disappears on reset or refresh.</p>
        <h3>Two different meanings of replay</h3>
        <p>JSON export records configuration, typed application events, and observed action evidence under a schema and fixture version. Import validates versions and reconstructs states by applying the events to a fresh reduced model. It recomputes completion rather than trusting a saved status flag. Invalid event ordering, unknown actions, oversized traces, and unknown versions are rejected.</p>
        <p>The replay slider inspects that reconstruction. It does not pretend to recapture the original DOM, reproduce timing, verify a server-side write, or play a Playwright trace archive. Loading the imported configuration and running again performs a separate fresh execution through the rendered controls. Event reconstruction and new browser execution are labeled distinctly.</p>
      </section>

      <section id="limits"><h2>Failure boundaries and limits</h2>
        <ul>
          <li>The task, controls, alias, and action plan are curated. Success on this fixture is not evidence of arbitrary-site navigation or autonomous planning.</li>
          <li>The same-origin application owns both the executor and fixture. Exported evidence is inspectable but not cryptographically attested and is not a secure evaluation boundary against a hostile page.</li>
          <li>A committed row here is an in-memory application result. It is not a database transaction, external appointment, or durable record across reloads.</li>
          <li>Polling observes only declared conditions. Incorrect requirements or an incomplete oracle can still produce a misleading verdict. This gate is deliberately task-specific.</li>
          <li>Model replay cannot establish that saved DOM evidence was authentic. It checks event legality and recomputes the reduced state, not the integrity of historical browser behavior.</li>
          <li>No screenshots are captured by the in-page tool. Original Parallax image and trace artifacts are excluded. Any presentation captures must be recaptured from this fresh fixture during separate browser QA.</li>
        </ul>
      </section>

      <section id="reproduce"><h2>Reproduce and challenge the workflow</h2>
        <ol>
          <li>Run the default task or step through each action. Inspect the pending save and the final committed row, then compare each action&apos;s before/after evidence.</li>
          <li>Select button-label drift and exact-name selection, then run. Switch to the known alias policy and run again. Configuration changes clear prior state and evidence.</li>
          <li>Set save latency to 700 ms, use the fixed wait, and run. Switch to condition waiting with a 1500 ms deadline and repeat. Then test a deadline shorter than the configured delay.</li>
          <li>Select the misleading notice, save rejection, a blank title, or a two-action budget. Check the unmet postconditions rather than only the last visual message.</li>
          <li>Export a trace, import it, and inspect the event replay. Load its configuration for a fresh run. Reset while a save is pending and verify that no late row appears.</li>
        </ol>
        <p>The <a href={DEMO_SOURCE}>browser edition source</a> and <a href={ORIGINAL_SOURCE}>public original Parallax source</a> are separate. From this branch&apos;s application directory with its existing dependencies:</p>
        <pre><code>{`npm run test -- --run --maxWorkers=1 src/lib/projects/workflow-observatory src/components/projects/workflow-observatory
npm run lint -- src/app/work/projects/workflow-observatory src/components/projects/workflow-observatory src/lib/projects/workflow-observatory`}</code></pre>
        <p>Focused tests check legal transitions, actual rendered-control execution, pending-state cancellation, condition gates, counterexamples, invalid inputs, and event replay. Production build and desktop/mobile browser acceptance remain separate from these engine and DOM checks.</p>
      </section>
    </article>
  </div>;
}
