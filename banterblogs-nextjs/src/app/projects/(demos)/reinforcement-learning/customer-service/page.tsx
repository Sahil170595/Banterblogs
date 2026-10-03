import { money, signedScore } from '@/components/projects/customer-service/format';
import { ServiceDemo } from '@/components/projects/customer-service/ServiceDemo';
import { ProjectPage, type ProjectFinding, type ProjectSection } from '@/components/projects/ProjectPage';
import { measureControls } from '@/lib/projects/customer-service/measurements';
import { DEFAULT_TOTAL_CENTS, MAX_EVENTS, REPEAT_LIMIT, TOOL_LABELS, WEIGHTS_VERSION } from '@/lib/projects/customer-service/model';
import { RUBRIC } from '@/lib/projects/customer-service/reward';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, TURNCRAFT] = PROJECT.links;

const SECTIONS = {
  question: 'When is a service task resolved?',
  controls: 'What the controls show',
  environment: 'How the environment decides',
  origin: 'Where this comes from',
  limits: 'What this fixture is not',
  reproduce: 'Reproduce it',
} as const;
const sections: ProjectSection[] = Object.entries(SECTIONS).map(([id, title]) => ({ id, title }));

// every number in the write-up is computed from the engine at render
const controls = Object.fromEntries(measureControls().map((c) => [c.id, c]));
const right = controls['duplicate:verified'];
const wrong = controls['duplicate:wrong-capture'];
const over = controls['duplicate:over-refund'];
const replaced = controls['damage:verified'];
const both = controls['damage:double-remedy'];
const claimOnly = controls['damage:claim-only'];
const alert = controls['damage:verified:no-stock'];
const intercept = controls['transit:verified'];
const restraint = controls['split:verified'];
const TOOLS = Object.keys(TOOL_LABELS).length;
const pct = (weight: number) => `${Math.round(weight * 100)}%`;

const FINDINGS: ProjectFinding[] = [
  {
    value: money(right.refundedCents),
    label: `refunded in both duplicate-charge trajectories. The second capture scores ${signedScore(right.score)}, the first ${signedScore(wrong.score)}.`,
  },
  { value: signedScore(both.score), label: 'for replacing the lamp and also refunding it: every step was allowed, together they fit no outcome.' },
  { value: signedScore(claimOnly.score), label: 'for reporting a refund without issuing one. A sentence is never a refund row.' },
];

