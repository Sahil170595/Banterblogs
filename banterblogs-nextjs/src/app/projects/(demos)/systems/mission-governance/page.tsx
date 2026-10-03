import { MissionDemo } from '@/components/projects/mission-governance/MissionDemo';
import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
import { LONG_MISSION, SAMPLE_MISSION } from '@/lib/projects/mission-governance/contract';
import { fly, POLL_MS, TRANSITIONS } from '@/lib/projects/mission-governance/engine';
import { faultMatrix, flewBlind, MID_FLIGHT_AFTER } from '@/lib/projects/mission-governance/matrix';
import { reproducedRuns } from '@/lib/projects/mission-governance/runs';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, WYVERN] = PROJECT.links;
const sourceFile = (path: string) => `${WYVERN.url.replace('/tree/', '/blob/')}/${path}`;

const PLAIN = {
  question: 'Who decides a flight should end?',
  faults: 'What each fault does',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  lifecycle: 'How the lifecycle runs',
  port: 'Checked against the original',
  origin: 'Where this comes from',
  'limits-detail': 'Limits in detail',
  reproduce: 'Reproduce it',
} as const;

// every number in the write-up is computed from the engine at render
const ROWS = faultMatrix();
const C = SAMPLE_MISSION.constraints;
const total = LONG_MISSION.waypoints.length;
const home = ROWS.filter((r) => r.midFlight.state === 'rtl');
const blind = ROWS.filter((r) => flewBlind(r.midFlight));
const missing = ROWS.find((r) => r.fault === 'missing')!.atCheck;
const warnings = missing.validation.checks.filter((c) => c.status === 'warning').length;
const resumed = fly(LONG_MISSION, { fault: 'battery', when: 'resumed', afterPolls: MID_FLIGHT_AFTER, stall: false });
const resumedAt = resumed.events.findIndex((e) => e.reason === 'mission.resumed');
const pollsAfterResume = resumed.events.slice(resumedAt + 1).filter((e) => e.kind === 'poll').length;
const runs = reproducedRuns();
const states = Object.keys(TRANSITIONS).length;
const say = (n: number) => ['none', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n);

const FINDINGS: ProjectFinding[] = [
  {
    value: `${missing.progress} of ${total} waypoints`,
    label: `flown with no telemetry at all, after the pre-flight check passes with ${say(warnings)} warnings. The mission said: if the link is lost, return to launch.`,
  },
  {
    value: `${home.length} of ${ROWS.length - 1} faults`,
    label: `bring the flight home when they start mid-flight. The other ${say(blind.length)}, stale or missing telemetry, are only logged, and the flight goes on.`,
  },
  {
    value: `${pollsAfterResume} checks`,
    label:
      'of the drone after an operator pauses and resumes a mission: the loop that watches the flight ends at the pause, and nothing restarts it.',
  },
];

