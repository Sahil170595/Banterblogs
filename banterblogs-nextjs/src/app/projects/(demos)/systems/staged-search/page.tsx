import { ForEngineers, ProjectPage, projectSections, type ProjectFinding } from '@/components/projects/ProjectPage';
import { formatFilter } from '@/components/projects/staged-search/format';
import { SearchDemo } from '@/components/projects/staged-search/SearchDemo';
import { brokenFilters, RERANK_TOP_K, RRF_K, runSearch } from '@/lib/projects/staged-search/engine';
import { EXAMPLE_CORPUS, EXAMPLE_QUERY } from '@/lib/projects/staged-search/example';
import { ladder } from '@/lib/projects/staged-search/ladder';
import { MAX_RECEIPT_BYTES } from '@/lib/projects/staged-search/receipt';
import { DEFAULT_SETTINGS } from '@/lib/projects/staged-search/schema';
import { reproduces, SOURCE_RUNS } from '@/lib/projects/staged-search/source-runs';
import { ProjectManifestSchema } from '@/lib/projects/manifest';
import { projectMetadata } from '@/lib/projects/metadata';
import manifest from './project.json';

const PROJECT = ProjectManifestSchema.parse(manifest);
export const metadata = projectMetadata(PROJECT);

const [SOURCE, STRATA] = PROJECT.links;
const sourceFile = (path: string) => `${STRATA.url.replace('/tree/', '/blob/')}/${path}`;

const PLAIN = {
  question: 'What does a search give up to fill its quota?',
  found: 'What the audit found',
  original: 'The original system',
  limits: 'What this page is not',
} as const;
const ENGINEERS = {
  pipeline: 'How the pipeline runs',
  port: 'Checked against the original',
  origin: 'Where this comes from',
  'limits-detail': 'Limits in detail',
  reproduce: 'Reproduce it',
} as const;

// every number in the write-up is computed from the engine at render
const DOCS = new Map(EXAMPLE_CORPUS.map((d) => [d.id, d]));
const RUNGS = ladder(EXAMPLE_QUERY, DEFAULT_SETTINGS);
const RUN = runSearch(EXAMPLE_CORPUS, EXAMPLE_QUERY, DEFAULT_SETTINGS);
const strict = RUNGS[0];
const strictAllMatch = strict.broken.every((b) => !b.length);
const outside = RUN.selected.filter((c) => brokenFilters(DOCS.get(c.id)!, EXAMPLE_QUERY).length > 0);
const farthest = outside.reduce((a, b) =>
  brokenFilters(DOCS.get(b.id)!, EXAMPLE_QUERY).length > brokenFilters(DOCS.get(a.id)!, EXAMPLE_QUERY).length ? b : a,
);
const farDoc = DOCS.get(farthest.id)!;
const counts = RUN.attempts.map((a) => a.count).join(', ');
const filtersText = EXAMPLE_QUERY.filters.map(formatFilter).join(', ');
const reproduced = SOURCE_RUNS.filter(reproduces).length;
const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six'];
const say = (n: number) => words[n] ?? String(n);
const Say = (n: number) => say(n)[0].toUpperCase() + say(n).slice(1);

const FINDINGS: ProjectFinding[] = [
  {
    value: `${RUN.dropped.length} of ${EXAMPLE_QUERY.filters.length} filters`,
    label: `dropped at the default threshold of ${DEFAULT_SETTINGS.relax_threshold} candidates, and the search still reports “${RUN.status}”.`,
  },
  {
    value: `${outside.length} of ${RUN.selected.length} outside`,
    label: `results fail a filter the request asked for; one is a ${farDoc.year} ${farDoc.collection} ${farDoc.kind}. StrataSearch’s output does not flag them: the red labels in the demo are this page’s addition.`,
  },
  {
    value: `${strict.report!.selected.length} of ${DEFAULT_SETTINGS.limit}${strictAllMatch ? ', all match' : ''}`,
    label: `results at thresholds ${strict.from} to ${strict.to}, where nothing is dropped and the search reports a shortfall instead.`,
  },
];

