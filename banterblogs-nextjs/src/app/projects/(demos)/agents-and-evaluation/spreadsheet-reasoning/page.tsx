import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
import { SheetDemo } from '@/components/projects/spreadsheet-reasoning/SheetDemo';
import { analyze, compareGold, freshSession, MAX_TRACE_BYTES, prune } from '@/lib/projects/spreadsheet-reasoning/engine';
import { MAX_CELLS, MAX_RANGE_CELLS, type Session } from '@/lib/projects/spreadsheet-reasoning/types';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, FORMULOOM] = PROJECT.links;

const PLAIN = {
  question: 'When is a spreadsheet value final?',
  results: 'What the rules get right and wrong',
  origin: 'Where this comes from',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  method: 'How a cell is labelled',
  formuloom: 'Formuloom, in detail',
  'limits-detail': 'Its limits in detail',
  reproduce: 'Reproduce it',
} as const;
const sections = projectSections(PLAIN, ENGINEERS);

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
const ruleNames = balanced.result.cells[CHECKPOINT].votes.map((v) => v.method);
const finals = balanced.score.tp + balanced.score.fn;
const checkpoint = balanced.result.cells[CHECKPOINT];
const pct = (x: number | null) => (x === null ? 'undefined' : `${Math.round(x * 100)}%`);

// Formuloom's structural router on its development corpus, as recorded in the original evaluation run
const FORMULOOM_RUN = { precision: '0.970', recall: '0.920', f1: '0.945', sheets: 24 };
// said once, on the card where these figures first appear; later mentions point back to it
const PROVENANCE = 'results from the original evaluation run; the public repo is a cleaned release without those run artifacts';

const FINDINGS: ProjectFinding[] = [
  {
    value: `${FORMULOOM_RUN.precision} / ${FORMULOOM_RUN.recall}`,
    label: `precision and recall of Formuloom itself on its ${FORMULOOM_RUN.sheets}-sheet development corpus: of the cells it marked final, 97% were, and it found 92% of the real ones. These are ${PROVENANCE}. The two cards beside it are this rebuild's counterexamples.`,
  },
  {
    value: `${balanced.score.fp}`,
    label: `false final in this rebuild's workbook under balanced votes, Formuloom's own majority rule: a scratch formula no other cell uses, final only because it is a dependency sink, a cell nothing depends on.`,
  },
  {
    value: pct(precision.score.precision),
    label: `precision of the precision gate, a stricter policy this page adds, on the same workbook: it sends both real finals to review and still keeps the scratch cell final.`,
  },
];

