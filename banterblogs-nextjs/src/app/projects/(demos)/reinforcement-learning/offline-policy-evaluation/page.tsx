import { OpeDemo } from '@/components/projects/offline-policy-evaluation/OpeDemo';
import { ProjectPage, type ProjectFinding, type ProjectSection } from '@/components/projects/ProjectPage';
import { ACTIONS, CONTEXTS, DEFAULT_CONFIG, evaluate, LOW_SUPPORT, RESAMPLES } from '@/lib/projects/offline-policy-evaluation/engine';
import { constantShare, signed } from '@/lib/projects/offline-policy-evaluation/verdict';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, COUNTERLEDGER] = PROJECT.links;

const SECTIONS = {
  question: 'The questions an estimate has to survive',
  controls: 'What the controls show',
  estimators: 'Three estimators, three compromises',
  support: 'Support, and when to refuse',
  origin: 'Where this comes from',
  limits: 'What this fixture is not',
  reproduce: 'Reproduce it',
} as const;
const sections: ProjectSection[] = Object.entries(SECTIONS).map(([id, title]) => ({ id, title }));

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
const broadPaired = broad.comparisons[0].differences.normalized!;
const gapDetail = gap.comparisons[0].result.supportCheck.gaps[0];
const finalEss = target.result.horizons[target.result.horizons.length - 1].rawEss;
const pct = (share: number) => `${Math.round(share * PERCENT)}%`;
const interval = (range: [number, number]) => `${signed(range[0])} to ${signed(range[1])}`;

const FINDINGS: ProjectFinding[] = [
  { value: pct(share), label: 'of the target’s estimated gain over the logger also comes from a control that never reads the state.' },
  { value: interval(noGainTarget.differences.normalized!), label: 'the paired interval once the gain term leaves the reward: it crosses zero, and the improvement is gone.' },
  { value: `${finalEss.toFixed(0)}/${DEFAULT_CONFIG.size}`, label: 'logged trajectories the target’s final-step weights effectively use.' },
];

