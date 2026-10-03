import { FlightRoutingDemo } from '@/components/projects/flight-routing/FlightRoutingDemo';
import { ProjectPage, type ProjectFinding, type ProjectSection } from '@/components/projects/ProjectPage';
import { actionValues, createEpisode, DEFAULT_CONFIG, formatTime, POLICY_LABELS, REWARD_WEIGHTS, type Policy } from '@/lib/projects/flight-routing/engine';
import { EXPERIMENT_WORLDS, TIGHT_CONFIG } from '@/lib/projects/flight-routing/experiment';
import recorded from '@/lib/projects/flight-routing/experiment.json';
import referenceCases from '@/lib/projects/flight-routing/reference-cases.json';
import { evaluateWorlds } from '@/lib/projects/flight-routing/worlds';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, GATEBOUND] = PROJECT.links;

const SECTIONS = {
  objective: 'What the router is rewarded for',
  result: 'When lookahead wins, and what it costs',
  environment: 'The environment',
  origin: 'Where this comes from',
  limits: 'What this fixture is not',
  reproduce: 'Reproduce it',
} as const;
const sections: ProjectSection[] = Object.entries(SECTIONS).map(([id, title]) => ({ id, title }));

// every number in the write-up comes from the pinned run or the engine itself
const row = (run: typeof recorded.normal, policy: Policy) => run.rows.find((r) => r.policy === policy)!;
const slack = { nonstop: row(recorded.normal, 'nonstop'), deadline: row(recorded.normal, 'deadline') };
const tight = {
  nonstop: row(recorded.tight, 'nonstop'),
  deadline: row(recorded.tight, 'deadline'),
  greedy: row(recorded.tight, 'greedy'),
};
const reference = (name: string) => referenceCases.find((c) => c.name === name)!.expected;
const onTimeNonstop = reference('direct-on-time');
const lateNonstop = reference('direct-late');
// the planner's modelled on-time chance for each first flight: F1, F2 via DEN, F3 nonstop
const [, slackViaDenver, slackNonstop] = actionValues(createEpisode(DEFAULT_CONFIG));
const [, tightViaDenver, tightNonstop] = actionValues(createEpisode(TIGHT_CONFIG));
const pct = (chance: number) => `${Math.round(chance * 100)}%`;
const PAIRED_POLICIES: Policy[] = ['nonstop', 'deadline', 'greedy', 'random'];

const FINDINGS: ProjectFinding[] = [
  {
    value: `${tight.nonstop.onTime} → ${tight.deadline.onTime}`,
    label: `of ${EXPERIMENT_WORLDS} worlds on time when the deadline falls five minutes before the nonstop lands: nonstop-first, then deadline lookahead.`,
  },
  {
    value: `−${tight.nonstop.arrived - tight.deadline.arrived}`,
    label: 'arrivals: the price of those on-time worlds. The connection through Denver takes two disruption draws instead of one.',
  },
  {
    value: `${tight.greedy.reasons.no_candidates ?? 0}/${EXPERIMENT_WORLDS}`,
    label: 'greedy runs stranded in Chicago: the earliest landing is a dead end. Mean reward alone would not say why.',
  },
];

