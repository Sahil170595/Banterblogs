import { CodeVerificationDemo } from '@/components/projects/code-verification/CodeVerificationDemo';
import { ProjectPage, type ProjectFinding, type ProjectSection } from '@/components/projects/ProjectPage';
import { MAX_ASSERTIONS, MAX_ITEMS, MAX_STRING_LENGTH } from '@/lib/projects/code-verification/engine';
import { reportsFor } from '@/lib/projects/code-verification/matrix';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, PATCHGLASS] = PROJECT.links;

const SECTIONS = {
  question: 'What a passing test establishes',
  results: 'What the four patches show',
  method: 'How a patch is graded',
  origin: 'Where this comes from',
  limits: 'What this fixture is not',
  reproduce: 'Reproduce it',
} as const;
const sections: ProjectSection[] = Object.entries(SECTIONS).map(([id, title]) => ({ id, title }));

// every number in the write-up is computed from the engine at render
const intervals = reportsFor('intervals');
const byId = Object.fromEntries(intervals.map((r) => [r.candidate.id, r]));
const smokePasses = intervals.filter((r) => r.smoke.resolved).length;
const fullPasses = intervals.filter((r) => r.full.resolved).length;
const overfit = byId.overfit.full.counts;
const regression = byId.regression.full.counts;
const repairTests = byId.fixed.full.rows.filter((r) => r.group === 'repair').length;
const preserveTests = byId.fixed.full.rows.filter((r) => r.group === 'preserve').length;

// Patchglass's saved isolated-container runs, as recorded in the original evaluation
const SAVED_RUNS = [
  { run: 'Python repository, reference patch', repair: '4/4', preserve: '52/52', verdict: 'Resolved' },
  { run: 'Same task, successful model patch', repair: '4/4', preserve: '52/52', verdict: 'Resolved' },
  { run: 'Same task, unsuccessful model patch', repair: '0/4', preserve: '52/52', verdict: 'Not resolved' },
  { run: 'JavaScript repository, reference patch', repair: '3/3', preserve: '288/288', verdict: 'Resolved' },
  { run: 'Go repository, reference patch', repair: '2/2', preserve: 'none declared', verdict: 'Resolved' },
];

const FINDINGS: ProjectFinding[] = [
  { value: `${smokePasses} → ${fullPasses}`, label: `of ${intervals.length} patches pass: on the two-test smoke suite, then on the full suite.` },
  { value: `${overfit.repaired}/${repairTests}`, label: 'failures the example-only patch repairs. It recognizes the one demonstrated input.' },
  { value: `${regression.regressed}`, label: `regression rejects the ordering patch, though it repairs all ${regression.repaired} failures.` },
];

