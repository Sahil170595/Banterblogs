import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FlightLab } from '@/components/projects/flight-routing/FlightLab';
import { POLICY_LABELS, type Policy } from '@/lib/projects/flight-routing/engine';
import report from '@/lib/projects/flight-routing/experiment.json';
import styles from '@/components/projects/flight-routing/lab.module.css';

export const metadata: Metadata = {
  title: 'Flight Routing Lab',
  description: 'An interactive synthetic routing environment with seeded joint disruptions, legal action masks, deadline rewards and paired policy evaluation.',
  alternates: { canonical: '/work/projects/flight-routing' },
};
const SOURCE = 'https://github.com/Sahil170595/Banterblogs/blob/codex/demo-flight-routing/banterblogs-nextjs/src/lib/projects/flight-routing';

export default function FlightRoutingPage() {
  return <div className={styles.page}>
    <Link href="/work" className={styles.back}><ArrowLeft size={16} />Work</Link>
    <header className={styles.header}>
      <h1>Flight Routing Lab</h1>
      <p>Adaptive routing with joint disruptions and deadline-first rewards.</p>
    </header>
    <nav className={styles.nav} aria-label="Project sections"><a href="#demo">Lab</a><a href="#findings">Findings</a><a href="#method">Method</a><a href="#reproduce">Reproduce</a><a href={SOURCE.replace('/blob/', '/tree/')}>Public code</a></nav>
    <section id="demo" aria-label="Flight routing simulation">
      <p className={styles.scope}><strong>Synthetic fixture</strong> / adaptive routing / elapsed UTC minutes. <a href="#limits">Scope</a></p>
      <FlightLab />
    </section>
    <article className={styles.article} aria-label="Technical write-up">
      <section id="system">
        <h2>Underlying system: empirical routing and verification</h2>
        <p>This lab exposes one part of a larger Python routing and evaluation system I implemented. That system ingests monthly US flight-performance archives, constructs comparable-flight outcome pools, runs masked Gymnasium environments, plans deadline-aware itineraries, and independently verifies episode records against their configured schedules and donor rows. The browser edition replaces the historical data layer with public synthetic fixtures; it does not replace that engineering work or rerun its archived experiments.</p>
        <h3>From monthly archives to an auditable simulator</h3>
        <p>The ingestion pipeline streams resumable downloads, checks archive integrity and records content hashes. Chunked normalization writes partitioned Parquet while retaining cancellations and diversions even when ordinary arrival fields are missing. Local departures are converted through airport time zones; midnight rollover and ambiguous or nonexistent daylight-saving times are handled explicitly, with exclusions counted rather than silently guessed.</p>
        <p><strong>Archived pipeline audit, September 2026:</strong> the 2020-2024 run covered all 60 requested months, processed 33,173,483 raw rows and retained 2,651,910 rows within a 12-hub scope. Those are source-month processing counts, before a request&apos;s narrower loader filters, not the size of this browser fixture. The archive also records a separate 2025 evaluation window. Neither the full national routing network nor live bookable inventory was established by that scoped audit.</p>
        <p>The empirical model first seeks a route/carrier/departure-bucket/season pool with at least 30 rows. It progressively relaxes matching while staying on the same route, and marks a nonempty low-support route fallback when needed. Sampling preserves an intact donor&apos;s related disruption fields. This avoids inventing a cancellation plus an unrelated delay, but it does not establish cross-flight dependence; a separate synthetic dependence stress can couple flight severity ranks.</p>
        <h3>Evaluation boundaries were the main engineering problem</h3>
        <p>Schedules, policy information and transition donors are separate interfaces. Evaluation can expose 2025 schedules and outcome pools while policies receive only 2020-2024 priors and history. That is a policy-fitting separation, not prospective validation of a transition model: the simulator still uses retrospective evaluation-year outcomes. A fitted retrospective run can even include a schedule&apos;s own observed outcome in its donor pool, so calling every run held out would be wrong.</p>
        <p>An independent record verifier reconstructs continuity, boarding feasibility, realized times, attempt limits and terminal state. A second source-backed gate resolves schedule and donor identifiers against canonical eligible payloads, including pool membership and all timing/status fields. Forged but internally plausible records must not earn reward. Authentication is a hard prerequisite, not a small scoring term that successful arrival can offset. The configured source itself remains the trust boundary.</p>
        <p>The original planner bounds future branching and discretizes time/outcome distributions to keep empirical lookahead tractable; those approximations are not certified probability bounds. Separate committed-itinerary mechanics catch missed connections rather than substituting a later flight. Optional recovery makes notification and rebooking delays explicit while preserving the original request horizon. A masked linear policy-gradient learner and a local-model action adapter are implemented extensions, but neither executes on this page and no trained-policy advantage is claimed here.</p>
        <h3>What the archived findings actually showed</h3>
        <p><strong>Recorded historical-simulator finding, not a new browser result:</strong> six fixed 2025 requests were compared at both 12-hour and 8-hour deadlines, with 100 flight-keyed scenarios per policy and case. At eight hours, the deadline planner tied nonstop-first on five requests. On EWR to SLC it produced 10/100 deadline arrivals versus 0/100, but eventual arrival fell from 100/100 to 90/100. At twelve hours, the planner lost three requests, tied two and improved one. The selected requests are not a representative passenger sample, and simulator uncertainty is not a causal benefit estimate.</p>
        <p>The practical lesson was to separate destination completion, deadline success and policy return, then inspect the mechanism behind a change. More lookahead did not yield a general win. Legacy cancellation-exposure scoring duplicated failure, and scheduled connection slack could increase after a delay forced a later service; neither belongs in the current primary utility. The new synthetic experiment below makes that same tradeoff inspectable, but its numbers and rank generator are intentionally distinct from the archived runs.</p>
      </section>
      <section id="findings">
        <h2>What should a routing decision optimize?</h2>
        <p>A passenger needs to reach a destination before a deadline, not simply land somewhere quickly. Those objectives diverge surprisingly early: the shortest next flight can end at a dead-end airport; the fastest complete itinerary can expose a second cancellation; a late arrival can still be better than never arriving.</p>
        <p>I built this browser adaptation to make the routing objective inspectable. A small deterministic engine owns schedules, candidate enumeration, state transitions and terminal rewards. React owns controls and renders the engine state. The visualization is not a prerecorded sequence: selecting a flight changes the passenger clock, which changes the next legal action set. Rewinding restores the earlier state without changing that flight&apos;s seeded outcome.</p>
        <h3>Measured on the public fixture</h3>
        <p>The following results are new runs of <code>synthetic-network-v1</code>, not historical benchmarks. Each policy starts from SFO, uses a 30-minute boarding/transfer buffer, a 960-minute horizon and at most four attempts. The mixed profile supplies the same ten-row distribution to the policy model and simulator. The 64 scenario keys are 42 through 105.</p>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Recorded fixture experiment">
          <table><thead><tr><th>Policy</th><th>540-min deadline</th><th>475-min deadline</th></tr></thead><tbody>{report.normal.rows.map((row, i) => <tr key={row.policy}><th scope="row">{POLICY_LABELS[row.policy as Policy]}</th><td>{row.onTime}/64 on time<br />{row.arrived}/64 arrived<br />{row.meanReward.toFixed(4)} mean reward</td><td>{report.tight.rows[i].onTime}/64 on time<br />{report.tight.rows[i].arrived}/64 arrived<br />{report.tight.rows[i].meanReward.toFixed(4)} mean reward</td></tr>)}</tbody></table>
        </div>
        <p><strong>Lookahead is not automatically better.</strong> At 540 minutes, it selects the same direct service as nonstop-first and produces the same outcomes. At 475 minutes, the direct flight cannot arrive on schedule before the deadline. Lookahead switches to DEN and records 40 deadline arrivals instead of zero, but only 54 eventual arrivals instead of 62. Its two-leg path pays for deadline opportunities with additional disruption exposure.</p>
        <p>The greedy next-arrival policy records no destination arrivals. It chooses F1 to ORD, where this intentionally sparse catalog has no outgoing flight. That is a counterexample to the decision rule, not evidence that all real connecting itineraries fail. The random comparator explores legal actions but does not solve destination-aware planning.</p>
        <p>The full recorded artifact includes every terminal-reason count. For example, the default greedy run contains 58 no-candidate failures and six cancellations. Reporting only mean reward would hide that distinction. The artifact is checked against recomputation in <a href={`${SOURCE}/experiment.test.ts`}>the experiment test</a>; <a href={`${SOURCE}/experiment.json`}>the recorded JSON</a> preserves the exact configuration and counts.</p>
      </section>
      <section id="method">
        <h2>Mechanics and implementation</h2>
        <h3>Actions and state</h3>
        <p>A state consists of current airport, clock, attempted legs, request limits and termination reason. A flight is legal when it departs from the current airport and its scheduled departure falls between clock plus the buffer and the horizon, inclusive. Eligible flights are ordered by departure, arrival and identifier, then capped at eight slots. The binary mask pads unused slots with zero. The same buffer applies to the first flight as well as connections.</p>
        <p>A valid action selects one schedule and reveals one entire donor row. Departure delay, arrival delay, cancellation and diversion are not drawn independently. Ordinary arrival time is scheduled arrival plus sampled arrival delay; a destination-reaching diversion uses its separate diversion timing. Cancellation takes priority and terminates at the origin airport with no invented arrival. An unresolved diversion may disclose another airport in its leg evidence, but the passenger&apos;s last confirmed airport is retained in the terminal state.</p>
        <p>After an ordinary landing, the engine enumerates onward flights from actual landing time. It does not prebook a connection or let the passenger board a flight that already departed. If no onward candidate remains, the reason is <code>no_candidates</code>, not <code>missed_connection</code>. Arrival after the deadline is allowed until the horizon. Arrival beyond the horizon, the attempt limit, a padded invalid action and inconsistent timing each have a distinct terminal reason; stepping an already terminated episode is an error.</p>
        <h3>Reward is a terminal utility</h3>
        <pre><code>{'R = 0.80 * I(arrived by deadline)\n  + 0.10 * I(arrived at destination)\n  + 0.10 * I(arrived) * (horizon - arrival) / horizon'}</code></pre>
        <p>Intermediate transitions reward zero. With a 960-minute horizon, an arrival at minute 480 before the deadline yields <strong>0.9500</strong>: 0.80 + 0.10 + 0.05. The same direct flight with a 180-minute delay arrives at 660 and earns <strong>0.13125</strong> under the 540-minute deadline. A failed arrival earns zero; it does not collect earliness credit for ending early.</p>
        <p>This gives each on-time trip priority over each late trip. It does not make expected policy returns lexicographic in deadline probability: a policy can trade a small change in deadline success for enough arrival or earliness credit. The lookahead policy therefore optimizes modeled deadline-arrival probability explicitly, not the displayed reward.</p>
        <h3>Planning without observing the next sample</h3>
        <p>For each candidate, deadline lookahead enumerates the ten known synthetic donor outcomes, applies the same transition rules, and recursively chooses the best continuation until arrival or failure. Memoization keys are airport, clock and attempt count. The displayed model chance is a probability under this fixture, not a confidence interval or a calibrated forecast. Both schedule policies ignore donor statistics; the random policy uses a separate seeded action key.</p>
        <p><strong>Derived rather than measured:</strong> under the mixed profile and 540-minute deadline, F3 has a modeled 0.80 deadline chance. Eight of ten donor rows arrive at 480; the delayed row misses the deadline, and the cancelled row fails. F2 via DEN has 0.64: an ordinary inbound must be followed by an ordinary F5 outcome, giving 0.8 times 0.8. At deadline 475, F3 drops to zero while F2 retains 0.64. These exact model probabilities are separate from finite-seed frequencies such as 55/64.</p>
        <h3>Paired worlds and replay</h3>
        <p>A versioned integer rank function maps seed and flight identifier to a donor index. The same flight receives the same donor in a world regardless of which policy reaches it or how many earlier decisions were made. This avoids the confound of consuming a sequential random stream in different orders. It also makes a rewind a genuine counterfactual branch within one synthetic world.</p>
        <p>The browser rank generator is FNV-1a with an integer avalanche, not the cryptographic generator used by a larger simulator. Its seeds are not interchangeable with other implementations, and it makes no cryptographic or empirical independence guarantee. No future donor row is passed into lookahead: planning integrates the whole model distribution. The client bundle is public, however; hiding outcomes in the interface is not a security boundary.</p>
      </section>
      <section id="limits">
        <h2>Failure cases and fidelity boundaries</h2>
        <p>The smallest useful model exposes its own assumptions. There are six invented flights, ten joint donor rows per flight and two mirrored networks. ORD is a deliberate dead end. The reverse route mirrors the same timings and probabilities instead of pretending to be a second empirical dataset. Ten-row pools produce coarse probabilities. The clear and stress profiles are controlled fixture edits, not inferred weather or historical cancellation models. The stress profile includes both unresolved and destination-reaching diversions. Times start at 00:00 and use elapsed UTC minutes, not local airport clocks.</p>
        <p>This adaptation preserves the tested adaptive transition and primary reward mechanics, but omits prebooked itineraries, cancellation recovery, geographic distances, fares, carrier models, time zones, historical pool fitting, source-backed dataset authentication and learned policies. Input times are bounded positive integer offsets; fractional donor timing and elapsed-time-only diversion fallbacks are outside this fixture. Fixed reference cases check ten terminal paths against an independently executed transition implementation; they are not proof of every possible original behavior.</p>
        <p>The interface validates request limits before resetting the episode, so an invalid deadline cannot silently replace a good trace. Exports capture configuration, seed, fixture version, sampling identifier, selected flights, revealed donor rows, terminal reason, reward terms and any policy comparison. These exports are reproducible simulation records, not authenticated historical flight evidence. Small seeded counts must not be presented as passenger benefit, a held-out evaluation, or training gains.</p>
      </section>
      <section id="reproduce">
        <h2>Reproduction</h2>
        <ol>
          <li>Use SFO to JFK, mixed profile, seed 42, deadline 540, horizon 960, buffer 30 and four attempts. Apply the scenario and compare 64 worlds. This reproduces the first results column.</li>
          <li>Change only the deadline to 475, apply, and compare again. This reproduces the second column. Step manually through F2 and inspect which onward departure remains after the revealed inbound delay.</li>
          <li>Reset, select F1 and step. An ordinary sample ends at ORD with no candidates; a cancellation ends at SFO. Rewind preserves the scenario, then select F3 to compare a different initial choice.</li>
          <li>Export the JSON trace after a run or comparison. Match its fixture and sampling versions before comparing it with another export.</li>
        </ol>
        <p>The public implementation separates <a href={`${SOURCE}/fixtures.ts`}>synthetic fixtures</a>, <a href={`${SOURCE}/engine.ts`}>transition and policy logic</a>, <a href={`${SOURCE}/reference-cases.json`}>fixed expected cases</a> and <a href={`${SOURCE}/experiment.ts`}>the experiment entry point</a>. In the repository&apos;s Next.js app, use the installed dependencies and run:</p>
        <pre><code>{'npm test -- --run src/lib/projects/flight-routing src/components/projects/flight-routing --maxWorkers=1\nnpm run lint -- src/app/work/projects/flight-routing src/lib/projects/flight-routing src/components/projects/flight-routing'}</code></pre>
        <p>The focused suite checks reward arithmetic, reference terminal cases, model probabilities, deterministic replay, action masks, invalid inputs, policy counterexamples, the pinned experiment artifact and control interactions. The article is server-rendered HTML; only the lab needs JavaScript. No API key, model download, data download or paid inference call is needed.</p>
      </section>
    </article>
  </div>;
}
