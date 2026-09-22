import { MEASUREMENTS, REPORTS } from './constants';
import { CHIMERAFORGE_TOOL } from './tools';

// The /about page's ecosystem list and onward links (owner copy), kept apart
// from its layout (app/about/page.tsx), so the page test can hold every line
// to it.

export interface EcosystemRepo {
  name: string;
  lang: string;
  what: string;
}

export const ECOSYSTEM: EcosystemRepo[] = [
  {
    name: 'Banterpacks',
    lang: 'Python, Rust',
    what: 'Core monorepo — 6 subsystems: JARVIS (AI gateway), TDD002 (constitutional router), Chimera (debate engine), TDD005 (Rust runtime with ZK proofs + BFT), RLAIF (self-improving alignment), and Authoring (LLM providers).',
  },
  {
    name: 'Banterhearts',
    lang: 'Python',
    what: `ML research platform — inference API, benchmarking infrastructure, AutoOpt agent, safety evaluation framework. Source of ${MEASUREMENTS.SHORT} measurements across ${REPORTS.DISPLAY} technical reports.`,
  },
  {
    name: 'Chimeraforge',
    lang: 'Python, Rust',
    what: `LLM deployment optimizer on PyPI (v${CHIMERAFORGE_TOOL.version}). Model-agnostic 5-gate capacity planner (VRAM, Quality, Safety, Latency, Cost) — plans any registry / Ollama / HuggingFace model across 22 GPU profiles, and serves the same numbers to AI assistants over MCP.`,
  },
  {
    name: 'Chimera Multi-Agent',
    lang: 'Python',
    what: 'Muse Protocol — 6-agent content pipeline with ClickHouse analytics. Also the observability control plane (OTel, Datadog, DLQ).',
  },
  {
    name: 'Chimeradroid',
    lang: 'C# / Unity',
    what: 'Android companion for JARVIS — voice, chat, session handoff, tool approval, mesh networking, offline-first.',
  },
  {
    name: 'Echo',
    lang: 'Python',
    what: 'Messaging channel adapters — Slack and Discord bridges to JARVIS. Session tracking, device key auth.',
  },
  {
    name: 'JARVIS Console',
    lang: 'TypeScript / Next.js',
    what: 'Web console for JARVIS — chat with streaming, control room dashboard, cognitive agent ELO, tool catalog, workflow management.',
  },
  {
    name: 'This Site',
    lang: 'TypeScript / Next.js',
    what: 'Public presence. Episodes generated from git commits, research archive, platform documentation.',
  },
  {
    name: 'Project Wyvern',
    lang: 'Python, Rust, ROS 2',
    what: 'Embodied autonomy plane. Governed mission execution between Chimera control and PX4/ArduPilot — 5-tier authority hierarchy, cryptographic mission replay, OpenAPI 3.1 mission contract. Phase 0 specs complete; SIM-ONLY MVP in progress on PX4 + Gazebo.',
  },
];

export interface AboutLink {
  label: string;
  href: string;
}

/** where the page leads next; the first is its one call to action */
export const ABOUT_LINKS: AboutLink[] = [
  { label: 'Platform Architecture', href: '/platform' },
  { label: 'Research Archive', href: '/reports' },
  { label: 'Papers', href: '/papers' },
  { label: 'Work', href: '/work' },
  { label: 'Episodes', href: '/episodes' },
  { label: 'Substack', href: 'https://substack.com/@sahilkadadekar' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/sahilkadadekar' },
];
