import { CodeVerificationDemo } from '@/components/projects/code-verification/CodeVerificationDemo';
import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
import { MAX_ASSERTIONS, MAX_ITEMS, MAX_STRING_LENGTH } from '@/lib/projects/code-verification/engine';
import { reportsFor } from '@/lib/projects/code-verification/matrix';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, PATCHGLASS] = PROJECT.links;

const PLAIN = {
  question: 'What a passing test establishes',
  results: 'What the four patches show',
  origin: 'Where this comes from',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  method: 'How a patch is graded',
  synthesis: 'Test synthesis mode',
  patchglass: 'Inside Patchglass',
  scope: 'What the rebuild leaves out',
  reproduce: 'Reproduce it',
} as const;
const sections = projectSections(PLAIN, ENGINEERS);

// every number in the write-up is computed from the engine at render
const intervals = reportsFor('intervals');
const byId = Object.fromEntries(intervals.map((r) => [r.candidate.id, r]));
const smokePasses = intervals.filter((r) => r.smoke.resolved).length;
const fullPasses = intervals.filter((r) => r.full.resolved).length;
const overfit = byId.overfit.full.counts;
const regression = byId.regression.full.counts;
const repairTests = byId.fixed.full.rows.filter((r) => r.group === 'repair').length;
const preserveTests = byId.fixed.full.rows.filter((r) => r.group === 'preserve').length;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// Patchglass's saved isolated-container runs, as recorded in the original evaluation:
// fail-to-pass tests repaired of those failing, pass-to-pass tests kept of those declared
type Tally = { passed: number; of: number };
const SAVED_RUNS: { run: string; repair: Tally; preserve: Tally | null; verdict: string }[] = [
  { run: 'Python repository, reference patch', repair: { passed: 4, of: 4 }, preserve: { passed: 52, of: 52 }, verdict: 'Resolved' },
  { run: 'Same task, successful model patch', repair: { passed: 4, of: 4 }, preserve: { passed: 52, of: 52 }, verdict: 'Resolved' },
  { run: 'Same task, unsuccessful model patch', repair: { passed: 0, of: 4 }, preserve: { passed: 52, of: 52 }, verdict: 'Not resolved' },
  { run: 'JavaScript repository, reference patch', repair: { passed: 3, of: 3 }, preserve: { passed: 288, of: 288 }, verdict: 'Resolved' },
  { run: 'Go repository, reference patch', repair: { passed: 2, of: 2 }, preserve: null, verdict: 'Resolved' },
];
const tally = (t: Tally | null) => (t ? `${t.passed}/${t.of}` : 'none declared');
const unsuccessful = SAVED_RUNS[2];
const kept = unsuccessful.preserve!;
const PROVENANCE = 'results from the original evaluation run; the public repo is a cleaned release without those run artifacts';

const FINDINGS: ProjectFinding[] = [
  {
    value: `${overfit.repaired}/${repairTests}`,
    label: `fail-to-pass tests (ones the bug fails and the fix must pass) repaired by the example-only patch. It recognizes the one demonstrated input, and the two-test smoke suite still passes it.`,
  },
  {
    value: `${regression.regressed}`,
    label: `pass-to-pass ${plural(regression.regressed, 'test', 'tests')} broken by the ordering patch while it repairs all ${regression.repaired} fail-to-pass tests. The gate is a conjunction, so repairs cannot cancel a regression.`,
  },
  {
    value: tally(unsuccessful.repair),
    label: `failing tests fixed by a model patch in Patchglass's own run, though it applied cleanly and kept ${tally(kept)} existing tests passing. These are ${PROVENANCE}.`,
  },
];

