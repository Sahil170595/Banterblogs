import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Verifier } from '@/components/projects/code-verification/Verifier';
import { CANDIDATES, TASKS, SOURCE_URL, evaluate, initialConfig } from '@/lib/projects/code-verification/engine';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Code Verification Lab',
  description: 'An actual browser evaluator for curated code repairs and authored tests, with baseline transitions, regression checks and replayable evidence.',
  alternates: { canonical: '/work/projects/code-verification' },
};

const measurements = TASKS.flatMap(task => CANDIDATES.map(candidate => {
  const config = { ...initialConfig(task.id), candidateId: candidate.id };
  return { task, candidate, full: evaluate(config), smoke: evaluate({ ...config, scope: 'smoke' }) };
}));

// Historical saved artifacts, not runs of the browser evaluator or a fresh model comparison.
const historicalFindings = [
  { run: 'Python repository / reference patch', repair: '4/4', preserve: '52/52', verdict: 'Resolved' },
  { run: 'Same Python task / successful model patch', repair: '4/4', preserve: '52/52', verdict: 'Resolved' },
  { run: 'Same Python task / unsuccessful model patch', repair: '0/4', preserve: '52/52', verdict: 'Not resolved' },
  { run: 'JavaScript repository / reference patch', repair: '3/3', preserve: '288/288', verdict: 'Resolved' },
  { run: 'Go repository / reference patch', repair: '2/2', preserve: 'Not declared', verdict: 'Resolved' },
];