export default function StagedSearchPage() {
  return (
    <ProjectPage
      slug={PROJECT.slug}
      demo={<SearchDemo />}
      findings={FINDINGS}
      checked={`Matches ${reproduced} of ${SOURCE_RUNS.length} recorded runs of the original`}
      sections={projectSections(PLAIN, ENGINEERS)}
    >
      <h2 id="question">{PLAIN.question}</h2>
      <p>
        A search with filters can come back thin. StrataSearch&apos;s answer is relaxation: when its first search finds fewer candidates than a
        threshold, it drops one filter and searches again, until it has enough or has nothing left to drop. Its README is plain that filters are
        discovery hints, not boundaries, and that relaxation can erase useful constraints. This page makes the cost concrete: how many of the results
        a relaxed search returns are no longer what was asked for, and whether anything in the result says so.
      </p>

      <h2 id="found">{PLAIN.found}</h2>
      <p>
        StrataSearch&apos;s own example asks for {filtersText}, the hard criterion &ldquo;{EXAMPLE_QUERY.hard_criteria.join(', ')}&rdquo; (a term
        whose every word must appear in a note) and {DEFAULT_SETTINGS.limit} results. At its default threshold of {DEFAULT_SETTINGS.relax_threshold},
        the first search finds {counts} candidates as year, kind and collection drop in turn: every filter goes. The search reports {RUN.status}.{' '}
        {Say(outside.length)} of its {RUN.selected.length} results fall outside the request, among them a {farDoc.year} {farDoc.kind} from the{' '}
        {farDoc.collection} collection, &ldquo;{farDoc.title}&rdquo;.
      </p>
      <p>
        At thresholds {strict.from} to {strict.to} nothing is dropped: {strict.report!.selected.length} results
        {strictAllMatch ? `, ${strict.report!.selected.length === 2 ? 'both' : 'all'} inside the request,` : ','} and the search reports a shortfall.
        Neither status is wrong. &ldquo;Ready&rdquo; means the quota was met, and StrataSearch says so; it does not mean the quota was met with what
        was asked for. StrataSearch records which filters it dropped, but not which results only got in because of it. That per-result check is this
        page&apos;s addition, computed against the query&apos;s original filters.
      </p>

      <h2 id="original">{PLAIN.original}</h2>
      <p>
        <a href={STRATA.url} target="_blank" rel="noopener noreferrer">
          StrataSearch
        </a>{' '}
        is a document search pipeline I built in Python. A language model turns a request into filters; vector and keyword retrieval find candidates,
        relaxing the filters when results run thin; the result lists are fused, reranked and scored against the request&apos;s criteria. It is a
        neutralized public release of a staged private prototype. This page rebuilds its offline mode, the one that runs with no model and no network,
        and matches {reproduced} of {SOURCE_RUNS.length} recorded runs of it.
      </p>

      <h2 id="limits">{PLAIN.limits}</h2>
      <p>
        A measure of search quality. It runs on eighteen made-up notes with keyword matching only, and shows what relaxation does to a request, not
        how good the search is.
      </p>

      <ForEngineers lede="The two channels and their fusion, the gate, the check against the original's CLI, and how to reproduce every number here.">
        <h3 id="pipeline">{ENGINEERS.pipeline}</h3>
        <p>
          <strong>Two lexical channels.</strong> The body channel scores each unique query token by a damped term frequency, weighted by an inverse
          document frequency taken over the whole corpus and scaled by body length; the second channel adds 3 for a title match and 2 for a tag match,
          per token. Only positive scores enter a channel. Neither is an embedding or canonical BM25.
        </p>
        <p>
          <strong>Relax, then reuse.</strong> The body channel runs first, dropping year, then kind or title, then topic or tags, then collection,
          until it has as many candidates as the threshold. The second channel then runs on the final, relaxed filters, and the two lists fuse by
          reciprocal rank, 1/({RRF_K} + rank) from each list a note appears in. Body only skips the second channel.
        </p>
        <p>
          <strong>Gate, never pad.</strong> The reranker is an identity pass in the offline pipeline. A hard criterion passes when every one of its
          tokens appears in the note; soft criteria score token coverage from 0 to 3, rounded as Python rounds, halves to even. Only the first{' '}
          {RERANK_TOP_K} candidates are judged. Eligible notes sort by hard passes, soft total, then fused score; a note that fails a hard criterion
          is rejected and never used to fill the quota.
        </p>

        <h3 id="port">{ENGINEERS.port}</h3>
        <p>
          The code is a step-for-step port of{' '}
          <a href={sourceFile('stratasearch/local.py')} target="_blank" rel="noopener noreferrer">
            local.py
          </a>
          ,{' '}
          <a href={sourceFile('stratasearch/retriever.py')} target="_blank" rel="noopener noreferrer">
            retriever.py
          </a>{' '}
          and{' '}
          <a href={sourceFile('stratasearch/pipeline.py')} target="_blank" rel="noopener noreferrer">
            pipeline.py
          </a>
          , with the arithmetic in the source&apos;s order. It reproduces {reproduced} of {SOURCE_RUNS.length} recorded runs of the source&apos;s own
          CLI, among them body-only, two thresholds, a larger quota and a second query, matching every channel, score, selection and rejection to nine
          decimal places.
        </p>

        <h3 id="origin">{ENGINEERS.origin}</h3>
        <p>
          StrataSearch&apos;s full pipeline is an LLM query planner that maps criteria to filters, vector and keyword retrieval with relaxation, rank
          fusion, a learned reranker, and an LLM criterion scorer, with local inspection and replay. Its live adapters for Voyage, Turbopuffer and
          OpenAI are real code, tested with injected clients; the release made no live provider calls, and the offline mode this page ports is the one
          that runs without any.
        </p>
        <p>
          The source publishes no relevance or recall figures, only its fixture outcome, which this page reproduces: channel counts {counts}, and{' '}
          {RUN.selected.map((c) => c.id).join(', ')} selected.
        </p>

        <h3 id="limits-detail">{ENGINEERS['limits-detail']}</h3>
        <p>
          Eighteen fictional notes and lexical features: no embeddings, no learned reranker, no LLM planner or judge, and no relevance judgments, so
          nothing here measures search quality. Tokens are ASCII and exact; there are no synonyms or stems. The corpus is the source&apos;s example
          and is not editable here; the query and settings are. An exported file is checked for consistency, not authenticity.
        </p>

        <h3 id="reproduce">{ENGINEERS.reproduce}</h3>
        <p>
          Pick a row of the ladder, then open &ldquo;Edit the query, see the scores, export a run&rdquo;: drop the threshold to 3 and watch the
          shortfall; switch to body only; add a hard criterion that half the notes miss. Export a run and import it: the query reruns and the file is
          refused if its results do not follow. Files are limited to {MAX_RECEIPT_BYTES / 1000} KB. The port, the ladder and the tests are in the{' '}
          <a href={SOURCE.url} target="_blank" rel="noopener noreferrer">
            code for this page
          </a>
          . From the site&apos;s Next.js app:
        </p>
        <pre>
          <code>npx vitest run src/lib/projects/staged-search src/components/projects/staged-search</code>
        </pre>
      </ForEngineers>
    </ProjectPage>
  );
}
