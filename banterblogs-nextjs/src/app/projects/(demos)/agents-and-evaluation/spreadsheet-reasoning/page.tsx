import { ProjectPage, type ProjectFinding, type ProjectSection } from '@/components/projects/ProjectPage';
import { SheetDemo } from '@/components/projects/spreadsheet-reasoning/SheetDemo';
import { analyze, compareGold, freshSession, MAX_TRACE_BYTES, prune } from '@/lib/projects/spreadsheet-reasoning/engine';
import { MAX_CELLS, MAX_RANGE_CELLS, type Session } from '@/lib/projects/spreadsheet-reasoning/types';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, FORMULOOM] = PROJECT.links;

const SECTIONS = {
  question: 'When is a spreadsheet value final?',
  results: 'What the rules get right and wrong',
  method: 'How a cell is labelled',
  origin: 'Where this comes from',
  limits: 'What this fixture is not',
  reproduce: 'Reproduce it',
} as const;
const sections: ProjectSection[] = Object.entries(SECTIONS).map(([id, title]) => ({ id, title }));

// every number about the fixture is computed from the engine at render
const SCRATCH = 'Report!B4';
const CHECKPOINT = 'Calc!B4';
const scored = (session: Session) => {
  const result = analyze(session);
  return { result, score: compareGold(session, result)! };
};
const balanced = scored({ ...freshSession(), policy: 'balanced' });
const precision = scored({ ...freshSession(), policy: 'precision' });
const reviewed = scored(prune({ ...freshSession(), policy: 'balanced' }, SCRATCH, 'drop'));
const cells = Object.keys(balanced.result.cells).length;
const rules = balanced.result.cells[CHECKPOINT].votes.length;
const finals = balanced.score.tp + balanced.score.fn;
const checkpoint = balanced.result.cells[CHECKPOINT];
const pct = (x: number | null) => (x === null ? 'undefined' : `${Math.round(x * 100)}%`);

const FINDINGS: ProjectFinding[] = [
  { value: pct(precision.score.precision), label: 'precision for the policy built to be precise: it sends both true finals to review and still keeps the scratch cell.' },
  { value: `${balanced.score.fp}`, label: `false final under balanced votes: a scratch formula nothing uses, final only because it is a dependency sink.` },
  { value: pct(reviewed.score.f1), label: 'F1 after a prune-only review drops that one cell. Review can remove a final; it cannot add one.' },
];