export default function CodeVerificationPage() {
  return <div className={styles.page}>
    <Link href="/work" className={styles.back}><ArrowLeft size={15} />Back to work</Link>
    <header className={styles.heading}>
      <h1>Code Verification Lab</h1>
      <p>Does a change repair the bug without breaking what already worked? Evaluate real functions and compare every assertion before and after.</p>
    </header>
    <nav className={styles.nav} aria-label="Project sections">
      <a href="#demo">Verifier</a><a href="#underlying-system">Underlying system</a><a href="#findings">Findings</a><a href="#method">Method</a><a href="#reproduce">Reproduction</a>
    </nav>
    <section id="demo" aria-label="Interactive code verifier"><Verifier /></section>
    <p className={styles.fidelity}><strong>Reduced browser adaptation.</strong> These independently authored synthetic tasks execute curated JavaScript functions. The browser does not run the original isolated container harness, apply repository patches, generate tests with a model, or protect hidden tests. All fixtures and implementations are public.</p>

    <article className={styles.article} aria-label="Code verification technical report">
      <section id="question">
        <h2>The question: what does a passing test actually establish?</h2>
        <p>A passing example is weak evidence for a repair. A function can recognize that exact input, return its expected answer, and still be wrong everywhere the example did not reach. A different change can fix the reported bug while breaking ordering, normalization, or an empty-input convention that callers already depend on. Code verification therefore needs two distinct obligations: <strong>repair the known failure</strong> and <strong>preserve previously correct behavior</strong>.</p>
        <p>I implemented this evaluator to make those obligations inspectable rather than collapse them into a green badge. Every report includes the input, an independently specified expected output, the actual baseline output, the actual candidate output, and their transition. The verdict is a conjunction of executable assertions, not a label attached to a candidate. Even the intentionally bad implementations perform real computations.</p>
        <p>The design adapts a verification contract from an isolated task harness. In that setting, a task bundles a pinned repository state, a runtime, grading commands, and test buckets; grading happens separately from a solver&apos;s view. Here, the narrow interface is much smaller: a bounded JSON input, a curated pure function, and an exact-output assertion. That reduction keeps the central counterexamples usable in a browser while deliberately giving up environment fidelity and secrecy.</p>
      </section>

      <section id="underlying-system">
        <h2>Underlying system: isolated repository verification</h2>
        <p>The original implementation is a Python command-line system for packaging repository repair tasks, running patch-producing solvers, grading changes in isolated environments, and retaining inspectable evidence. It is substantially broader than the two browser tasks above. Its implemented paths include imported repository tasks, built and prebuilt environments, command and model-backed solvers, multi-language test parsing, test-synthesis grading, batch execution, and queryable run history.</p>
        <h3>The implemented end-to-end pipeline</h3>
        <ol>
          <li><strong>Package and validate the task.</strong> A typed bundle declares the repository commit, environment image, test command, parser, graded identifiers, resource limits, and network policy. Unknown metadata and overlapping test buckets are rejected. Environment initialization resolves a prebuilt image by digest or builds a repository-at-commit environment from a pinned base image.</li>
          <li><strong>Construct the solver&apos;s view.</strong> The system exports the baseline working tree, removes version-control history, strips files defining graded tests, and checks that their declared symbols are absent. A solver receives that reduced workspace and task description, not the grading container&apos;s hidden test material.</li>
          <li><strong>Obtain a real patch.</strong> Deterministic reference and no-op solvers provide controls. A command solver edits an isolated workspace and emits a diff; a host-side model solver produces a patch without placing provider credentials inside the grading environment. The patch and, when available, the solver response and selected context files become artifacts.</li>
          <li><strong>Grade separately.</strong> A fresh container resets to the declared commit, attempts patch application, neutralizes touched test infrastructure under the default blocking policy, stages hidden tests after the patch, and executes the declared command. Marker-delimited output and structured artifacts feed a registered parser; patch applicability and per-test outcomes both contribute to the verdict.</li>
          <li><strong>Persist and inspect.</strong> A run report records test buckets, producing solver, image digest, task-configuration hash, observed dependency hash, and warnings. SQLite stores commands, tasks, suites, runs, and individual test outcomes, while larger logs and patches remain file artifacts. Batch execution bounds parallelism and records per-cell failures instead of abandoning the entire matrix.</li>
        </ol>
        <p>The container boundary uses default network isolation, dropped capabilities, a required seccomp profile, no-new-privileges, CPU/memory/process limits, and wall-clock termination. Files cross through archive streams rather than host bind mounts. Untrusted command execution uses a non-root user. Network access is not universally forbidden: a task can explicitly opt into bridge networking when its environment needs it. Those are implemented controls, not capabilities simulated by this page.</p>
        <h3>Historical saved-run findings</h3>
        <p><strong>Source-bounded historical evidence.</strong> The following counts were checked against saved run artifacts during source review on October 3, 2026. They were not rerun for this browser edition. The underlying runtime and historical artifacts are not distributed with this page; the table summarizes their recorded verdicts without exposing repository identities. Reference-patch runs test the harness path, not autonomous problem-solving ability.</p>
        <div className={styles.tableScroll} tabIndex={0} aria-label="Scrollable historical underlying-system results">
          <table>
            <caption>Recorded isolated-runtime artifacts. These results are separate from the freshly computed synthetic-fixture table below.</caption>
            <thead><tr><th scope="col">Saved run</th><th scope="col">Repair passed</th><th scope="col">Preserve passed</th><th scope="col">Recorded verdict</th></tr></thead>
            <tbody>{historicalFindings.map(row => <tr key={row.run}><td>{row.run}</td><td>{row.repair}</td><td>{row.preserve}</td><td>{row.verdict}</td></tr>)}</tbody>
          </table>
        </div>
        <p>The three Python records share the same image digest and task-configuration hash. Both model-produced patches were recorded as applied, yet one preserved all 52 existing tests while repairing none of the four failures. The other repaired all four and preserved all 52. This is the important finding: <strong>an applicable, non-regressing patch is still not necessarily a repair</strong>. These selected records do not establish a general model ranking, success rate, or statistically controlled comparison.</p>
        <p>The JavaScript record exercises 291 declared assertions through the same reporting contract, rather than a Python-only mock runner. The Go record shows the language-independent command/parser path, but declares no preservation bucket. Its recorded resolution therefore provides no preservation-test evidence. The browser edition intentionally declares both buckets for both fresh tasks; it does not carry over the original repository counts as new demo performance.</p>
        <h3>Engineering tradeoffs and lessons</h3>
        <p><strong>Explicit commands versus environment guessing.</strong> A bundle names its build/test commands and parser rather than relying on a guessed repository convention. This keeps language-specific interpretation outside the orchestration core and makes unusual setup representable. It also puts real responsibility on task authors: a wrong command, missing service, or stale test identifier can invalidate the experiment.</p>
        <p><strong>Separate views versus maximum solver context.</strong> Removing whole graded-test files is conservative and language-neutral, but can remove benign tests that share a file. Fresh grading avoids inheriting a solver-mutated environment at the cost of container startup and staging work. The symbol checks are scoped to declared identifiers and test-file heuristics; they should not be mistaken for a formal secrecy proof over every possible repository layout.</p>
        <p><strong>Structural gates versus advisory detectors.</strong> Reverting touched test infrastructure before collection is an enforcing policy. Pattern scanners for outcome overrides and injected skips provide warnings, not a universal malicious-patch classifier. Similarly, a completely empty runner output is retried and ultimately reported as infrastructure failure instead of being silently converted into an unsuccessful repair. Missing, skipped, and error outcomes do not satisfy required tests; expected-failure status follows the original grading convention and is treated as passing.</p>
        <p><strong>Portable history versus fleet infrastructure.</strong> An embedded SQLite database and flat-file logs avoid a service deployment and keep a run inspectable on a workstation. Serialized writes limit concurrent write throughput. Suite resume skips previously resolved task/solver identities, so it should be used with unchanged bundle definitions rather than assumed to be drift-aware cache reuse. Configuration and observed-dependency hashes answer different reproducibility questions; neither alone proves deterministic behavior across hardware and runtime changes.</p>
        <p>The original test-synthesis path goes beyond input/expected pairs: it discovers tests added by a candidate patch, runs them on buggy and reference-patched code in separate containers, rejects non-test source edits, and can measure how much changed code the candidate executes. That coverage signal is advisory, not a correctness gate. A reproducing test can still assert the wrong specification or exercise the change for the wrong reason.</p>
        <h3>What this edition retains and removes</h3>
        <p>This edition retains the independently specified oracle, baseline polarity checks, separate repair/preservation evidence, empty-change rejection, buggy-versus-fixed synthesis criterion, and inspectable per-test reporting. It replaces repositories, shell commands, hidden tests, patch application, dependency resolution, and model execution with bounded public inputs and curated pure functions. The resulting interaction exposes the original evaluator&apos;s load-bearing reasoning without claiming to reproduce its runtime, security boundary, or agent results.</p>
      </section>

      <section id="findings">
        <h2>Findings from the current synthetic fixtures</h2>
        <p><strong>Computed fixture results, not an external benchmark.</strong> The table below is generated on the server by the same evaluator used in the interactive tool. Each task has three independently written repair assertions and three preservation assertions. The smoke suite selects only the first assertion from each bucket. There are no model calls, sampling runs, training measurements, or imported performance numbers behind these results.</p>
        <div className={styles.tableScroll} tabIndex={0} aria-label="Scrollable current fixture results">
          <table>
            <caption>Recomputed from <code>neutral-v1</code>: repaired failures and preserved passes are counted separately.</caption>
            <thead><tr><th scope="col">Task</th><th scope="col">Candidate</th><th scope="col">Smoke</th><th scope="col">Repair</th><th scope="col">Preserve</th><th scope="col">Full suite</th></tr></thead>
            <tbody>{measurements.map(({ task, candidate, full, smoke }) => <tr key={`${task.id}-${candidate.id}`}>
              <td>{task.title}</td><td>{candidate.label}</td>
              <td className={smoke.resolved ? styles.good : styles.warn}>{smoke.resolved ? 'Satisfied' : 'Rejected'}</td>
              <td>{full.counts.repaired}/3</td><td>{full.counts.preserved}/3</td>
              <td className={full.resolved ? styles.good : styles.warn}>{full.resolved ? 'Resolved' : 'Rejected'}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <h3>A narrow suite rewards example memorization</h3>
        <p>For both tasks, the example-only candidate satisfies the smoke suite but repairs only one of the three failures in the full suite. For interval union it recognizes one familiar endpoint pair; for deduplication it recognizes one familiar uppercase token. The mechanism is input-specific, not a hardcoded verdict. Changing the suite exposes genuine wrong outputs on a chain, a point interval, an unseen token, or an accented token.</p>
        <h3>Repair evidence cannot cancel a regression</h3>
        <p>The ordering-regression candidate repairs all three failure cases in each task but preserves only two of the three existing behaviors. Reversing interval output and sorting deduplicated strings both violate the stated ordering contracts. The full evaluator rejects these changes even though every bug-targeting assertion passes. Combining the buckets into a single fraction would hide the reason for rejection.</p>
        <h3>The oracle matters as much as the candidate</h3>
        <p>In synthesis mode, the default reproducer fails on the buggy function and passes on the general repair. An already-passing assertion alone does not reproduce the bug. A wrong expected output remains wrong after the repair. Adding a broken assertion alongside a good reproducer rejects the entire authored suite: one useful test does not justify shipping another broken one.</p>
      </section>

      <section id="method">
        <h2>Method and implementation</h2>
        <h3>Two neutral tasks with explicit specifications</h3>
        <p>Closed-interval union operates on finite <code>[start, end]</code> pairs. The contract includes touching endpoints, point intervals, negative coordinates, ascending output, and non-mutation. The baseline sorts the input but uses a strict overlap comparison; the general repair includes equality. Stable deduplication trims strings, keys them by JavaScript lowercase equivalence, and retains the first trimmed spelling in insertion order. Its baseline keys by exact spelling. These are fresh fixtures and implementations, not copies of an externally supplied task.</p>
        <p>The candidate functions live in <a href={`${SOURCE_URL}/candidates.ts`}>candidates.ts</a>. They are ordinary typed functions called directly; no <code>eval</code>, dynamic module loading, shell command, or remote worker executes visitor-provided code. The code inspector obtains the selected function&apos;s actual runtime representation. Bundling can optimize its formatting. The displayed replacement diff compares whole functions and is not presented as a patch that has been applied to a repository.</p>
        <h3>Baseline validation before grading</h3>
        <p>For every selected repair fixture, the baseline must fail; for every preservation fixture, it must pass. The <a href={`${SOURCE_URL}/engine.ts`}>engine</a> checks that polarity before it produces a report. Static public fixtures are validated when the module loads, so an invalid bucket or broken reference implementation stops execution rather than silently manufacturing a result. Baseline and candidate use the same separately authored expected value.</p>
        <p>Four transitions retain the causal shape of a change: fail-to-pass repairs a failure, pass-to-pass preserves behavior, fail-to-fail leaves a failure, and pass-to-fail is a regression. A repair is resolved only when a non-empty implementation change is selected and every selected assertion passes afterward. Smoke-suite satisfaction is labeled separately; it is not an assertion of full correctness. Choosing the empty patch leaves the baseline in place and cannot resolve the task.</p>
        <h3>Synthesis is differential evaluation, not model generation</h3>
        <p>A synthesized test is useful here only if at least one candidate assertion fails before the repair and passes afterward, and all candidate assertions pass on the fixed state. Visitors supply bounded input and expected-output arrays rather than executable test source. This prevents an assertion from secretly modifying the implementation or overriding the evaluator. Synthesis always compares the buggy function with the general repair; changing a repair candidate does not change that fixed oracle.</p>
        <p>Input validation caps arrays at 64 items, strings at 128 characters, coordinates at ±1,000,000, and authored suites at 16 assertions. Reversed intervals, non-finite numbers, malformed JSON, duplicate assertion IDs, unknown candidates, and incompatible expected shapes are rejected. Exact array equality includes output order; no tolerant comparison silently ignores a regression. Validation copies input arrays, and the interval implementations additionally construct their own working ranges.</p>
        <h3>Evidence and replay</h3>
        <p>A versioned JSON report records the task, candidate, mode, suite scope, authored assertions, fixture version, per-test observations, transition counts, and reason. There is no seed because this evaluator is deterministic. Import recomputes results from configuration instead of trusting stored verdicts. Unknown versions are rejected. Configuration changes clear old results so a report cannot look current after its candidate or suite changes.</p>
      </section>

      <section id="limits">
        <h2>Failure cases and limits</h2>
        <ul>
          <li><strong>Finite fixtures are not a proof.</strong> The general repair satisfies these fixtures, but that does not establish correctness over all inputs. Authored assertions can probe new boundaries; generated property tests or a formal argument would provide stronger evidence.</li>
          <li><strong>Tests are not hidden.</strong> Everything is shipped to the visitor. A hostile candidate could inspect public fixtures. This is an inspection tool, not a secure agent leaderboard or a defense against adversarial evaluation tampering.</li>
          <li><strong>The reference can be wrong.</strong> A fail-to-pass test discriminates between two implementations, but the fixed implementation still needs a justified specification. A wrong expected value or shared misconception can undermine the oracle.</li>
          <li><strong>Lowercase is not universal Unicode case folding.</strong> The string task uses the JavaScript operation explicitly named in its specification. It does not perform locale-sensitive collation or normalize canonically equivalent Unicode sequences.</li>
          <li><strong>The runtime is reduced.</strong> There is no Docker isolation, dependency pinning, network policy, test-output parser, patch applicability check, collection failure, timeout handling, coverage instrumentation, or multi-language runner. Browser functions cannot substantiate claims about those original harness capabilities.</li>
          <li><strong>No model capability is measured.</strong> Candidate repairs and assertion presets are human-readable curated alternatives. This demo does not measure an agent&apos;s ability to discover a bug, author a patch, or generate novel tests.</li>
        </ul>
        <p>The browser adaptation is intentionally strongest at explaining the verification contract: same input and oracle, two actual executions, visible transitions, a conjunctive gate, and reproducible reports. The isolated harness remains the appropriate boundary for evaluating untrusted repository changes with environment and grading separation. These two roles are related, not interchangeable.</p>
      </section>

      <section id="reproduce">
        <h2>Reproduce and challenge the result</h2>
        <ol>
          <li>Select either task and the example-only repair. Run the smoke suite, then switch to the full suite and run again. Inspect the assertions that still fail.</li>
          <li>Select the ordering-regression candidate on the full suite. Inspect the preservation failure and compare the exact output order with the expected order.</li>
          <li>In synthesis mode, clear the candidates and add only an already-passing assertion. Then add a reproducer, followed by a broken assertion. The three reports distinguish irrelevance, useful reproduction, and an invalid authored suite.</li>
          <li>Author a new input/expected assertion, export the report, reset, and replay the JSON. Replay executes the configuration again; changing a saved verdict does not change the computed verdict.</li>
        </ol>
        <p>The <a href={SOURCE_URL}>published engine, fixtures, and tests</a> provide a source-level reproduction path. From the application directory in that branch, using its existing dependency installation:</p>
        <pre><code>{`npm run test -- --run --maxWorkers=1 src/lib/projects/code-verification src/components/projects/code-verification
npm run lint -- src/app/work/projects/code-verification src/components/projects/code-verification src/lib/projects/code-verification`}</code></pre>
        <p>The focused tests cover baseline polarity, fixed/empty/overfit/regressing candidates, invalid inputs, contradictory synthesis expectations, JSON replay, reset, and stale-result clearing. They check implemented computation and component interactions. They do not replace production build or desktop/mobile browser QA.</p>
      </section>
    </article>
  </div>;
}
