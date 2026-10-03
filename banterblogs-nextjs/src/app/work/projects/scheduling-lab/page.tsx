import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SchedulingLab from '@/components/projects/scheduling-lab/SchedulingLab';
import styles from '@/components/projects/scheduling-lab/lab.module.css';
import { analyze, freshSession } from '@/lib/projects/scheduling-lab/engine';
import project from './project.json';

export const metadata: Metadata = { title: project.title, description: project.summary, alternates: { canonical: `/work/projects/${project.slug}` } };
const source = 'https://github.com/Sahil170595/Banterblogs/blob/codex/demo-scheduling-lab/banterblogs-nextjs/src/lib/projects/scheduling-lab';

export default function SchedulingPage() {
  const base = analyze(freshSession());
  const tightSession = freshSession('tight'), tight = analyze(tightSession);
  const audit = analyze({ ...tightSession, config: { ...tightSession.config, boundsPolicy: 'clamp-audit' } });
  const after = analyze(freshSession('after-hours'));
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="Project navigation"><Link href="/work" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Work</Link><a href="#demo">Simulator</a><a href="#underlying">Underlying system</a><a href="#findings">Findings</a><a href="#method">Method</a><a href="#reproduce">Reproduce</a></nav>
    <h1>{project.title}</h1>
    <p className={styles.intro}>Seeded preparation, pauses, interval jitter, and time-window constraints for synthetic event work. Scheduling is real computation; delivery and clock advancement are simulated only.</p>
    <SchedulingLab />
    <article className={styles.article} aria-label="Technical write-up">
      <section id="underlying">
        <h2>Underlying system</h2>
        <p><a href={project.sourceUrl}>Tempoledger</a> publishes the full Python timing engine and asynchronous backend, including typed models, API routes, PostgreSQL access, Celery tasks, telemetry, and a new offline reproduction path. Delivery defaults to simulation; adjustment proposals remain log-only. The browser uses a separate deterministic engine and a stronger forward-feasibility policy, not a deployed instance of that service.</p>
        <p>The underlying implementation is a Python scheduling service with typed workload models, an API, persisted schedule records, background workers, provider-compatible and mock gateway paths, and telemetry. The central engineering question is how to turn a campaign of events into a traceable schedule while reconciling preparation time, distribution preferences, operational hours, and a finite deadline. This browser edition extracts that scheduling question without carrying over original messages, identifiers, operating context, or infrastructure credentials.</p>
        <h3>Implemented architecture</h3>
        <p>The API validates workload messages, constructs a campaign, invokes the scheduler, and stores each event&apos;s scheduled time and reasoning metadata in PostgreSQL. A queued worker path polls due records and dispatches processing tasks. The gateway boundary separates transport from planning; a mock implementation simulates delivery when the provider is not configured. Telemetry records scheduling decisions, processing outcomes, and failures. Those are concrete implementation paths, not evidence that the service was deployed or that real delivery was independently qualified.</p>
        <p>The scheduler samples typing speed from a clipped normal distribution, derives preparation time from content length, draws a Bernoulli pause decision, and samples a bounded exponential pause when it fires. It considers quarter-hour opportunities near selected activity windows, then examines recent inter-event intervals. Low interval variance adds a gamma-distributed delay; repeated intervals can receive a Gaussian perturbation; a dense recent window can add a uniform delay. Campaign-level distribution slots are combined with those local timing decisions before final business-hour and duration adjustment.</p>
        <p>The implementation keeps the schedule separate from actual execution: intended time, actual processing time, transport outcome, and reasoning are distinct fields. That separation is useful for diagnosis because a late worker, a scheduling projection, and a provider failure are different causes. However, the presence of a queue and status fields does not establish exactly-once execution. Due-record selection and dispatch still need atomic claiming or idempotency guarantees before concurrent workers can be treated as a reliable delivery system.</p>
        <h3>Source-backed findings and tradeoffs</h3>
        <p>Single-event and campaign-level time adjustment use different policies. The single-event path moves after-hours work to the next opening. The bounded campaign path first clamps the timestamp into the campaign interval and then tries to place it at an opening or closing time inside that interval. If the campaign never overlaps an open window, those two requirements cannot both be met. If several proposals exceed the deadline, clamping can put them at the same boundary, compressing preparation and concentrating work. These are consequences of the inspected code, not measured production incidents.</p>
        <p>The original distribution planner expresses peak windows as relative offsets, while its comments discuss clock hours. A campaign offset is not a wall-clock time. Quarter-hour offsets clipped into a short duration can also accumulate at the deadline. This edition uses explicit UTC wall-clock anchors intersected with the campaign horizon and identifies that as an adaptation, not a byte-for-byte port. The comparison retains the original bounded-adjustment idea so its conflicts remain inspectable.</p>
        <p>The original event-controller layer can produce adjustment, replanning, and pause requests, with an optional model-assisted decision path and a fallback branch. The inspected adjustment handlers only log and return success-shaped descriptions; they do not mutate timing parameters, cancel queued work, or persist a paused state. I therefore do not present that layer as working adaptive control. The browser has direct parameter edits and a virtual clock, but no live agent, model call, queue mutation, or external delivery.</p>
        <p>The source regression tests cover chronological ordering, before/after-hours behavior, and campaign bounds across short and longer durations. Benchmark fixtures exercise ten-event and fifty-event campaigns, but the inspected latency tests do not assert the advertised percentile threshold, and no verified historical timing report is carried forward. One broad hour-range assertion is weaker than a real business-window invariant. The lesson is to test the final conjunction of constraints, not infer it from a series of locally reasonable adjustments or from a benchmark comment.</p>
      </section>
      <section id="findings">
        <h2>New synthetic fixture findings</h2>
        <p>All numbers in this section are computed during server rendering by the same deterministic engine as the tool. They belong to the newly authored fixture and browser policies, not to the original service, a learned policy, human timing data, or a deployed performance benchmark.</p>
        <p>With seed <strong>41</strong>, the review workload contains <strong>{base.events.length} events</strong> across a 90-minute horizon. The forward-feasible policy admits <strong>{base.metrics.admitted}</strong>, defers <strong>{base.metrics.deferred}</strong>, and reports <strong>{base.metrics.violationCount} invariant violations</strong>. Preparation durations come from actual text word counts and seeded samples; pauses occur on <strong>{base.metrics.pauseCount}</strong> events. Gap variability is a descriptive statistic of that resulting schedule, not a score of quality or an estimate of human behavior.</p>
        <p>The closing-time fixture starts at 16:59 UTC, has a two-minute campaign deadline, and uses a 17:00 business close. Under forward feasibility, <strong>{tight.metrics.admitted} events are admitted and {tight.metrics.deferred} deferred</strong>, with <strong>{tight.metrics.violationCount} violations</strong>. The clamp audit assigns timestamps to <strong>{audit.metrics.admitted}</strong> events but reports <strong>{audit.metrics.violationCount} violations</strong>. A larger admitted count is not an improvement when timestamps precede preparation, lie at an excluded closing boundary, or overload the trailing burst window.</p>
        <p>The after-hours fixture has no open window before its deadline. The forward policy admits <strong>{after.metrics.admitted}</strong> and explicitly defers <strong>{after.metrics.deferred}</strong>. It does not label forced timestamps as successful work. Across the tested seeds, the forward policy preserves the tested invariants; that finite test sweep is not an exhaustive proof over arbitrary workloads.</p>
      </section>
      <section id="method">
        <h2>Browser method</h2>
        <h3>A local random stream and observable stages</h3>
        <p>Each recomputation starts a local Mulberry32 stream from the exported unsigned seed. Box-Muller supplies Gaussian samples, and inverse-exponential sampling supplies pause and gamma-shape-two components. The random stream is isolated from other page activity. It is deliberately not NumPy-compatible, so the same integer seed cannot be used to claim identical original Python output. Conditional sampling also means that changing a pause threshold or scheduling policy can change subsequent draw consumption; this is deterministic replay, not a guaranteed common-random-number experiment.</p>
        <p>Typing speed is clipped to 30-80 WPM. Typing milliseconds are derived from trimmed word count; pauses are sampled with mean 12 seconds and clipped to 5-45 seconds. The mixed distribution keeps a fixed peak component, an editable quarter-hour cluster share, and a uniform remainder. The event count determines the integer allocation. Peak windows and anchors are intersected with the UTC campaign, with uniform fallback when the preferred anchor set is empty. These are scheduling distributions, not fitted behavioral models.</p>
        <p>The per-event trace preserves preparation completion, the cluster proposal, interval jitter and delay, the planned distribution slot, and the final projection. Signed jitter can move a proposal earlier; the forward policy never lets that shorten preparation. The timeline shows typing and pause spans, planned slots, admitted markers, open-hour bands, and the virtual clock. Events outside the feasible horizon remain unscheduled rather than receiving a fabricated marker.</p>
        <h3>Two policies, one invariant checker</h3>
        <p>The forward-feasible policy starts no earlier than the previous admitted event&apos;s preparation completion, local timing proposal, or planned slot. It moves closed-hour candidates forward to an opening and enforces the trailing burst limit using the earliest allowed release time. A candidate beyond the deadline becomes deferred work. The clamp-audit policy performs the source-style forward opening adjustment, distribution combination, and bounded clamp; it is intentionally available for examination, not presented as a safe dispatch policy.</p>
        <p>Both policies are checked after scheduling for campaign bounds, preparation completion, nondecreasing assignment order, business-hour membership, and trailing-window capacity. Campaign endpoints are allowed if they satisfy the other constraints, while business hours are half-open: opening is included, closing is excluded. Violation details attach to individual events. A final sort is used only for descriptive gaps and virtual-clock processing; it cannot erase an assignment-order violation.</p>
        <p>Runtime configuration and imported sessions are schema-validated. Invalid dates, non-finite numbers, reversed business hours, duplicate event IDs, empty text, and stale simulation cursors are rejected. Edits reset simulation progress and require recomputation before export or stepping. Replay validates the version and configuration, then recomputes the schedule; result fields inside an uploaded file are never trusted.</p>
      </section>
      <section>
        <h2>Failures and limits</h2>
        <ul>
          <li><strong>Infeasibility is an outcome:</strong> a short horizon, long preparation, or an entirely closed campaign may leave work unscheduled. Random delays cannot manufacture capacity.</li>
          <li><strong>Variance is not a service guarantee:</strong> a jitter rule can diversify intervals yet still violate a deadline or burst constraint. Gap CV can be undefined for too few admitted events or all-equal timestamps; the tool shows no invented value.</li>
          <li><strong>Calendar reduction:</strong> business hours repeat daily in UTC. There is no local timezone conversion, daylight-saving policy, weekday calendar, holiday list, recipient routing, or priority queue.</li>
          <li><strong>Scale boundary:</strong> the browser is limited to 48 synthetic events and a three-day horizon. It is not a queue-throughput or production-capacity benchmark.</li>
          <li><strong>Execution boundary:</strong> stepping advances a virtual clock and marks simulated processing. It does not send messages, run a provider adapter, invoke a model, or execute the original log-only adjustment handlers.</li>
        </ul>
      </section>
      <section id="reproduce">
        <h2>Reproduction</h2>
        <ol>
          <li>Reset the review workload. Keep seed 41, inspect a timeline row, and compare its text-derived preparation with its distribution slot and final timestamp. Export the versioned trace.</li>
          <li>Change the seed, typing speed, pause probability, jitter, cluster share, or event text. Recompute and inspect the resulting timestamps. Returning to the identical session reproduces the same schedule.</li>
          <li>Choose the closing-time conflict. Compare forward feasibility with bounded clamp audit and inspect preparation, business-hour, and burst violations instead of treating the admitted count alone as success.</li>
          <li>Choose the no-open-window fixture. Forward mode defers all work; the clamp audit shows why bounded timestamps alone do not satisfy operational hours.</li>
          <li>Step the virtual clock on an admitted schedule, export, and replay. The seed, configuration, text, and simulation cursor are preserved; schedule and audit results are recomputed.</li>
        </ol>
        <p>Public code includes the <a href={`${source}/engine.ts`}>scheduler and invariant audit</a>, <a href={`${source}/random.ts`}>local random stream</a>, <a href={`${source}/fixtures.ts`}>fresh synthetic workload</a>, and <a href={`${source}/engine.test.ts`}>domain tests</a>. The browser is independent of the original repository. A sanitized full-source edition remains separate from this inspectable adaptation.</p>
        <pre><code>{'npm run test -- --run --maxWorkers=1 src/lib/projects/scheduling-lab/engine.test.ts src/components/projects/scheduling-lab/SchedulingLab.test.tsx src/app/work/projects/scheduling-lab/page.test.tsx\nnpm run lint -- src/app/work/projects/scheduling-lab src/components/projects/scheduling-lab src/lib/projects/scheduling-lab'}</code></pre>
      </section>
    </article>
  </main>;
}