export default function OfflinePolicyEvaluationPage() {
  return (
    <ProjectPage slug={PROJECT.slug} demo={<OpeDemo />} findings={FINDINGS} sections={sections}>
      <h2 id="question">{SECTIONS.question}</h2>
      <p>
        Offline evaluation scores a new policy on decisions someone else made. Reweight each logged trajectory by how much more or less
        likely the new policy was to take the logged actions, average the rewards, and a number comes out, even when the logs barely
        cover what the new policy does and even when the reward pays for the wrong thing.
      </p>
      <p>
        So the number has to survive four questions before it means better. Is the gain larger than its uncertainty? Does a policy that
        ignores the state get the same gain? Does the ranking hold under a different reward? Is there logged evidence at all for what the
        new policy wants to do?
      </p>

      <h2 id="controls">{SECTIONS.controls}</h2>
      <p>
        Under the default reward (gain minus {DEFAULT_CONFIG.harmWeight} × harm) and rarely logged intensification, the state-responsive
        target scores {signed(value)} against the logger&apos;s {signed(logged)}: a gain of {signed(value - logged)}, with a paired 95%
        interval from {interval(paired)} over {RESAMPLES} bootstrap draws. That is the number a dashboard would report.
      </p>
      <p>
        The constant control intervenes at the same average rate but ignores load. It scores {signed(constant.result.normalized!)},{' '}
        {pct(share)} of the target&apos;s gain. Most of the apparent improvement is a shift in how often to act, not in when. Drop the gain
        term from the reward and the target falls to {signed(noGainTarget.result.normalized!)} against {signed(noGainTarget.result.logged)},
        an interval that crosses zero. Give the logger broad support for intensifying and the logger wins outright:{' '}
        {interval(broadPaired)}.
      </p>
      <p>
        Every one of those is the same estimator on the same kind of data. The demo&apos;s controls switch between them, and the verdict
        above the plot is computed from the paired interval each time rather than written in advance.
      </p>

      <h2 id="estimators">{SECTIONS.estimators}</h2>
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
        The cap applies to the cumulative trajectory ratio at each step, never to each one-step ratio, which would let the bound grow as
        the cap to the horizon. Capping trades variance for bias. Self-normalizing keeps the estimate inside the range of possible returns
        but is biased in finite samples too. The effective sample size says how many trajectories the weights really use: under the
        default target it falls from {target.result.horizons[0].rawEss.toFixed(0)} at the first step to {finalEss.toFixed(0)} at the
        last, out of {DEFAULT_CONFIG.size}.
      </p>
      <p>
        Intervals come from {RESAMPLES} bootstrap draws of whole trajectories, shared by every policy, so a difference interval is a
        paired contrast, not two intervals subtracted. Normalizing denominators are recomputed in each draw. If any draw has a zero
        denominator, the interval is withheld rather than quietly narrowed.
      </p>

      <h2 id="support">{SECTIONS.support}</h2>
      <p>
        Importance weighting needs the logger to have taken, at least sometimes, every action the target takes. When it never did,
        no reweighting recovers the outcome. With no logged intensification at low load, the target still puts{' '}
        {pct(gapDetail.targetProbability)} on {ACTIONS[gapDetail.action]} at {CONTEXTS[gapDetail.context].toLowerCase()}, so the evaluator
        reports nothing for it: no value, no interval, no comparison. Capping cannot create evidence that was never logged.
      </p>
      <p>
        The check runs against every state the generator can reach, not only the states a sample happened to contain, so a small sample
        that misses low load still refuses. Thin support, logged under {pct(LOW_SUPPORT)}, is shown in the support table without
        blocking: it is a warning about variance, not a missing outcome.
      </p>

      <h2 id="origin">{SECTIONS.origin}</h2>
      <p>
        This page is a small rebuild of the questions behind{' '}
        <a href={COUNTERLEDGER.url} target="_blank" rel="noopener noreferrer">
          Counterledger
        </a>
        , the offline policy evaluator I built in Python. Counterledger fits backward finite-horizon Q functions with gradient boosting,
        adds a sequential doubly robust correction with capped cumulative ratios, separates subject-level roles for policy development,
        nuisance fitting and evaluation, and audits every fitted helper rather than trusting its name.
      </p>
      <p>
        Its study covered 3,000 twelve-step trajectories: 25,200 training records, 5,400 validation records with outcomes and 5,400
        outcome-blind test observations. The candidate policy came from a local quantized 14-billion-parameter model scoring restricted
        action choices, blended 25% with 75% behavior cloning. The leading fitted-Q estimate did not survive: a constant control nearly
        reproduced it, permuting the state alignment preserved it, and removing one reward component reversed the ranking. The result
        was a reproducible evaluation system and a negative finding: no state-dependent value was shown. Those figures are results from
        the original evaluation run; the public repo is a cleaned release without those run artifacts.
      </p>

      <h2 id="limits">{SECTIONS.limits}</h2>
      <p>
        A generated cohort of generic load states and abstract actions, with logging probabilities known by construction. That removes
        propensity-model error, which real observational data never does. Load evolves independently of actions, so reweighting fixed
        trajectories is evaluation, not a simulator: nobody can take an action here and see its counterfactual future.
      </p>
      <p>
        This page runs importance sampling only. It fits no Q function, runs no doubly robust correction and no language model, and its
        intervals are pointwise, unadjusted for choosing settings interactively. No clinical or causal claim is made.
      </p>

      <h2 id="reproduce">{SECTIONS.reproduce}</h2>
      <p>
        The engine, generator and estimators are in the{' '}
        <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
          demo source
        </a>
        . Its tests pin the one-step value, the logging-policy identity (blend fully toward the logger and every estimator returns the
        factual average), cumulative capping, support refusal, reward ablation and deterministic replay. From the site&apos;s Next.js app:
      </p>
      <pre>
        <code>npx vitest run src/lib/projects/offline-policy-evaluation</code>
      </pre>
      <p>
        Export writes the configuration, every logged trajectory with its rewards and weights, the support check and the bootstrap
        intervals, so <code>evaluate(exported.config)</code> reproduces the run exactly.
      </p>
    </ProjectPage>
  );
}
