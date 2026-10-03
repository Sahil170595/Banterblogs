import { TriageDemo } from '@/components/projects/intake-triage/TriageDemo';
import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
import { FIXTURES } from '@/lib/projects/intake-triage/fixtures';
import { analyzeInfluence, OPERATIONAL_IDS } from '@/lib/projects/intake-triage/influence';
import { MAX_RECEIPT_BYTES } from '@/lib/projects/intake-triage/receipt';
import { COMPLAINT_WEIGHT, FYI_WEIGHT, P1_AT, P3_AT, SAME_DAY_WEIGHT, scoreUrgency, signed, SPAM_WEIGHT } from '@/lib/projects/intake-triage/score';
import { URGENCIES } from '@/lib/projects/intake-triage/signals';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, INTAKEGATE] = PROJECT.links;
const sourceFile = (path: string) => `${INTAKEGATE.url.replace('/tree/', '/blob/')}/${path}`;

const PLAIN = {
  question: 'What may move a priority?',
  influence: 'What each signal can change',
  origin: 'Where this comes from',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  scorer: 'How the scorer decides',
  port: 'A port, checked against the source',
  pipeline: 'The pipeline, in detail',
  'limits-detail': 'Its limits in detail',
  reproduce: 'Reproduce it',
} as const;
const sections = projectSections(PLAIN, ENGINEERS);

// every number in the write-up is computed from the engine at render
const REPORT = analyzeInfluence();
const by = Object.fromEntries(REPORT.influences.map((i) => [i.signal.id, i]));
const count = (n: number) => n.toLocaleString('en-US');
const operationalUnderGate = OPERATIONAL_IDS.reduce((n, id) => n + by[id].decisiveUnderGate, 0);
const operationalRegion = REPORT.combinations - REPORT.gated;
const scored = FIXTURES.map((f) => ({ ...f, port: scoreUrgency(f.signals) }));
const agree = scored.filter((f) => f.port.urgency === f.source.urgency && f.port.classification === f.source.classification).length;
const cohort = URGENCIES.map((u) => `${scored.filter((f) => f.port.urgency === u).length} ${u}`).join(', ');

const FINDINGS: ProjectFinding[] = [
  {
    value: `${count(by.urgent_words.decisive)} of ${count(REPORT.combinations)}`,
    label: 'signal combinations in which urgent wording, such as "URGENT!!!", changes the priority. Shouting is weighted zero, and every combination agrees.',
  },
  {
    value: `${count(operationalUnderGate)} of ${count(REPORT.gated)}`,
    label: 'combinations in which a safety gate fired and an operational signal still changed the priority: the safety gates decide before any points are added.',
  },
  {
    value: `${agree} of ${FIXTURES.length}`,
    label: `example messages from Intakegate get the same priority and classification here as from its own scorer: ${cohort}.`,
  },
];

