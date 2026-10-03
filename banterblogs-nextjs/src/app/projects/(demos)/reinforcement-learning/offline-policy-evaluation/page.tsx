import { OpeDemo } from '@/components/projects/offline-policy-evaluation/OpeDemo';
import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
import { ACTIONS, CONTEXTS, DEFAULT_CONFIG, evaluate, HORIZON, LOW_SUPPORT, RESAMPLES } from '@/lib/projects/offline-policy-evaluation/engine';
import { constantShare, signed } from '@/lib/projects/offline-policy-evaluation/verdict';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, COUNTERLEDGER] = PROJECT.links;

const PLAIN = {
  question: 'The questions an estimate has to survive',
  controls: 'What the checks show',
  original: 'The full study',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  estimators: 'Three estimators, three compromises',
  support: 'Support, and when to refuse',
  method: 'Counterledger’s method',
  leftout: 'What is left out',
  reproduce: 'Reproduce it',
} as const;
const sections = projectSections(PLAIN, ENGINEERS);

// every number in the write-up is computed from the engine at render
const PERCENT = 100;
const base = evaluate(DEFAULT_CONFIG);
const noGain = evaluate({ ...DEFAULT_CONFIG, gainWeight: 0 });
const broad = evaluate({ ...DEFAULT_CONFIG, scenario: 'balanced' });
const gap = evaluate({ ...DEFAULT_CONFIG, scenario: 'gap' });
const [target, constant] = base.comparisons;
const value = target.result.normalized!;
const logged = target.result.logged;
const paired = target.differences.normalized!;
const share = constantShare(base, 'normalized')!;
const noGainTarget = noGain.comparisons[0];
const broadTarget = broad.comparisons[0];
const broadPaired = broadTarget.differences.normalized!;
const gapDetail = gap.comparisons[0].result.supportCheck.gaps[0];
const finalEss = target.result.horizons[target.result.horizons.length - 1].rawEss;
const stateGap = value - constant.result.normalized!;
const stateInterval = base.stateDifferences.normalized!;
const pct = (share: number) => `${Math.round(share * PERCENT)}%`;
const interval = (range: [number, number]) => `${signed(range[0])} to ${signed(range[1])}`;
// the share as the rounded figures on the page would give it, which differs from the unrounded ratio
const shown = (x: number) => Number(x.toFixed(2));
const roundedShare = (shown(constant.result.normalized!) - shown(logged)) / shown(value - logged);

const FINDINGS: ProjectFinding[] = [
  {
    value: pct(share),
    label: `of the new policy’s (the target’s) apparent gain over the past decisions (the logger) also goes to a constant control that acts at the same rate but ignores the state. Most of the gain is how often to act, not when; the part that depends on the state is ${signed(stateGap)}, paired 95% interval ${interval(stateInterval)}. Default settings.`,
  },
  {
    value: interval(noGainTarget.differences.normalized!),
    label:
      'the paired 95% interval for the new policy minus the past decisions once the reward stops paying for gain: it crosses zero, and the improvement is gone.',
  },
  {
    value: `${finalEss.toFixed(0)} of ${DEFAULT_CONFIG.size}`,
    label: `logged trajectories, each one case’s run of ${HORIZON} decisions, that the estimate effectively uses at the last step (its effective sample size): ${pct(finalEss / DEFAULT_CONFIG.size)} of the data. Default settings.`,
  },
];

export default function OfflinePolicyEvaluationPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<OpeDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        Offline evaluation scores a new policy, the target, a rule for when to act, on decisions someone else made: the logging policy, or logger.
        Reweight each
        logged trajectory, one case&apos;s run of {HORIZON} decisions, by how much more or less likely the new policy was to take the logged actions,
        average the rewards, and a number comes out. That reweighting is importance sampling. The number comes out even when the logs barely cover
        what the new policy does and even when the reward pays for the wrong thing.
      </p>
      <p>
        So the number has to survive four checks before it means better. Is the gain larger than its uncertainty? Does a policy that ignores the
        state, here the load level, get the same gain? Does the ranking hold under a different reward? Is there logged evidence at all for what the
        new policy wants to do?
      </p>

      <h2 id="controls">{PLAIN.controls}</h2>
      <p>
        Under the default reward (gain minus {DEFAULT_CONFIG.harmWeight} × harm) and rarely logged intensification, the state-responsive target, the
        new policy, scores {signed(value)} against the logger&apos;s {signed(logged)}: a gain of {signed(value - logged)}, with a paired 95% interval
        from {interval(paired)} over {RESAMPLES} bootstrap resamples. That is the number a dashboard would report.
      </p>
      <p>
        The constant control intervenes at the same average rate but ignores load. It scores {signed(constant.result.normalized!)}, {pct(share)} of
        the target&apos;s gain. Most of the apparent improvement is a shift in how often to act, not in when. That {pct(share)} is a ratio of two
        point estimates, taken before rounding (from the rounded figures here it would read {pct(roundedShare)}), so it carries no interval of its
        own. The part of the target&apos;s value that depends on reading the state, target minus control on the same resamples, is{' '}
        {signed(stateGap)}, paired 95% interval {interval(stateInterval)}: real on this data, and small.
      </p>
      <p>
        Drop the gain term from the reward and the target falls to {signed(noGainTarget.result.normalized!)} against{' '}
        {signed(noGainTarget.result.logged)}, an interval that crosses zero. Give the logger broad support for intensifying and two things change,
        because that setting changes the past decisions themselves: the logger becomes a different, stronger policy, its return rising from{' '}
        {signed(logged)} to {signed(broadTarget.result.logged)}, and the target, blended {pct(DEFAULT_CONFIG.anchor)} toward the logger, moves from{' '}
        {signed(value)} to {signed(broadTarget.result.normalized!)}. Against that logger the target loses outright: {interval(broadPaired)}.
      </p>
      <p>
        Every one of those is the same estimator on the same kind of data. The demo&apos;s controls switch between them, and the verdict above the
        plot is computed from the paired interval each time rather than written in advance.
      </p>

      <h2 id="original">{PLAIN.original}</h2>
      <p>
        This page is a small rebuild of the questions behind{' '}
        <a href={COUNTERLEDGER.url} target="_blank" rel="noopener noreferrer">
          Counterledger
        </a>
        , the offline policy evaluator I built in Python. Its own study, 3,000 twelve-step trajectories, ended where these checks point: the leading
        estimate did not survive them, and no state-dependent value was shown. The result was a reproducible evaluation system and a negative finding.
        Those figures are results from the original evaluation run; the public repo is a cleaned release without those run artifacts.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        Made-up load states and abstract actions ({ACTIONS.join(', ')}), with logging probabilities known by construction. Nothing here is evidence
        about any real decision or its effects.
      </p>

      <ForEngineers lede="The estimators and their formulas, the support check that refuses to estimate, Counterledger's method, what this rebuild leaves out, and how to reproduce the run.">
        <h3 id="estimators">{ENGINEERS.estimators}</h3>
        <pre>
          <code>
            {`w(i,t) = Π[k≤t] π(a | s) / b(a | s)        cumulative ratio
c(i,t) = min(cap, w(i,t))
Raw IS        = Σ γ^t · mean(w · r)
Capped IS     = Σ γ^t · mean(c · r)
Self-norm. IS = Σ γ^t · Σ(c · r) / Σ c
ESS(t)        = (Σ w)² / Σ w²`}
          </code>
        </pre>
        <p>
          π is the target, b the logger, w a trajectory&apos;s importance weight and γ the discount. The cap applies to the cumulative trajectory
          ratio at each step, never to each one-step ratio, which would let the bound grow as the cap to the horizon. Capping trades variance for
          bias. Self-normalizing keeps the estimate inside the range of possible returns but is biased in finite samples too. The effective sample
          size says how many trajectories the weights really use: under the default target it falls from {target.result.horizons[0].rawEss.toFixed(0)}{' '}
          at the first step to {finalEss.toFixed(0)} at the last, out of {DEFAULT_CONFIG.size}.
        </p>
        <p>
          Intervals come from {RESAMPLES} bootstrap draws of whole trajectories, shared by every policy, so a difference interval is a paired
          contrast, not two intervals subtracted. Normalizing denominators are recomputed in each draw. If any draw has a zero denominator, the
          interval is withheld rather than quietly narrowed.
        </p>

        <h3 id="support">{ENGINEERS.support}</h3>
        <p>
          Importance weighting needs the logger to have taken, at least sometimes, every action the target takes. When it never did, no reweighting
          recovers the outcome. With no logged intensification at low load, the target still puts {pct(gapDetail.targetProbability)} on{' '}
          {ACTIONS[gapDetail.action]} at {CONTEXTS[gapDetail.context].toLowerCase()}, so the evaluator reports nothing for it: no value, no interval,
          no comparison. Capping cannot create evidence that was never logged.
        </p>
        <p>
          The check runs against every state the generator can reach, not only the states a sample happened to contain, so a small sample that misses
          low load still refuses. Thin support, logged under {pct(LOW_SUPPORT)}, is shown in the support table without blocking: it is a warning about
          variance, not a missing outcome.
        </p>

        <h3 id="method">{ENGINEERS.method}</h3>
        <p>
          Counterledger fits backward finite-horizon Q functions with gradient boosting, adds a sequential doubly robust correction with capped
          cumulative ratios, separates subject-level roles for policy development, nuisance fitting and evaluation, and audits every fitted helper
          rather than trusting its name.
        </p>
        <p>
          Its study covered 3,000 twelve-step trajectories: 25,200 training records, 5,400 validation records with outcomes and 5,400 outcome-blind
          test observations. The candidate policy came from a local quantized 14-billion-parameter model scoring restricted action choices, blended
          25% with 75% behavior cloning. The leading fitted-Q estimate did not survive: a constant control nearly reproduced it, permuting the state
          alignment preserved it, and removing one reward component reversed the ranking. Those figures are results from the original evaluation run;
          the public repo is a cleaned release without those run artifacts.
        </p>

        <h3 id="leftout">{ENGINEERS.leftout}</h3>
        <p>
          A generated cohort of generic load states and abstract actions, with logging probabilities known by construction. That removes
          propensity-model error, which real observational data never does. Load evolves independently of actions, so reweighting fixed trajectories
          is evaluation, not a simulator: nobody can take an action here and see its counterfactual future.
        </p>
        <p>
          This page runs importance sampling only. It fits no Q function, runs no doubly robust correction and no language model, and its intervals
          are pointwise, unadjusted for choosing settings interactively.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          The engine, generator and estimators are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          . Its tests pin the one-step value, the logging-policy identity (blend fully toward the logger and every estimator returns the factual
          average), cumulative capping, support refusal, reward ablation and deterministic replay. From the site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/offline-policy-evaluation</code>
        </pre>
        <p>
          Export, under the hood in the demo, writes the configuration, every logged trajectory with its rewards and weights, the support check and
          the bootstrap intervals, so <code>evaluate(exported.config)</code> reproduces the run exactly.
        </p>
      </ForEngineers>
    </ProjectPage>
  );
}