export default function CodeVerificationPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<CodeVerificationDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{SECTIONS.question}</h2>
      <p>
        A passing example is weak evidence for a repair. A patch can recognize that exact input and return its expected answer while
        staying wrong everywhere else; another can fix the reported bug and break an ordering that callers already depend on. A green
        badge hides both.
      </p>
      <p>
        So the verifier grades a patch by transitions. Every test runs twice, on the buggy function and on the patched one, against the
        same independently written expected value. A failure that now passes is a repair, a pass that still passes is preserved behavior,
        a failure that still fails is still broken, and a pass that now fails is a regression. The patch is resolved only when the change
        is not empty and every selected test passes after it.
      </p>

      <h2 id="results">{SECTIONS.results}</h2>
      <p>
        Each task has {repairTests} tests the bug must fail and the fix must pass, and {preserveTests} it must pass both before and after.
        The smoke suite keeps one of each. On it, {smokePasses} of the {intervals.length} patches pass: every patch that changes the
        function at all. On the full suite, {fullPasses} {fullPasses === 1 ? 'does' : 'do'}.
      </p>
      <p>
        The example-only patch adds a special case for the demonstrated input. It repairs {overfit.repaired} of {repairTests} failures and
        leaves {overfit.stillBroken} still broken, which the smoke suite never runs. The ordering patch repairs all {regression.repaired}{' '}
        failures and reverses the output order, breaking {regression.regressed} preserved {regression.regressed === 1 ? 'test' : 'tests'}.
        Repair evidence cannot cancel a regression: the gate is a conjunction, not an average.
      </p>
      <p>
        The same holds in test-synthesis mode, where the visitor writes the tests. A synthesized test is useful only if it fails before
        the reference repair and passes after it, and every authored test must pass on the fixed function. An already-passing assertion
        reproduces nothing; a wrong expectation stays wrong after the repair and rejects the suite.
      </p>

      <h2 id="method">{SECTIONS.method}</h2>
      <p>
        <strong>Baseline polarity first.</strong> Before any patch is graded, the engine checks that every repair test fails on the buggy
        function and every preservation test passes. A fixture that breaks that rule stops the run rather than producing a result.
      </p>
      <p>
        <strong>Curated functions, not uploaded code.</strong> The patches are ordinary typed functions called directly; nothing the
        visitor types is executed as code. Visitors supply bounded input and expected-output data instead: up to {MAX_ITEMS} items,
        strings up to {MAX_STRING_LENGTH} characters and {MAX_ASSERTIONS} authored tests, with malformed JSON, reversed intervals and
        mismatched shapes rejected.
      </p>
      <p>
        <strong>Evidence and replay.</strong> A report records the task, patch, mode, suite, authored tests, every observation and the
        transition counts. Import recomputes the result from the configuration rather than trusting the saved verdict, so editing a
        report&apos;s verdict changes nothing.
      </p>

      <h2 id="origin">{SECTIONS.origin}</h2>
      <p>
        This page is a reduced rebuild of{' '}
        <a href={PATCHGLASS.url} target="_blank" rel="noopener noreferrer">
          Patchglass
        </a>
        , the isolated repository-verification harness I built in Python. A task bundle pins a repository commit, an image digest, test
        commands, a parser and graded test buckets. The solver gets a stripped workspace without the graded tests; grading happens in a
        fresh container with no network, dropped capabilities, a seccomp profile and resource limits, and hidden tests are staged only
        after the patch is applied. Results land in SQLite with the patch, image digest and task hash.
      </p>
      <div className="table-scroll" role="region" aria-label="Patchglass saved runs" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Saved run</th>
              <th scope="col">Repair</th>
              <th scope="col">Preserve</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {SAVED_RUNS.map((r) => (
              <tr key={r.run}>
                <th scope="row">{r.run}</th>
                <td>{r.repair}</td>
                <td>{r.preserve}</td>
                <td>{r.verdict}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Both model patches applied cleanly. One repaired all four failures; the other repaired none and preserved every existing test,
        which is the point of this page at repository scale: a patch that applies and breaks nothing can still fix nothing. Those figures
        are results from the original evaluation run; the public repo is a cleaned release without those run artifacts.
      </p>

      <h2 id="limits">{SECTIONS.limits}</h2>
      <p>
        Two small tasks with six tests each. Passing them does not prove a function correct; authored tests can probe new boundaries,
        but property tests or a proof would be stronger. Every test ships with the page, so this is an inspection tool, not a hidden-test
        leaderboard, and the string task uses JavaScript lowercase, not full Unicode case folding.
      </p>
      <p>
        There is no container, repository, patch application, network policy or test-output parser here, and the patches are curated
        alternatives, not model output: nothing on this page measures an agent&apos;s ability to find or fix a bug.
      </p>

      <h2 id="reproduce">{SECTIONS.reproduce}</h2>
      <p>
        The engine, patches and fixtures are in the{' '}
        <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
          demo source
        </a>
        . The tests cover baseline polarity, every patch, invalid inputs, contradictory synthesis expectations and replay. From the
        site&apos;s Next.js app:
      </p>
      <pre>
        <code>npx vitest run src/lib/projects/code-verification</code>
      </pre>
    </ProjectPage>
  );
}