export default function FlightRoutingPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<FlightRoutingDemo initialWorlds={evaluateWorlds(TIGHT_CONFIG)} />} findings={FINDINGS} sections={sections}>
      <h2 id="objective">{SECTIONS.objective}</h2>
      <p>
        A passenger has to reach JFK before a deadline. Landing somewhere soon is not the goal, and neither is landing eventually: the
        quickest next flight can strand them, and the fastest whole itinerary can expose them to a second cancellation. The reward says
        so directly. It is paid once, when the trip ends:
      </p>
      <pre>
        <code>
          {`R = ${REWARD_WEIGHTS.deadline.toFixed(2)} × on time\n  + ${REWARD_WEIGHTS.arrival.toFixed(2)} × arrived\n  + ${REWARD_WEIGHTS.earliness.toFixed(2)} × arrived × (horizon − arrival) / horizon`}
        </code>
      </pre>
      <p>
        Any on-time arrival outscores any late one, and a late arrival still beats never arriving. The nonstop landing on schedule at{' '}
        {formatTime(onTimeNonstop.clock)} earns {onTimeNonstop.reward}; the same flight landing at {formatTime(lateNonstop.clock)}, past
        the {formatTime(DEFAULT_CONFIG.deadline)} deadline, earns {lateNonstop.reward}; a cancellation earns nothing.
      </p>

      <h2 id="result">{SECTIONS.result}</h2>
      <p>
        Four policies run over the same {EXPERIMENT_WORLDS} seeded worlds. With a {formatTime(DEFAULT_CONFIG.deadline)} deadline,
        deadline lookahead books the same nonstop as nonstop-first and the two match world for world: {slack.deadline.onTime} of{' '}
        {EXPERIMENT_WORLDS} on time, {slack.deadline.arrived} arrived. Move the deadline to {formatTime(TIGHT_CONFIG.deadline)}, five
        minutes before the nonstop is due, and nonstop-first is on time in {tight.nonstop.onTime} worlds while lookahead switches to the
        connection through Denver and is on time in {tight.deadline.onTime}. It pays for them: {tight.deadline.arrived} arrivals instead
        of {tight.nonstop.arrived}, because two legs take two disruption draws.
      </p>
      <div className="table-scroll" role="region" aria-label="Recorded 64-world comparison" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Policy</th>
              <th scope="col" className="num">
                On time, {formatTime(DEFAULT_CONFIG.deadline)}
              </th>
              <th scope="col" className="num">
                On time, {formatTime(TIGHT_CONFIG.deadline)}
              </th>
              <th scope="col" className="num">
                Arrived
              </th>
            </tr>
          </thead>
          <tbody>
            {PAIRED_POLICIES.map((policy) => (
              <tr key={policy}>
                <th scope="row">{POLICY_LABELS[policy]}</th>
                <td className="num">{row(recorded.normal, policy).onTime}</td>
                <td className="num">{row(recorded.tight, policy).onTime}</td>
                <td className="num">
                  {row(recorded.normal, policy).arrived} / {row(recorded.tight, policy).arrived}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Lookahead plans on the model, never on the sampled outcome. For each bookable flight it runs through the ten joint outcomes in
        that flight&apos;s pool and recurses to the end of the trip. Under the mixed profile the nonstop has a {pct(slackNonstop)} modelled
        chance of arriving by {formatTime(DEFAULT_CONFIG.deadline)} and {pct(tightNonstop)} by {formatTime(TIGHT_CONFIG.deadline)}; the
        Denver connection has {pct(slackViaDenver)} and {pct(tightViaDenver)}. These are probabilities under this fixture, not forecasts.
        More lookahead is not a general win; it is a different trade, and the reward decides when the trade is worth taking.
      </p>
      <p>
        Greedy next arrival never reaches JFK. It takes the earliest landing, F1 to Chicago, where this network has no onward flight:{' '}
        {tight.greedy.reasons.no_candidates} worlds strand there and {tight.greedy.reasons.cancelled} are cancelled first. That is a
        counterexample to the rule, not evidence about real connections, and it is why the recorded run keeps every terminal reason rather
        than a mean reward.
      </p>

      <h2 id="environment">{SECTIONS.environment}</h2>
      <p>
        <strong>State and actions.</strong> The state is the passenger&apos;s airport, clock and attempts so far. The actions are the
        flights leaving that airport at least the connection buffer after the clock and before the horizon, in a fixed order, padded to
        eight slots with a binary mask, so a policy can never pick a flight that has already left.
      </p>
      <p>
        <strong>Joint outcomes.</strong> Taking a flight reveals one whole outcome row: departure delay, arrival delay, cancellation and
        diversion together, never sampled field by field, so the simulator cannot invent a cancellation plus an unrelated delay. A
        cancellation keeps the passenger at the origin. An unresolved diversion ends the trip without moving them to an airport they never
        confirmed. After a landing, the next action set is built from the actual landing time, not the scheduled one.
      </p>
      <p>
        <strong>Paired worlds.</strong> The outcome row is picked by hashing the world&apos;s seed with the flight, so a flight has the
        same outcome in a world whichever policy reaches it and whenever. Comparing policies on shared worlds takes sampling noise out of
        the comparison, and it makes a rewind in the replay a true counterfactual: the other branch of the same day.
      </p>
      <p>
        <strong>Terminal reasons.</strong> Arrived, cancelled, diverted, no onward flight, out of attempts and out of time are kept
        apart. A stranded passenger and a cancelled one both score zero; the run still tells them apart.
      </p>

      <h2 id="origin">{SECTIONS.origin}</h2>
      <p>
        This page is a small, self-contained rebuild of part of{' '}
        <a href={GATEBOUND.url} target="_blank" rel="noopener noreferrer">
          Gatebound
        </a>
        , the routing and verification system I built in Python. Gatebound ingests monthly US flight-performance archives into
        partitioned Parquet, builds comparable-flight outcome pools, runs masked Gymnasium environments with a deadline planner and a
        masked REINFORCE learner, and checks every episode record against its configured schedules and outcome rows, so a forged but
        plausible record cannot earn reward.
      </p>
      <p>
        Its 2020–2024 pipeline run covered all 60 months: 33,173,483 raw rows, 2,651,910 kept within a 12-hub scope. In its historical
        simulator, six fixed 2025 requests at an eight-hour deadline, the deadline planner tied nonstop-first on five; on Newark to Salt
        Lake City it made 10 of 100 deadline arrivals against none, while eventual arrivals fell from 100 to 90. The trade on this page,
        on real schedules. Those figures are results from the original evaluation run; the public repo is a cleaned release without
        those run artifacts.
      </p>

      <h2 id="limits">{SECTIONS.limits}</h2>
      <p>
        Six invented flights, ten joint outcome rows a flight and two mirrored networks. Chicago is a deliberate dead end, and the return
        route mirrors the outbound one rather than pretending to be a second dataset. The clear and stress profiles are controlled edits,
        not weather models, and times are minutes from midnight, not local clocks.
      </p>
      <p>
        Left out next to Gatebound: prebooked itineraries, rebooking after a cancellation, fares, carriers, time zones, historical pool
        fitting, record authentication and the learned policies. Nothing here is a passenger-benefit estimate or a training result. The
        outcome hash is FNV-1a with an avalanche step, not Gatebound&apos;s cryptographic generator, so seeds do not carry across; and
        the outcomes ship with the page, so hiding them in the interface is not a security boundary.
      </p>

      <h2 id="reproduce">{SECTIONS.reproduce}</h2>
      <p>
        The engine, fixtures and reference cases are in the{' '}
        <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
          demo source
        </a>
        . {referenceCases.length} reference cases pin terminal paths (on time, late, cancelled, diverted, stranded, out of attempts, out
        of time, an invalid action) to exact clocks and rewards, and a test recomputes the {EXPERIMENT_WORLDS}-world run and compares it
        with the committed JSON. From the site&apos;s Next.js app:
      </p>
      <pre>
        <code>npx vitest run src/lib/projects/flight-routing</code>
      </pre>
      <p>
        Export in the replay writes the trip with its configuration, fixture version, outcome rows, reward terms and the{' '}
        {EXPERIMENT_WORLDS}-world comparison, so a run can be checked outside the page.
      </p>
    </ProjectPage>
  );
}