export default function SpreadsheetReasoningPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<SheetDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{SECTIONS.question}</h2>
      <p>
        A cell can be numerically right and still the wrong thing to report. A margin subtotal can be a real result for its section and
        also feed a later calculation; a scratch formula can have no consumers at all and mean nothing. So the problem is not evaluating
        formulas, it is recovering the scope in which a value is final, and a dependency graph is evidence for that, not the definition.
      </p>

      <h2 id="results">{SECTIONS.results}</h2>
      <p>
        The fixture is {cells} cells across an inputs sheet and two output sheets, with {finals} values final in its key. Balanced votes
        find both and mark one extra: the scratch estimate <code>{SCRATCH}</code>, final only because nothing consumes it. Precision{' '}
        {pct(balanced.score.precision)}, recall {pct(balanced.score.recall)}.
      </p>
      <p>
        The precision gate requires a final to have no negative vote. That sounds stricter, and on this workbook it is worse: the margin
        checkpoint <code>{CHECKPOINT}</code> is consumed downstream, which draws one negative vote, so the gate sends it to review along
        with the report total, while the scratch cell, with no negative vote at all, stays final. Precision {pct(precision.score.precision)}.
        Rules that agree are not calibrated, and a gate named for a metric does not deliver it.
      </p>
      <p>
        A prune-only review that drops the scratch cell takes the balanced policy to precision {pct(reviewed.score.precision)} and F1{' '}
        {pct(reviewed.score.f1)}. That is a reviewer with the key in view, not a model improvement.
      </p>

      <h2 id="method">{SECTIONS.method}</h2>
      <p>
        <strong>A bounded formula grammar.</strong> Formulas parse into an expression tree; nothing typed is executed as code. Numbers,
        A1 and absolute references, simple cross-sheet references, arithmetic and <code>SUM</code> over ranges of up to{' '}
        {MAX_RANGE_CELLS} cells. A depth-first evaluation finds cycles; a cycle, a missing reference or a division by zero is an explicit
        error that blocks its dependents, never a silent zero.
      </p>
      <p>
        <strong>Abstaining rules.</strong> {rules} labelling functions vote final, intermediate or abstain: dependency sink, range
        aggregation, output wording, numeric input, pass-through formula, consumed upstream, and backed emphasis. For the checkpoint the
        evidence is {checkpoint.votes.filter((v) => v.vote === 'final').length} final votes against{' '}
        {checkpoint.votes.filter((v) => v.vote === 'intermediate').length}. Balanced votes take a strict majority and send a tie to
        review; the precision gate adds the no-negative-vote rule; a support sheet routes its cells to intermediate.
      </p>
      <p>
        <strong>Prune-only review.</strong> A reviewer can keep or drop a proposed final and nothing else, so review can never introduce a
        final the rules did not propose or rescue one they missed. The illustrative ballots beside each cell are authored, not model
        output, and disappear as soon as the workbook changes.
      </p>

      <h2 id="origin">{SECTIONS.origin}</h2>
      <p>
        This page is a reduced rebuild of{' '}
        <a href={FORMULOOM.url} target="_blank" rel="noopener noreferrer">
          Formuloom
        </a>
        , the workbook classification pipeline I built in Python. It extracts formulas and cached values from paired workbook snapshots,
        builds cross-sheet dependency features, compresses repeated rows into formula patterns, and classifies changed cells with rules,
        repeated model votes, a weak-supervision label model and a structural router over precision- and recall-oriented variants, with a
        prune-only judge as the second pass.
      </p>
      <p>
        Its development evaluation, five task bundles and 24 sheets, recorded precision 0.970, recall 0.920 and micro F1 0.945 for the
        structural router (1,543 true positives, 47 false positives, 134 false negatives), with a sheet-clustered bootstrap F1 interval of
        0.876 to 0.982 over 1,000 resamples. Those figures are results from the original evaluation run; the public repo is a cleaned
        release without those run artifacts. They describe that development corpus, not new workbooks.
      </p>
      <p>
        The lesson this page keeps: repeated votes suppress unstable decisions, but consensus can reinforce a wrong convention for what
        final means, and a global prune can remove legitimate outputs. Applying review only where the sheet structure called for it worked
        better than applying it everywhere.
      </p>

      <h2 id="limits">{SECTIONS.limits}</h2>
      <p>
        Up to {MAX_CELLS} cells and restricted arithmetic: not an Excel engine. No named ranges, dynamic arrays, dates, text, external
        workbooks or Excel coercion. The key fits one authored workbook; editing a formula, a label or a sheet role may change what is
        final, so an edited run keeps its computation and drops the comparison rather than scoring against a key that no longer applies.
        There is no model, no workbook ingestion and no trained label model here.
      </p>

      <h2 id="reproduce">{SECTIONS.reproduce}</h2>
      <p>
        The parser, engine, rules and fixtures are in the{' '}
        <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
          demo source
        </a>
        . The tests cover arithmetic and precedence, references, ranges, cycles, invalid sessions, the counterexamples above, prune-only
        membership and replay; an export is a compact session of at most {MAX_TRACE_BYTES / 1000} KB, and replay recomputes every value
        and label instead of trusting the file. From the site&apos;s Next.js app:
      </p>
      <pre>
        <code>npx vitest run src/lib/projects/spreadsheet-reasoning</code>
      </pre>
    </ProjectPage>
  );
}