export default function CodeVerificationPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<CodeVerificationDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        A passing example is weak evidence for a repair. A patch can recognize that exact input and return its expected answer while
        staying wrong everywhere else; another can fix the reported bug and break an ordering that callers already depend on. A green
        badge hides both.
      </p>
      <p>
        So the verifier grades a patch by transitions: how each test&apos;s result changes. Every test runs twice, on the buggy function
        and on the patched one, against the same independently written expected value. A failure that now passes is a repair, a pass that
        still passes is preserved behavior, a failure that still fails is still broken, and a pass that now fails is a regression. The
        patch is resolved only when the change is not empty and every selected test passes after it.
      </p>

      <h2 id="results">{PLAIN.results}</h2>
      <p>
        Each task has {repairTests} fail-to-pass tests, which the bug fails and the fix must pass, and {preserveTests} pass-to-pass tests,
        which must pass both before and after. The smoke suite, a quick check, keeps one of each. On it, {smokePasses} of the{' '}
        {intervals.length} patches pass: every patch that changes the function at all. On the full suite, {fullPasses}{' '}
        {fullPasses === 1 ? 'does' : 'do'}.
      </p>
      <p>
        The example-only patch adds a special case for the demonstrated input. It repairs {overfit.repaired} of {repairTests} fail-to-pass
        tests and leaves {overfit.stillBroken} still broken, which the smoke suite never runs. The ordering patch repairs all{' '}
        {regression.repaired} and reverses the output order, breaking {regression.regressed} pass-to-pass{' '}
        {plural(regression.regressed, 'test', 'tests')}. Repair evidence cannot cancel a regression: the gate is a conjunction, not an
        average.
      </p>

      <h2 id="origin">{PLAIN.origin}</h2>
      <p>
        This page is a reduced rebuild of{' '}
        <a href={PATCHGLASS.url} target="_blank" rel="noopener noreferrer">
          Patchglass
        </a>
        , the container-based repair and test-synthesis harness I built in Python. It packages a repository at a commit, gives a solver a
        restricted workspace, and grades the patch in a fresh container. In its saved runs, a model&apos;s patch applied cleanly and broke
        none of {kept.of} existing tests, yet fixed {unsuccessful.repair.passed} of the {unsuccessful.repair.of} failing ones: a patch
        that applies and breaks nothing can still fix nothing. Those figures are {PROVENANCE}.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        Two small tasks with six tests each and four curated patches, not model output. There is no container or repository here, so
        nothing on this page measures an agent&apos;s ability to find or fix a bug.
      </p>

      <ForEngineers lede="How a patch is graded, how authored tests are judged, what Patchglass runs that this page does not, and how to rerun it.">
        <h3 id="method">{ENGINEERS.method}</h3>
        <p>
          <strong>Baseline polarity first.</strong> Before any patch is graded, the engine checks that every fail-to-pass test fails on the
          buggy function and every pass-to-pass test passes. A fixture that breaks that rule stops the run rather than producing a result.
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

        <h3 id="synthesis">{ENGINEERS.synthesis}</h3>
        <p>
          The same holds in test-synthesis mode, where the visitor writes the tests. A synthesized test is useful only if it fails before
          the reference repair and passes after it, and every authored test must pass on the fixed function. An already-passing assertion
          reproduces nothing; a wrong expectation stays wrong after the repair and rejects the suite.
        </p>

        <h3 id="patchglass">{ENGINEERS.patchglass}</h3>
        <p>
          A task bundle pins a repository commit, an image digest, test commands, a parser and graded test buckets. The solver gets a
          stripped workspace without the graded tests; grading happens in a fresh container with no network, dropped capabilities, a
          seccomp profile and resource limits, and hidden tests are staged only after the patch is applied. Results land in SQLite with
          the patch, image digest and task hash.
        </p>
        <div className="table-scroll" role="region" aria-label="Patchglass saved runs" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Saved run</th>
                <th scope="col">Fail-to-pass</th>
                <th scope="col">Pass-to-pass</th>
                <th scope="col">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {SAVED_RUNS.map((r) => (
                <tr key={r.run}>
                  <th scope="row">{r.run}</th>
                  <td>{tally(r.repair)}</td>
                  <td>{tally(r.preserve)}</td>
                  <td>{r.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Both model patches applied cleanly. One repaired all four failures; the other repaired none and preserved every existing test,
          which is the point of this page at repository scale. Those figures are {PROVENANCE}.
        </p>

        <h3 id="scope">{ENGINEERS.scope}</h3>
        <p>
          Passing the tasks does not prove a function correct; authored tests can probe new boundaries, but property tests or a proof
          would be stronger. Every test ships with the page, so this is an inspection tool, not a hidden-test leaderboard, and the string
          task uses JavaScript lowercase, not full Unicode case folding. There is no patch application, network policy or test-output
          parser here.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          The engine, patches and fixtures are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          . The tests cover baseline polarity, every patch, invalid inputs, contradictory synthesis expectations and replay. From the
          site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/code-verification</code>
        </pre>
      </ForEngineers>
    </ProjectPage>
  );
}