export default function IntakeTriagePage() {
  return (
    <ProjectPage
      slug={PROJECT.slug}
      demo={<TriageDemo report={REPORT} />}
      findings={FINDINGS}
      checked={`Matches the original scorer on ${agree} of ${FIXTURES.length} example messages`}
      sections={sections}
    >
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        An intake inbox is triaged by reading messages, and reading is uncertain: a model can miss a concern, invent one, or be loud about
        the wrong thing. Intakegate keeps reading and deciding apart. Perception, a model or a keyless fallback, only reports signals: a
        proposed classification, a safety read, a time read, whether action is required. A pure scorer, a set of fixed rules with no model
        in it, turns those signals into a priority from P0, the most urgent, to P3, and every item still goes to a person.
      </p>
      <p>
        That separation is only worth having if the scorer&apos;s rules hold the line the design claims for them: safety before
        convenience, and volume never standing in for need. Rules can be tested where a model can only be sampled, so this page tests
        them exhaustively.
      </p>

      <h2 id="influence">{PLAIN.influence}</h2>
      <p>
        The scorer reads {REPORT.influences.length} signals to set a priority. Taken together they have {count(REPORT.combinations)}{' '}
        combinations, and every one is scored. For each signal, the table counts the combinations in which changing that signal alone, to
        any other value, changes the priority.
      </p>
      <p>
        Urgent wording changes it in {count(by.urgent_words.decisive)}: shouting is weighted zero, and no combination finds a way around
        that. In {count(REPORT.gated)} combinations a safety gate, a rule that sets the priority before any points are added, fires, and
        there the seven operational signals change the priority in {count(operationalUnderGate)}. That much holds by design; the count
        confirms the rules do what the design says. Of the {count(operationalRegion)} combinations that reach the operational score, the
        for-information nudge, {signed(FYI_WEIGHT)}, decides only {count(by.fyi_only.decisive)}. On its own it moves a message from 0 to{' '}
        {signed(FYI_WEIGHT)}, which is still P2. It only matters next to another nudge.
      </p>
      <p>
        Two signals can say the same thing. Same-day wording found by the lexicon, a fixed word list, and a same-day time read from
        perception feed one nudge, so on a same-day reschedule neither alone decides: switch one off and the other still carries it. The
        scorer below opens on that message, and each option shows what choosing it would change. The counts describe what the rules can
        do, not how often it happens; real messages are not spread evenly over these combinations.
      </p>

      <h2 id="origin">{PLAIN.origin}</h2>
      <p>
        <a href={INTAKEGATE.url} target="_blank" rel="noopener noreferrer">
          Intakegate
        </a>{' '}
        is a triage pipeline I built in TypeScript for synthetic intake messages to a children&apos;s speech, occupational and physical
        therapy service. It reads each message, scores it, and drafts the follow-up work for a person to review, without sending anything.
        This page is its scorer, ported rule for rule and checked against the source&apos;s own example messages.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        Not clinical software and not clinical guidance: the messages are invented, a priority is a review proposal, and every item goes to
        a person. This page is the scorer only; it does not read message text.
      </p>

      <ForEngineers lede="The scorer's rules and weights, the check of the port against the source, the rest of the pipeline, the limits in full, and how to rerun it.">
        <h3 id="scorer">{ENGINEERS.scorer}</h3>
        <p>
          <strong>Two gates, then a sum.</strong> If the lexical safety backstop matches, or perception reads a possible or clear safety
          concern about caregiving, the item is P0, classified safeguarding and escalated for same-hour review; nothing is summed. A safety
          concern that is not about caregiving makes it P1, with no escalation. Only otherwise does the operational score run, from zero:
          same-day with a required action {signed(SAME_DAY_WEIGHT)}, a complaint with a time element {signed(COMPLAINT_WEIGHT)}, for
          information with no action {signed(FYI_WEIGHT)}, spam {signed(SPAM_WEIGHT)}, urgent wording 0. A score of {signed(P1_AT)} or
          more is P1, {signed(P3_AT)} or less P3, anything between P2.
        </p>
        <p>
          <strong>Structure overrides the proposal.</strong> The classification starts from perception&apos;s proposal. Spam wins first; a
          proposed scheduling, clinical question, missing paperwork or safeguarding class stands; a known patient becomes an
          existing-patient request; a referral missing a child&apos;s name, date of birth, parent contact, payer or member ID becomes
          missing paperwork. The order matters: a known patient is recognized before missing references are checked.
        </p>

        <h3 id="port">{ENGINEERS.port}</h3>
        <p>
          The rules, weights and thresholds are Intakegate&apos;s{' '}
          <a href={sourceFile('src/triage/score.ts')} target="_blank" rel="noopener noreferrer">
            score.ts
          </a>
          , unchanged. The port runs the source&apos;s own scorer tests, and the {FIXTURES.length} fixture messages, as signal bundles from
          the source&apos;s keyless perception, score as the source scored them: {cohort}.
        </p>

        <h3 id="pipeline">{ENGINEERS.pipeline}</h3>
        <p>
          Intakegate runs five steps: perceive, score, orchestrate, assemble, validate. Perception always runs a lexicon. With a provider key
          and an explicit opt-in, it also asks a fast model for structured signals, and a stronger one when safety is flagged, confidence is
          low or the two readings conflict, each call on its own timeout. Orchestration then runs class-specific local queries and drafts:
          patient search, coverage lookup, policy notes, provider slots, tasks, unsent replies. Every action tool is a stub that records what
          it would have done; the agent never holds a slot.
        </p>
        <p>
          The source is candid about where the design stops. The lexical backstop favors review over silence, so a negated phrase such as
          &ldquo;no abuse&rdquo; still fires P0. A strong model can overrule a fast model&apos;s safety read when the lexicon is silent, so
          the cascade is not a monotonic safety guarantee. Coverage that is not on file can still surface appointment suggestions. The
          source publishes no accuracy, recall or latency figures, and this page cites none.
        </p>

        <h3 id="limits-detail">{ENGINEERS['limits-detail']}</h3>
        <p>
          This page is the scorer only. It does not read message text, so it cannot show perception being wrong; it shows what follows from
          whatever perception reports. Orchestration, drafting and validation are in the source, not here. The known-patient signal stands
          in for the source&apos;s literal match of two fictional patients. An exported file is checked for consistency, not authenticity:
          anyone can write signals that score the way the file says.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          Load an example from the table and read the marked signal&apos;s options; pick an example message and compare it with what the
          source decided; open the referral references to send a referral to missing paperwork. Under the hood, export a file, edit its
          decision, and import it: the file is refused. Files are limited to {MAX_RECEIPT_BYTES / 1000} KB. The port, the influence count,
          the fixtures and their tests are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          . From the site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/intake-triage src/components/projects/intake-triage</code>
        </pre>
      </ForEngineers>
    </ProjectPage>
  );
}
