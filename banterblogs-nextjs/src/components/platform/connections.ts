// Who calls whom across the Chimera ecosystem (lib/ecosystem.ts names the
// nodes). Every edge names the file it was read from; an edge with no source
// is left out, not guessed. Kept apart from the nodes so the landing, which
// reads only names and roles, ships none of this.
import { CORE_ID, nodeById, type NodeId } from '@/lib/ecosystem';

/** call: one service calls another at run time. data: files or published results move, with no service call. */
export type EdgeKind = 'call' | 'data';
/** live: running today. off: built, gated off by default. planned: specified, not built. archived: ran, since retired. */
export type EdgeStatus = 'live' | 'off' | 'planned' | 'archived';
/** how the map draws an edge: solid, dotted or dashed */
export type EdgeLine = 'call' | 'data' | 'inactive';

export interface EcosystemEdge {
  /** the caller, or where the data comes from */
  from: NodeId;
  /** the callee, or where the data goes */
  to: NodeId;
  kind: EdgeKind;
  status: EdgeStatus;
  /** the transport, in full */
  protocol: string;
  /** the short label drawn on the edge */
  label: string;
  /** what travels, as one sentence */
  note: string;
  /** the file the edge was read from (sibling repositories are read for facts, never imported) */
  source: string;
}

export const ECOSYSTEM_EDGES: readonly EcosystemEdge[] = [
  {
    from: 'echo',
    to: 'banterpacks',
    kind: 'call',
    status: 'live',
    protocol: 'HTTP',
    label: 'HTTP',
    note: 'Each channel adapter relays a platform message to the JARVIS gateway and carries the reply back.',
    source: 'Echo/README.md ("lightweight HTTP relay: platform event in, JARVIS API call, platform response back"); Banterpacks/CLAUDE.md, External Repos',
  },
  {
    from: 'chimeradroid',
    to: 'banterpacks',
    kind: 'call',
    status: 'live',
    protocol: 'HTTP and WebSocket',
    label: 'HTTP · WS',
    note: 'The Android client calls the JARVIS gateway over HTTP and holds a WebSocket open for the live event stream.',
    source: 'Chimeradroid/README.md (JarvisWeb HTTP client, JarvisStreamClient WebSocket, "WebSocket /jarvis/stream")',
  },
  {
    from: 'jarvis-console',
    to: 'banterpacks',
    kind: 'call',
    status: 'live',
    protocol: 'HTTP and WebSocket',
    label: 'HTTP · WS',
    note: 'The web console calls the JARVIS gateway over HTTP and streams chat over a WebSocket.',
    source: 'Banterpacks/CLAUDE.md, External Repos ("Consumes JARVIS HTTP") and Code Quality Standards (WS_PATH "/jarvis/stream"); /platform ("TypeScript / Next.js · WebSocket")',
  },
  {
    from: 'jarvis-console',
    to: CORE_ID,
    kind: 'call',
    status: 'live',
    protocol: 'server-sent events',
    label: 'SSE',
    note: 'The console’s debate viewer follows a running debate as server-sent events from the debate engine.',
    source: 'Banterpacks/CLAUDE.md, External Repos ("chimera SSE at /api/v1/debate/{id}/stream"); jarvis-console/CLAUDE.md',
  },
  {
    from: 'banterpacks',
    to: CORE_ID,
    kind: 'call',
    status: 'live',
    protocol: 'HTTP',
    label: 'HTTP',
    note: 'Inside the monorepo, the JARVIS gateway reaches the constitutional router, the debate engine and the Rust runtime over HTTP.',
    source: 'Banterpacks/CLAUDE.md, Dependency Graph (jarvis → tdd002, tdd005, chimera; "ALL coupling is HTTP")',
  },
  {
    from: 'banterpacks',
    to: 'chimera-multi-agent',
    kind: 'call',
    status: 'live',
    protocol: 'OpenTelemetry (OTLP)',
    label: 'OTLP',
    note: 'The services export traces to an OpenTelemetry collector, which forwards them to the Muse runtime.',
    source: 'Banterpacks/CLAUDE.md, Patch Map, Observability ("one OTLP pipeline → collector → ClickHouse", "collector fans traces → muse:4317")',
  },
  {
    from: 'chimera-multi-agent',
    to: 'banterpacks',
    kind: 'call',
    status: 'live',
    protocol: 'HTTP',
    label: 'HTTP',
    note: 'Muse fixers act on what the watcher finds by calling the JARVIS gateway.',
    source: 'Chimera_Multi_agent/muse/fixers/base.py (MUSE_JARVIS_URL) and provider_rerouter.py; Banterpacks/docker/docker-compose.yml (muse service)',
  },
  {
    from: 'banterpacks',
    to: 'banterhearts',
    kind: 'call',
    status: 'off',
    protocol: 'HTTP',
    label: 'HTTP · off by default',
    note: 'The JARVIS gateway has Banterhearts clients, gated off by default in the live serving path.',
    source: 'Banterpacks/README.md, External Repos ("Env-gated OFF in the live serving path"); Banterpacks/docker/docker-compose.flywheel.yml',
  },
  {
    from: 'banterhearts',
    to: 'chimera-multi-agent',
    kind: 'data',
    status: 'live',
    protocol: 'benchmark files',
    label: 'bench data',
    note: 'A Muse ingestion agent reads Banterhearts benchmark results into ClickHouse.',
    source: '/platform, How data flows, step 1; Chimera_Multi_agent/README.md ("muse ingest", bench_runs); agents/banterhearts_ingestor.py',
  },
  {
    from: 'chimera-multi-agent',
    to: 'this-site',
    kind: 'data',
    status: 'archived',
    protocol: 'git push',
    label: 'episodes · archived',
    note: 'The publisher agent pushed generated episodes to GitHub and Vercel rebuilt the site; the stream was archived on 2026-06-26.',
    source: '/platform, How data flows, step 3, and the This Site row; Chimera_Multi_agent/agents/publisher.py',
  },
  {
    from: 'banterhearts',
    to: 'this-site',
    kind: 'data',
    status: 'live',
    protocol: 'technical reports',
    label: 'reports',
    note: 'Its technical reports are published as the site’s research archive.',
    source: '/platform (Banterhearts and This Site rows); public/llms.txt, The Repositories, 2 and 8',
  },
  {
    from: 'banterhearts',
    to: 'chimeraforge',
    kind: 'data',
    status: 'live',
    protocol: 'measurements',
    label: 'measurements',
    note: 'The planner’s models are fitted on Banterhearts measurements; it plans offline, with no call back.',
    source: 'Chimeraforge/README.md ("the actionable CLI splice of the parent Banterhearts program"; "plan / suggest / catalog run fully offline")',
  },
  {
    from: CORE_ID,
    to: 'project-wyvern',
    kind: 'call',
    status: 'planned',
    protocol: 'HTTP (OpenAPI)',
    label: 'HTTP · planned',
    note: 'The Chimera control plane is specified to drive Wyvern missions through an OpenAPI contract; the integration is planned, after the simulation-only MVP.',
    source: 'ProjectWyvern/README.md (control-plane diagram "HTTP / OpenAPI"; roadmap phase 2 "Chimera integration: Planned")',
  },
];

