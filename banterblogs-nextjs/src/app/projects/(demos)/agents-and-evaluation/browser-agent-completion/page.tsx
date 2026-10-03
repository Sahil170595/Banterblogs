import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
import { WorkflowDemo } from '@/components/projects/workflow-observatory/WorkflowDemo';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import { completion, DEFAULT_CONFIG, FIXED_WAIT_MS, initialSite, MAX_EVENTS, observeModel, planFor, POLL_MS } from '@/lib/projects/workflow-observatory/engine';
import { judge, SCENARIOS } from '@/lib/projects/workflow-observatory/scenarios';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, PARALLAX] = PROJECT.links;
const parallaxFile = (path: string) => `${PARALLAX.url.replace('/tree/', '/blob/')}/${path}`;

const PLAIN = {
  question: 'When is a reservation made?',
  evidence: 'What each kind of evidence says',
  origin: 'Where this comes from',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  method: 'How the executor and the gate work',
  failures: 'Why two executor runs fail',
  parallax: 'Parallax, in detail',
  'limits-detail': 'Its limits in detail',
  reproduce: 'Reproduce it',
} as const;
const sections = projectSections(PLAIN, ENGINEERS);

// every number in the write-up is computed from the engine at render
const VERDICTS = SCENARIOS.map((scenario) => ({ scenario, ...judge(scenario) }));
const attempts = VERDICTS.length;
const noticeYes = VERDICTS.filter((v) => v.notice).length;
const parallaxYes = VERDICTS.filter((v) => v.parallax).length;
const saved = VERDICTS.filter((v) => v.record).length;
const wrongNotices = VERDICTS.filter((v) => v.notice && !v.record).length;
const early = SCENARIOS.find((s) => s.id === 'checked-early')!.config;
const CONDITIONS = completion(observeModel(initialSite()), DEFAULT_CONFIG).conditions;
const PLAN = planFor(DEFAULT_CONFIG);
const spelled = (n: number) => ['none', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n);
const Spelled = (n: number) => spelled(n).replace(/^./, (c) => c.toUpperCase());

const FINDINGS: ProjectFinding[] = [
  {
    value: `${parallaxYes} of ${attempts}`,
    label: `attempts pass Parallax's completion check, the rule my earlier agent uses, which accepts any valid form after a typing step. ${Spelled(saved)} saved the booking that was asked for.`,
  },
  {
    value: `${noticeYes} of ${attempts}`,
    label: `attempts end on the success notice "Reservation saved". ${Spelled(wrongNotices)} of those notices are wrong.`,
  },
  {
    value: `${CONDITIONS.length}`,
    label: 'conditions the completion gate checks on the page, so it never relies on the notice alone: record, title, room, save, dialog, notice.',
  },
];