export default function SpreadsheetReasoningPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<SheetDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        A cell can be numerically right and still the wrong thing to report. A margin subtotal can be a real result for its section and
        also feed a later calculation; a scratch formula can have no consumers at all and mean nothing. So the problem is not evaluating
        formulas, it is recovering the scope in which a value is final. A dependency graph, the map of which cells feed which, is evidence
        for that, not the definition.
      </p>

      <h2 id="results">{PLAIN.results}</h2>
      <p>
        The workbook here is {cells} cells across an inputs sheet and two output sheets, with {finals} values final in its answer key.
        Balanced votes, which call a cell final when more rules vote final than intermediate (abstentions do not count), find both and
        mark one extra: the scratch estimate <code>{SCRATCH}</code>,
        final only because nothing uses it. Precision, the share of marked finals that are right, is {pct(balanced.score.precision)};
        recall, the share of real finals found, {pct(balanced.score.recall)}.
      </p>
      <p>
        Balanced votes are Formuloom&apos;s own rule. The precision gate is not: Formuloom has no such vote rule, and this page adds it as a
        stricter alternative. It requires a final to have no negative vote. That sounds stricter, and on this workbook it is worse: the margin
        checkpoint <code>{CHECKPOINT}</code> is used by a later cell, which draws one negative vote, so the gate sends it to review along
        with the report total, while the scratch cell, with no negative vote at all, stays final. Precision {pct(precision.score.precision)}.
        Rules that agree are not calibrated, and a gate named for a metric does not deliver it.
      </p>
      <p>
        A prune-only review, a second pass that can remove a final but never add one, takes the balanced policy to precision{' '}
        {pct(reviewed.score.precision)} and F1 {pct(reviewed.score.f1)} by dropping the scratch cell. That is a reviewer with the key in
        view, not a model improvement.
      </p>

      <h2 id="origin">{PLAIN.origin}</h2>
      <p>
        This page is a reduced rebuild of{' '}
        <a href={FORMULOOM.url} target="_blank" rel="noopener noreferrer">
          Formuloom
        </a>
        , the workbook classification pipeline I built in Python: given two versions of a workbook, it sorts the changed cells into final
        outputs and intermediates. On its development corpus of {FORMULOOM_RUN.sheets} sheets it recorded precision{' '}
        {FORMULOOM_RUN.precision} and recall {FORMULOOM_RUN.recall}, the original run&apos;s figures in the first card above.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        One small authored workbook and its key, with restricted arithmetic: not an Excel engine, and no model runs here. The rules are
        Formuloom&apos;s approach, rebuilt, not its Python pipeline.
      </p>

      <ForEngineers lede="The formula grammar, the rules and policies, Formuloom's full pipeline and evaluation, the limits in full, and how to rerun it.">
        <h3 id="method">{ENGINEERS.method}</h3>
        <p>
          <strong>A bounded formula grammar.</strong> Formulas parse into an expression tree; nothing typed is executed as code. Numbers,
          A1 and absolute references, simple cross-sheet references, arithmetic and <code>SUM</code> over ranges of up to{' '}
          {MAX_RANGE_CELLS} cells. A depth-first evaluation finds cycles; a cycle, a missing reference or a division by zero is an explicit
          error that blocks its dependents, never a silent zero.
        </p>
        <p>
          <strong>Abstaining rules.</strong> {rules} labelling functions vote final, intermediate or abstain: {ruleNames.join(', ')}. For the
          checkpoint the evidence is {checkpoint.votes.filter((v) => v.vote === 'final').length} final votes against{' '}
          {checkpoint.votes.filter((v) => v.vote === 'intermediate').length}. Balanced votes need more final than intermediate votes,
          abstentions ignored, and send a tie to review; the precision gate also sends to review any final with a vote against; a support
          sheet routes its cells to intermediate.
        </p>
        <p>
          <strong>Which policy is Formuloom&apos;s.</strong> Balanced votes follow Formuloom&apos;s <code>majority_vote_label</code>{' '}
          (labelmodel.py), which marks a cell final when its final votes outnumber its intermediate votes; Formuloom labels a tie
          intermediate, where this page sends it to review. The precision gate has no counterpart in its code: Formuloom&apos;s V11
          precision guards (cli.py) work on whole sheets, dropping every proposed final on a large granular or dense source sheet, not on
          one cell&apos;s votes.
        </p>
        <p>
          <strong>Prune-only review.</strong> A reviewer can keep or drop a proposed final and nothing else, so review can never introduce a
          final the rules did not propose or rescue one they missed. The illustrative ballots under the hood are authored, not model output,
          and disappear as soon as the workbook changes.
        </p>

        <h3 id="formuloom">{ENGINEERS.formuloom}</h3>
        <p>
          Formuloom extracts formulas and cached values from paired workbook snapshots, builds cross-sheet dependency features, compresses
          repeated rows into formula patterns, and classifies changed cells with rules, repeated model votes, a weak-supervision label model
          and a structural router over precision- and recall-oriented variants, with a prune-only judge as the second pass.
        </p>
        <p>
          Its development evaluation, five task bundles and {FORMULOOM_RUN.sheets} sheets, recorded precision {FORMULOOM_RUN.precision},
          recall {FORMULOOM_RUN.recall} and micro F1 {FORMULOOM_RUN.f1} for the structural router (1,543 true positives, 47 false
          positives, 134 false negatives), with a sheet-clustered bootstrap F1 interval of 0.876 to 0.982 over 1,000 resamples. Like the
          card above, these come from the original run, and they describe that development corpus, not new workbooks.
        </p>
        <p>
          The lesson this page keeps: repeated votes suppress unstable decisions, but consensus can reinforce a wrong convention for what
          final means, and a global prune can remove legitimate outputs. Applying review only where the sheet structure called for it worked
          better than applying it everywhere.
        </p>

        <h3 id="limits-detail">{ENGINEERS['limits-detail']}</h3>
        <p>
          Up to {MAX_CELLS} cells and restricted arithmetic: not an Excel engine. No named ranges, dynamic arrays, dates, text, external
          workbooks or Excel coercion. The key fits one authored workbook; editing a formula, a label or a sheet role may change what is
          final, so an edited run keeps its computation and drops the comparison rather than scoring against a key that no longer applies.
          There is no model, no workbook ingestion and no trained label model here.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          The parser, engine, rules and fixtures are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          . The tests cover arithmetic and precedence, references, ranges, cycles, invalid sessions, the counterexamples above, prune-only
          membership and replay; an export is a compact session of at most {MAX_TRACE_BYTES / 1000} KB, and replay recomputes every value
          and label instead of trusting the file. From the site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/spreadsheet-reasoning</code>
        </pre>
      </ForEngineers>
    </ProjectPage>
  );
}
