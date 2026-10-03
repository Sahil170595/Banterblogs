import Link from 'next/link';
import { PacingDemo } from '@/components/projects/send-pacing/PacingDemo';
import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
import { MAX_RECEIPT_BYTES } from '@/lib/projects/send-pacing/receipt';
import { isoMicros, planShares, runReplay, SOURCE_REPLAY, SOURCE_SETTINGS } from '@/lib/projects/send-pacing/scheduler';
import SOURCE_RUNS from '@/lib/projects/send-pacing/source-runs.json';
import { sweep, SWEEP_SEEDS } from '@/lib/projects/send-pacing/sweep';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, TEMPOLEDGER] = PROJECT.links;
const sourceFile = (path: string) => `${TEMPOLEDGER.url.replace('/tree/', '/blob/')}/${path}`;

const PLAIN = {
  question: 'Pacing a message like a person',
  audit: 'What the audit finds',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  scheduler: 'How the scheduler decides',
  port: 'Checked against the original',
  origin: 'Where this comes from',
  'limits-detail': 'Limits in detail',
  reproduce: 'Reproduce it',
} as const;

// every number in the write-up is computed from the engine at render
const SWEEP = sweep();
const [source, longer, denser, late] = SWEEP;
const count = (n: number) => n.toLocaleString('en-US');
const S = SOURCE_SETTINGS;
const RUNS = SOURCE_RUNS as { case: { seed: number; count: number; duration_hours: number; start_hour: number }; send: string[] }[];
const reproduced = RUNS.filter((run) => {
  const result = runReplay({ seed: run.case.seed, count: run.case.count, durationHours: run.case.duration_hours, startHour: run.case.start_hour });
  return JSON.stringify(result.schedule.map((r) => isoMicros(r.sendTime))) === JSON.stringify(run.send);
}).length;
const seven = runReplay(SOURCE_REPLAY);
const shares = planShares(SOURCE_REPLAY.count);

const FINDINGS: ProjectFinding[] = [
  {
    value: `${count(source.lastTwoLate)} of ${count(SWEEP_SEEDS)} runs`,
    label: `of tempoledger’s own example, ${SOURCE_REPLAY.count} messages over ${SOURCE_REPLAY.durationHours} hours, send their last two messages before they could have been typed.`,
  },
  {
    value: `About ${source.atEnd.toFixed(0)} a run`,
    label: `messages land on the campaign’s last instant. The plan treats clock times such as 09:00 as delays from the start, so a ${SOURCE_REPLAY.durationHours}-hour campaign gets slots nine hours out and more, clamped back to its end.`,
  },
  {
    value: `${count(source.burst)} of ${count(SWEEP_SEEDS)} runs`,
    label: `also send more than ${S.maxBurst} messages within ${S.burstWindowSeconds} seconds, breaking the scheduler’s own burst limit.`,
  },
];