export default function BrowserAgentCompletionPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<WorkflowDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        An agent that operates a website has to decide when it is finished. The cheap answer is to trust the site: a success message, a
        closed dialog, a form that validates. Each of those can be true while the thing the user asked for does not exist. A notice can come
        from a save that wrote nothing, a correct-looking record can be in the wrong room, and a form validates the moment its fields are
        filled, before anything is submitted.
      </p>
      <p>
        So the question here is narrow and testable: what on the page justifies saying the reservation exists? The scheduling app is new
        and synthetic, built for this page. The executor, the program that does the clicking, operates its real controls: it clicks the
        button, types the title, picks the room, submits, and then waits on conditions rather than a clock. The completion gate is the
        check that decides whether it is done.
      </p>

      <h2 id="evidence">{PLAIN.evidence}</h2>
      <p>
        All {attempts} attempts ask for the same thing: {DEFAULT_CONFIG.title}, in North lab. The success notice is right when nothing goes
        wrong and when the save is refused. It is wrong {spelled(wrongNotices)} times: a save that reports success and commits no record,
        and a save to the wrong room, whose notice is identical to the good one. {Spelled(noticeYes)} notices, {spelled(saved)}{' '}
        reservation{saved === 1 ? '' : 's'}.
      </p>
      <p>
        Parallax&apos;s own check, the rule this rebuild started from, is weaker. After any step it treats as interactive, such as typing,
        filling or submitting, it accepts a status or alert element on the page, or a form with no invalid field. The form is valid as soon
        as the title is typed, so every attempt that gets that far passes: {parallaxYes} of {attempts}, including the save the server
        refused and the run that gave up before its save landed. Only the renamed button, where the form never opened, fails it. The same
        detector counts an error alert as a signal.
      </p>
      <p>
        The completion gate agrees with the committed record, the reservation the app actually stored, in every row because it reads that
        record. That is the design, not a discovery: a gate is only as good as its conditions, and these are written for this task. The
        record exists, its title and room match the request, the save completed, the dialog closed, and the notice is present. The notice
        is one of the {spelled(CONDITIONS.length)} conditions, never the only one.
      </p>

      <h2 id="origin">{PLAIN.origin}</h2>
      <p>
        This page rebuilds one narrow piece of{' '}
        <a href={PARALLAX.url} target="_blank" rel="noopener noreferrer">
          Parallax
        </a>
        , a browser agent I built in Python. It asks a model for a plan, carries the plan out in a real browser through Playwright, and
        records what it saw after every step. Reading its source for this page turned up the gap the table shows: its completion check
        accepts signs that something happened, not proof that the task did. The table runs that rule, ported to TypeScript, over the same
        attempts.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        One task on one synthetic app with a fixed plan: success here says nothing about arbitrary sites or about planning. Parallax itself
        is not run; its completion rule is ported and applied to this app&apos;s states.
      </p>

      <ForEngineers lede="How the executor and the gate work, why two runs fail, the rest of Parallax's source, the limits in full, and how to rerun it.">
        <h3 id="method">{ENGINEERS.method}</h3>
        <p>
          <strong>A fixed plan on real controls.</strong> The executor runs {PLAN.length} actions:{' '}
          {PLAN.map((step) => step.label.toLowerCase()).join(', ')}. Each goes through a small adapter scoped to the app: it finds the button
          by its accessible name, sets the title and room through the native inputs and their events, and clicks the real submit button.
          Before and after every action it samples the dialog, the inputs, the notice and the table, and records the change in role and name
          pairs as a Jaccard distance, the role-set distance in the trace. A large distance means the structure changed, not that anything
          succeeded.
        </p>
        <p>
          <strong>Waiting on conditions.</strong> After submitting, the executor polls the page until all {CONDITIONS.length} gate
          conditions hold or the deadline passes, and stops early if the save is rejected or a success notice appears without a record. An
          action budget caps the run, and a run that spends it is reported as exhausted, never as partly complete. Stop, reset and leaving
          the page cancel pending work, and a cancelled run cannot write into a newer one.
        </p>
        <p>
          <strong>Replay recomputes.</strong> Export writes the configuration, the app&apos;s events and the observed trace under a schema
          version. Import rebuilds the states by replaying those events through the same transition function and recomputes completion
          instead of trusting a saved status. An unknown version, an illegal event order or more than {MAX_EVENTS} events is refused. Replay
          is a reconstruction, not a recording: it does not recapture the page or its timing.
        </p>

        <h3 id="failures">{ENGINEERS.failures}</h3>
        <p>
          The two executor failures differ in kind. With a fixed {FIXED_WAIT_MS} ms wait on a {early.latencyMs} ms save, the executor checks
          before the save lands, calls the run failed and cancels the pending save; the condition wait polls every {POLL_MS} ms up to its{' '}
          {DEFAULT_CONFIG.timeoutMs} ms deadline and sees it commit. With exact-name selectors the renamed button is never found and the run
          stops at its first step; the alias policy, which knows one alternate name, recovers. That is one declared alias, not a planner
          finding a new strategy.
        </p>

        <h3 id="parallax">{ENGINEERS.parallax}</h3>
        <p>
          Parallax&apos;s interpreter asks a model provider for a structured plan and validates the plan&apos;s structure. Its navigator
          executes the plan through Playwright, resolving controls by role, test id, selector, text or XPath, with bounded retries, slow
          retyping when a value does not stick, and an optional vision fallback. Its observer records the URL, roles, dialogs, notices, form
          validity and loaders after every step, with screenshots at several viewport sizes, and its archivist writes JSONL, SQLite and
          readable reports beside a Playwright trace.
        </p>
        <p>
          Parallax{' '}
          <a href={parallaxFile('parallax/core/completion.py')} target="_blank" rel="noopener noreferrer">
            decides an interactive task is complete
          </a>{' '}
          when, after a step whose description mentions typing, filling, submitting or saving, the page has a status or alert element or a
          form with no invalid field. Those are signs that something happened, not that the task did. The rebuild keeps the separation
          Parallax&apos;s design was reaching for, between the action attempted, the transition observed and the task validated, and makes
          the last of those read the outcome.
        </p>
        <p>
          Two more things the source shows. When the local planner&apos;s reply cannot be parsed or comes back empty, its{' '}
          <a href={parallaxFile('parallax/llm/local_provider.py')} target="_blank" rel="noopener noreferrer">
            fallback
          </a>{' '}
          is a one-step plan that opens the start page, which can look like progress without planning anything. And screenshot redaction is
          on by default, but its helper returns the unredacted image if processing fails, so it is not a privacy guarantee.
        </p>

        <h3 id="limits-detail">{ENGINEERS['limits-detail']}</h3>
        <p>
          One task, one curated plan and one declared alias: success here says nothing about arbitrary sites or autonomous planning. The
          executor and the app share a page, so the trace is inspectable but not attested, and this is no isolation boundary against a
          hostile site. A committed row lives in memory and is gone on reload. The gate checks the conditions written for this task; a wrong
          or missing condition would give a wrong verdict just as confidently. There is no model, network request or screenshot here, and
          Parallax itself is not run: its completion rule is ported and applied to this app&apos;s states.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          Pick an attempt in the table to run it, or step through one action at a time and compare each action&apos;s before and after
          under the hood. There, set the wait policy to a fixed delay and the save latency below {FIXED_WAIT_MS} ms, and the early check
          succeeds. Export a run, reset, import it, and drag the replay to its last frame. The engine, the attempts, the ported Parallax rule
          and the adapter are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          ; the tests run every executor attempt against the transition model and check each verdict. From the site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/workflow-observatory src/components/projects/workflow-observatory</code>
        </pre>
      </ForEngineers>
    </ProjectPage>
  );
}