export default function CustomerServicePage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<ServiceDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{SECTIONS.question}</h2>
      <p>
        A support agent can say all the right things while changing the wrong record. It can refund the first of two charges instead of
        the duplicate, promise a replacement with no stock, or describe a carrier request as a cancellation. Even a correct-looking
        database can be wrong: reached by giving both a refund and a replacement, or by acting before the customer chose.
      </p>
      <p>
        So the environment scores the world, not the transcript. Each tool checks its arguments, the signed-in identity and the
        customer&apos;s recorded choice, then either commits one effect or changes nothing. The reward reads the final world, the order of
        evidence before each write, the scope of the choice that authorized it, and whether the agent&apos;s report matches what happened.
      </p>

      <h2 id="controls">{SECTIONS.controls}</h2>
      <p>
        Every row on the board is a scripted trajectory from a fresh synthetic fixture with a {money(DEFAULT_TOTAL_CENTS)} order. The two
        duplicate-charge trajectories move the same {money(right.refundedCents)} out of the same account. Refunding the second capture
        completes the case and scores {signedScore(right.score)}. Refunding the first, a legitimate charge, completes nothing and scores{' '}
        {signedScore(wrong.score)}: the money is right, the record is wrong. Asking for more than was captured is refused, and the success
        report that follows costs {signedScore(over.score)}.
      </p>
      <p>
        For the damaged lamp, returning and replacing it scores {signedScore(replaced.score)}. Replacing it and also refunding it scores{' '}
        {signedScore(both.score)}: each write was individually allowed, but no outcome accepts both, and credit is never added across
        alternatives. Partial remedies stay partial: a carrier intercept request scores {signedScore(intercept.score)} because the parcel is
        still moving, a stock alert {signedScore(alert.score)} because nothing was delivered. And restraint has to be earned: on two
        legitimate half-payments, changing nothing scores {signedScore(restraint.score)} only after reading the order and payments and
        reporting what was found.
      </p>

      <h2 id="environment">{SECTIONS.environment}</h2>
      <p>
        <strong>Identity and ownership.</strong> The identity is fixed when the episode starts; no tool accepts an owner or an idempotency
        key from the caller. A foreign order and a missing order return the same public result, so the tools cannot be used to probe for
        other accounts.
      </p>
      <p>
        <strong>Consent and money.</strong> A write needs the latest customer choice to match it exactly: refunds bind the payment and
        the cents, replacements the finish. Refunds are bounded by captured funds less earlier refunds, and the refund&apos;s identity is
        derived from order, payment and amount, so an exact retry finds the existing refund instead of moving money twice.
      </p>
      <p>
        <strong>One coherent outcome.</strong> The evaluator tests each candidate outcome separately and keeps the best one that holds
        on its own: the world in that state, its writes inside it, its evidence read before each write, its report supported. Outcome
        carries {pct(RUBRIC.outcome)} of the reward, prior evidence {pct(RUBRIC.process)} and a supported report{' '}
        {pct(RUBRIC.communication)}. A report the world contradicts costs {RUBRIC.falseReportCost.toFixed(2)}. Then ceilings apply: an
        incomplete case cannot exceed {signedScore(RUBRIC.incompleteCeiling)}, a write without prior evidence{' '}
        {signedScore(RUBRIC.unverifiedCeiling)}, and effects outside every outcome are capped at {signedScore(RUBRIC.harmCeiling)}. The
        rubric is versioned as {WEIGHTS_VERSION}.
      </p>
      <p>
        <strong>Finite episodes.</strong> {REPEAT_LIMIT} identical observations without a change end the episode as no progress, and an
        episode stops at {MAX_EVENTS} actions. Export writes the configuration, the initial and final worlds, every action with its
        before-and-after state and the reward; import replays it from the same fixture and refuses a modified receipt.
      </p>

      <h2 id="origin">{SECTIONS.origin}</h2>
      <p>
        This page is a reduced rebuild of{' '}
        <a href={TURNCRAFT.url} target="_blank" rel="noopener noreferrer">
          Turncraft
        </a>
        , the customer-service environment I built in Python: nine identity-bound tools, a dialogue runner with an assistant and a
        generated customer kept in separate information views, a raw-text tool protocol with its own parser, and a deterministic
        evaluator over before-and-after state. Its offline sweep runs eight cases with oracle, null, near-miss and forbidden control
        trajectories, 34 in all, each against a fresh world.
      </p>
      <p>
        One of its design lessons shaped this page. An outcome made only of preserved-state checks, nothing refunded and nothing
        cancelled, describes the initial world, so it can reward doing nothing; Turncraft caps such outcomes at the null control&apos;s
        band. Here restraint needs positive evidence, which is why the split-payment case scores only after the reads and the report.
      </p>

      <h2 id="limits">{SECTIONS.limits}</h2>
      <p>
        A browser ledger is not a secure backend: anyone with developer tools can change their local state, so the identity boundary here
        shows dispatch semantics, not resistance to a hostile client. One item per order, immediate refunds, one shipped state and two
        finishes; no split shipments, provider failures, carrier outcomes or time windows. {TOOLS} tools rather than nine.
      </p>
      <p>
        Reports are typed claims from a fixed menu, not language: there is no assistant model, generated customer or prompt-injection test
        here, and the scripts are control trajectories, not a learned policy. The rubric is this page&apos;s own and is not on the same
        scale as Turncraft&apos;s.
      </p>

      <h2 id="reproduce">{SECTIONS.reproduce}</h2>
      <p>
        The engine, rubric, fixtures and scripts are in the{' '}
        <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
          demo source
        </a>
        . The tests cover atomic denial, ownership indistinguishability, refund bounds and retries, mutually exclusive outcomes,
        contradicted reports, termination and replay, and a sweep runs every verified script over stock and order totals. From the
        site&apos;s Next.js app:
      </p>
      <pre>
        <code>npx vitest run src/lib/projects/customer-service</code>
      </pre>
    </ProjectPage>
  );
}