export default function SendPacingPage() {
  return (
    <ProjectPage
      slug={PROJECT.slug}
      demo={<PacingDemo sweep={SWEEP} seeds={SWEEP_SEEDS} />}
      findings={FINDINGS}
      checked={`Matches ${reproduced} of ${RUNS.length} recorded runs of the original, to the microsecond`}
      sections={projectSections(PLAIN, ENGINEERS)}
    >
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        tempoledger schedules outbound text messages so they go out the way a person would send them. Each message waits as long as typing it would
        take at a sampled speed, sometimes with a pause. Sends drift toward quarter hours in the busy hours, intervals are jittered (nudged at random)
        when they get too regular, bursts are spread out, and everything stays inside business hours and the campaign window.
      </p>
      <p>
        Human pacing matters in security-awareness training: a simulated phishing text only teaches people to recognise the real thing if it arrives
        the way a real person&apos;s message would, not in a machine-timed burst. I built human-like scheduling and self-hosted SMS simulation for
        that kind of training at GhostEye (<Link href="/work">see my work</Link>). tempoledger is my separate, public scheduler for the same problem,
        not GhostEye&apos;s code.
      </p>
      <p>
        Imitating a person is a set of timing promises, and the first is the simplest: a message cannot go before it could have been typed. The
        scheduler&apos;s own audit checks that, along with the burst limit, business hours and the campaign window, by looking at the finished
        schedule rather than trusting the steps that built it. This page runs that audit over a thousand seeds, each seed one reproducible random run.
      </p>

      <h2 id="audit">{PLAIN.audit}</h2>
      <p>
        Twelve messages over two hours, tempoledger&apos;s own replay: in {count(source.lastTwoLate)} of {count(SWEEP_SEEDS)} seeds the last two are
        sent before they could have been typed, and {count(source.burst)} also put more than {S.maxBurst} sends in a {S.burstWindowSeconds}-second
        window. The cause is in the campaign plan. {shares.quarter} of its {SOURCE_REPLAY.count} planned slots are quarter hours between 09:00 and
        16:45, as clock times, but the plan adds those to the campaign&apos;s start, so a two-hour campaign gets offsets of nine hours and more. They
        clamp to the campaign&apos;s end. About {source.atEnd.toFixed(0)} messages a run land on its final instant, each prepared from the send before
        it, so each after the first goes out before it is typed.
      </p>
      <p>
        Longer campaigns do not escape it: over eight hours, {count(longer.lastTwoLate)} of {count(SWEEP_SEEDS)} seeds still end the same way. Twice
        the messages in two hours breaks the burst limit in {count(denser.burst)}. Starting at 16:00, the business-hours clamp piles sends at 17:00
        instead, and {count(late.burst)} seeds break the burst limit. tempoledger&apos;s README says this plainly: a sampled distribution, a final
        projection and a queue are separate contracts, and clamping one does not keep the others.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        Not a model of real people: the timing heuristics were never validated against how anyone types or sends, and nothing here sends a message.
      </p>

      <ForEngineers lede="The per-message and per-campaign rules, the port of NumPy's generator that makes the replays match, the original's stack, and how to reproduce it.">
        <h3 id="scheduler">{ENGINEERS.scheduler}</h3>
        <p>
          <strong>Per message.</strong> A typing speed is drawn from a normal distribution, mean {S.wpmMean} and deviation {S.wpmStd} words a minute,
          clipped to {S.wpmMin} to {S.wpmMax}. With probability {S.pauseProbability} a pause is added, exponential with mean {1 / S.pauseLambda}{' '}
          seconds, clipped to 5 to 45. In the busy hours, 10:00 to 12:00 and 14:00 to 16:00, a target near a quarter hour is nudged toward it by a
          normal draw with a 3-minute deviation, which can move it earlier. Then the recent intervals are checked: a variance under{' '}
          {S.minIntervalVariance} square seconds adds gamma noise, a repeated interval adds a normal nudge, and {S.maxBurst} sends inside{' '}
          {S.burstWindowSeconds} seconds add a 30-to-60-second delay. Outside {S.businessStart}:00 to {S.businessEnd}:00, the target moves forward to
          the next opening.
        </p>
        <p>
          <strong>Per campaign.</strong> A plan draws 30 percent of the messages from the busy windows, half uniformly over the campaign, and the rest
          at quarter hours. The busy windows and the quarter hours are clock times used as offsets from the start, so in a short campaign the
          busy-window draws fall back to uniform and the quarter hours clamp to the end. Each message takes the later of its own target and its
          planned slot, then is clamped into the campaign and into business hours within it. The next message is prepared from this one&apos;s send.
        </p>

        <h3 id="port">{ENGINEERS.port}</h3>
        <p>
          The scheduler, its audit and its replay are ported from{' '}
          <a href={sourceFile('tempoledger/scheduling/engine.py')} target="_blank" rel="noopener noreferrer">
            engine.py
          </a>
          ,{' '}
          <a href={sourceFile('tempoledger/scheduling/audit.py')} target="_blank" rel="noopener noreferrer">
            audit.py
          </a>{' '}
          and{' '}
          <a href={sourceFile('tempoledger/replay.py')} target="_blank" rel="noopener noreferrer">
            replay.py
          </a>
          , with times as whole microseconds because Python&apos;s datetimes are. Matching a sampled schedule means matching its random numbers, so
          the page carries a port of NumPy&apos;s legacy RandomState: the Mersenne Twister, polar-method normals with the cached second value,
          Marsaglia and Tsang gamma, and masked-rejection integers. Its draws match NumPy bit for bit, and {reproduced} of {RUNS.length} recorded
          source replays come out identical: every send time to the microsecond, every typing time, every audit finding. Seed {SOURCE_REPLAY.seed}{' '}
          gives the README&apos;s numbers: {seven.stats.pauseCount} pauses, a span of {seven.stats.spanSeconds} seconds.
        </p>

        <h3 id="origin">{ENGINEERS.origin}</h3>
        <p>
          <a href={TEMPOLEDGER.url} target="_blank" rel="noopener noreferrer">
            tempoledger
          </a>{' '}
          is my scheduler and backend for text-message campaigns: Pydantic models, the NumPy timing engine, FastAPI routes, PostgreSQL storage with
          migrations, Celery send tasks, a provider adapter behind explicit opt-ins, OpenTelemetry, and an agent that proposes schedule changes but
          only logs them. The public release runs offline, delivery is simulated, and no message is sent. It publishes no delivery rates or
          throughput, only its fixture statistics, which this page reproduces.
        </p>

        <h3 id="limits-detail">{ENGINEERS['limits-detail']}</h3>
        <p>
          The replays use six-word synthetic messages and UTC with no holidays or daylight saving. This page ports the scheduling engine, its audit
          and its replay, not the backend, queue or provider adapter. An exported file is checked for consistency, not authenticity.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          Step through seeds: the last rows stay red in{' '}
          {source.lastTwoLate === SWEEP_SEEDS ? 'every one' : `${count(source.lastTwoLate)} of ${count(SWEEP_SEEDS)}`}. Pick the 16:00 replay and see
          the sends pile at closing time. Under the hood, raise the message count and read the burst findings in the message ledger. Export a replay
          and import it: the scheduler reruns and the file is refused if its send times do not follow. Files are limited to {MAX_RECEIPT_BYTES / 1000}{' '}
          KB. The port, the recorded source runs and the tests are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          . From the site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/send-pacing src/components/projects/send-pacing</code>
        </pre>
      </ForEngineers>
    </ProjectPage>
  );
}