export default function MissionGovernancePage() {
  return (
    <ProjectPage
      slug={PROJECT.slug}
      demo={<MissionDemo />}
      findings={FINDINGS}
      checked={`Matches ${runs.matched} of ${runs.total} recorded runs of the original in Python`}
      sections={projectSections(PLAIN, ENGINEERS)}
    >
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        ProjectWyvern governs drone missions between a control plane that approves them and a flight controller that flies them. A mission is
        validated before flight, approved by an operator, then executed by a loop that polls the vehicle and asks a safety guard whether to keep
        going. Its contract makes every mission declare what to do when the link is lost: hold, return to launch, or land. The sample mission says
        return.
      </p>
      <p>
        The question this page asks the code is simple: when the guard cannot see the vehicle, what happens to the flight? The answer comes from
        Wyvern&apos;s own validator, guard and executor, run against its own sample mission. It is about Wyvern&apos;s software layer, not an
        aircraft: a real PX4 flight controller has its own link-loss failsafe, which this page does not model.
      </p>

      <h2 id="faults">{PLAIN.faults}</h2>
      <p>
        The guard names six kinds of trouble and sorts them by prefix. A battery under the {C.min_battery_percent} percent floor, a link quality under
        0.3 and an estimator (the flight controller&apos;s estimate of the drone&apos;s position) that is not nominal are &ldquo;degraded&rdquo;; a
        mission past its {C.mission_timeout_s}-second timeout is &ldquo;timeout&rdquo;. The executor returns to launch on those. No telemetry at all,
        or telemetry older than {C.telemetry_freshness_ms} milliseconds, is &ldquo;blocked&rdquo;, and the executor only logs it. Nothing in the code
        reads the declared link-loss policy.
      </p>
      <p>
        So the faults split. Started after waypoint {MID_FLIGHT_AFTER} of the sample route flown twice, {say(home.length)} bring the flight home at
        the next waypoint, and {say(blind.length)}, stale or missing telemetry, are logged while the flight finishes all {total} waypoints. Before
        flight it is worse for the case that matters most: with no telemetry at all, the battery and freshness checks become warnings rather than
        failures, the mission passes, and it flies. The link and the estimator are not checked before flight at all.
      </p>
      <p>
        Two more gaps. The pre-flight fence check tests the waypoints, not the legs between them, so a straight leg can cross a concave fence between
        two waypoints inside it; pick the notched fence in the demo. And the resume route sets a paused mission back to executing without restarting
        the executor, whose loop ended at the pause: after a resume, a battery failure goes unseen and the mission stays {resumed.state} at waypoint{' '}
        {resumed.progress}, with nothing polling, guarding or completing it.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        A flight test. It runs Wyvern&apos;s own lifecycle logic on one sample mission with a mock vehicle: no aircraft, simulator or flight
        controller, and nothing here is airworthiness or regulatory evidence.
      </p>

      <ForEngineers lede="The state graph, the validator and the executor loop, the check against Wyvern running in Python, and how to reproduce it.">
        <h3 id="lifecycle">{ENGINEERS.lifecycle}</h3>
        <p>
          <strong>Fifteen states, one graph.</strong> The {states} states run from draft through validation, approval, staging and execution to
          completed, with branches to pause, resume, return to launch, abort, fail and hand over to a pilot. Every transition is checked against the
          graph and recorded with its actor and reason.
        </p>
        <p>
          <strong>Before flight.</strong> The validator checks that every waypoint is inside the fence and under {C.max_altitude_m} metres, that the
          cached battery is above its floor and the telemetry fresh, that Remote ID is active when required, and that a Part 107 flight has an
          airspace authorization reference. A failure stops the mission before approval; a warning does not.
        </p>
        <p>
          <strong>In flight.</strong> The executor uploads the route, arms and starts the vehicle, then polls every {POLL_MS} milliseconds: if the
          vehicle has reached its last waypoint the mission completes, and otherwise the guard runs. Completion is checked first, so a fault on the
          final waypoint is never seen.
        </p>

        <h3 id="port">{ENGINEERS.port}</h3>
        <p>
          The graph, the validator, the guard and the executor loop are ported from{' '}
          <a href={sourceFile('src/wyvern/state_machine.py')} target="_blank" rel="noopener noreferrer">
            state_machine.py
          </a>
          ,{' '}
          <a href={sourceFile('src/wyvern/services/validation.py')} target="_blank" rel="noopener noreferrer">
            validation.py
          </a>
          ,{' '}
          <a href={sourceFile('src/wyvern/services/safety_guard.py')} target="_blank" rel="noopener noreferrer">
            safety_guard.py
          </a>{' '}
          and{' '}
          <a href={sourceFile('src/wyvern/services/executor.py')} target="_blank" rel="noopener noreferrer">
            executor.py
          </a>
          , with the vehicle as the source&apos;s mock, which reaches one waypoint per poll, on a virtual clock. To check it, Wyvern itself was run in
          Python on its sample mission: its validator, then its executor with its guard and mock vehicle, for every fault at the pre-flight check and
          mid-flight, a stalled flight past its timeout, and a pause and resume. The port matches {runs.matched} of {runs.total} recorded runs: the
          same checks, the same final state, the same waypoint, the same reason.
        </p>

        <h3 id="origin">{ENGINEERS.origin}</h3>
        <p>
          <a href={WYVERN.url} target="_blank" rel="noopener noreferrer">
            ProjectWyvern
          </a>{' '}
          is the autonomy plane of my Chimera ecosystem: a FastAPI service that owns mission validation, command arbitration, execution, telemetry
          normalization and replay, between the Chimera control plane and a PX4 or ArduPilot flight controller. Its design puts the flight
          controller&apos;s own failsafes at the top of its authority hierarchy, above the pilot, the operator and Wyvern itself. A real PX4 has its
          own link-loss failsafe, so what this page shows is Wyvern&apos;s layer not acting on the policy it asks every mission to declare, not what a
          particular aircraft would do.
        </p>

        <h3 id="limits-detail">{ENGINEERS['limits-detail']}</h3>
        <p>
          The vehicle is the source&apos;s mock, which reaches a waypoint per poll and has no failsafes of its own. Telemetry is the cached record the
          guard reads, set per scenario. The fence and route are the source&apos;s synthetic sample, and the notched fence is this page&apos;s own
          example. The leg check is this page&apos;s addition; the source does not make it.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          Pick cells in the table and fly them on the map; set the fault after a pause and resume and watch the mission stay executing; pick the
          notched fence and see the leg leave it. The event log, with the source&apos;s own codes, is under the hood. The port, the recorded Python
          runs and the tests are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          . From the site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/mission-governance src/components/projects/mission-governance</code>
        </pre>
      </ForEngineers>
    </ProjectPage>
  );
}