// A node with no edge must say why here; none stands alone today.
export const ISOLATED_NODES: Partial<Record<NodeId, string>> = {};

/** one edge per direction between two nodes */
export const edgeKey = (edge: Pick<EcosystemEdge, 'from' | 'to'>) => `${edge.from}>${edge.to}`;

export function edgeLine(edge: Pick<EcosystemEdge, 'kind' | 'status'>): EdgeLine {
  if (edge.status !== 'live') return 'inactive';
  return edge.kind === 'data' ? 'data' : 'call';
}

export const edgesOf = (id: NodeId) => ECOSYSTEM_EDGES.filter((edge) => edge.from === id || edge.to === id);

export const neighboursOf = (id: NodeId): NodeId[] => [
  ...new Set(edgesOf(id).map((edge) => (edge.from === id ? edge.to : edge.from))),
];

// in words, so the list reads aloud without the arrows
const VERB: Record<EdgeKind, Record<EdgeStatus, string>> = {
  call: { live: 'calls', off: 'can call (off by default)', planned: 'is planned to call', archived: 'used to call' },
  data: {
    live: 'sends data to',
    off: 'can send data to (off by default)',
    planned: 'is planned to send data to',
    archived: 'used to send data to',
  },
};

/** an edge as one sentence, for the list that stands in for the drawing */
export function describeEdge(edge: EcosystemEdge): string {
  return `${nodeById(edge.from).name} ${VERB[edge.kind][edge.status]} ${nodeById(edge.to).name}: ${edge.protocol}. ${edge.note}`;
}
