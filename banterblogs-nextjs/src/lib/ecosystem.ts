// The Chimera ecosystem's nodes: the constitutional core and the nine
// repositories around it. The landing's star systems
// (components/galactic/systems.ts) and the /platform map
// (components/platform/EcosystemMap.tsx) both read their names and roles
// from here, so the two cannot drift. Who calls whom is in
// components/platform/connections.ts.
import { GITHUB_URLS, MEASUREMENTS, PYPI_URL, REPORTS } from '@/lib/constants';

export const CORE_ID = 'core';

export type SystemId =
  | 'banterpacks'
  | 'banterhearts'
  | 'chimera-multi-agent'
  | 'jarvis-console'
  | 'chimeraforge'
  | 'echo'
  | 'chimeradroid'
  | 'this-site'
  | 'project-wyvern';

export type NodeId = typeof CORE_ID | SystemId;

export interface EcosystemNode {
  id: NodeId;
  name: string;
  /** the one-line role */
  blurb: string;
  /** languages and runtimes, as a small label */
  stack: string;
}

export interface EcosystemSystem extends EcosystemNode {
  id: SystemId;
  /** internal ('/...') or external destination; private repositories lead to their on-site pages */
  href: string;
  /** call to action, honest about where href goes */
  ctaLabel: string;
}

// The architecture everything else serves. It is not a repository: its
// router, debate engine, runtime and alignment loop live inside Banterpacks.
export const ECOSYSTEM_CORE: EcosystemNode = {
  id: CORE_ID,
  name: 'Chimera',
  blurb:
    'The constitutional AI architecture everything here orbits — debate engine, multi-model consensus, embedding-based safety routing, BFT/Ed25519 provenance, ZK proofs, RLAIF self-improvement.',
  stack: 'Python · Rust',
};

// In the landing's order (the three anchors, then outward by orbit).
export const ECOSYSTEM_SYSTEMS: readonly EcosystemSystem[] = [
  {
    // repository is private; the dev-log hub tells its story
    id: 'banterpacks',
    name: 'Banterpacks',
    blurb: 'Core monorepo — JARVIS gateway, constitutional router, debate engine, Rust provenance',
    href: '/banterpacks',
    ctaLabel: 'Read the Banterpacks dev log',
    stack: 'Python · Rust',
  },
  {
    // its measurements are the archive; repository is private
    id: 'banterhearts',
    name: 'Banterhearts',
    blurb: `ML research platform — source of the ${MEASUREMENTS.SHORT} measurements`,
    href: '/reports',
    ctaLabel: 'Browse the research archive',
    stack: 'Python',
  },
  {
    // repository is private; the Chimera dev log is on-site
    id: 'chimera-multi-agent',
    name: 'Chimera Multi-Agent',
    blurb: 'Muse Protocol — 6-agent content pipeline + observability control plane',
    href: '/chimera',
    ctaLabel: 'Read the Chimera dev log',
    stack: 'Python',
  },
  {
    id: 'jarvis-console',
    name: 'JARVIS Console',
    blurb: 'Web console — streaming chat, control room, agent ELO',
    href: GITHUB_URLS.JARVIS_CONSOLE,
    ctaLabel: 'Open JARVIS Console on GitHub',
    stack: 'TypeScript · Next.js',
  },
  {
    id: 'chimeraforge',
    name: 'Chimeraforge',
    blurb: 'LLM deployment optimizer on PyPI — 5-gate capacity planner',
    href: PYPI_URL,
    ctaLabel: 'Open chimeraforge on PyPI',
    stack: 'Python · Rust',
  },
  {
    id: 'echo',
    name: 'Echo',
    blurb: 'Messaging adapters — Slack, Discord, Telegram, WhatsApp, and email bridges to JARVIS',
    href: GITHUB_URLS.ECHO,
    ctaLabel: 'Open Echo on GitHub',
    stack: 'Python',
  },
  {
    id: 'chimeradroid',
    name: 'Chimeradroid',
    blurb: 'Android companion — voice, session handoff, mesh networking',
    href: GITHUB_URLS.CHIMERADROID,
    ctaLabel: 'Open Chimeradroid on GitHub',
    stack: 'C# · Unity',
  },
  {
    id: 'this-site',
    name: 'This Site',
    blurb: `This site — research archive, ${REPORTS.DISPLAY} technical reports`,
    href: GITHUB_URLS.BANTERBLOGS,
    ctaLabel: "Open this site's source",
    stack: 'TypeScript · Next.js',
  },
  {
    id: 'project-wyvern',
    name: 'Project Wyvern',
    blurb: 'Embodied autonomy — governed PX4/ROS 2 mission plane (sim-only MVP)',
    href: GITHUB_URLS.PROJECT_WYVERN,
    ctaLabel: 'Open Project Wyvern on GitHub',
    stack: 'Python · ROS 2',
  },
];

export const ECOSYSTEM_NODES: readonly EcosystemNode[] = [ECOSYSTEM_CORE, ...ECOSYSTEM_SYSTEMS];

const NODE_INDEX = new Map<NodeId, EcosystemNode>(ECOSYSTEM_NODES.map((node) => [node.id, node]));

export function nodeById(id: NodeId): EcosystemNode {
  const node = NODE_INDEX.get(id);
  if (!node) throw new Error(`[ecosystem] unknown node: ${String(id)}`);
  return node;
}
