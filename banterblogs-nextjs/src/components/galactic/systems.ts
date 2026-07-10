// The nine Chimera-ecosystem repositories as star systems orbiting the
// platform's gravitational center — mapped from the REAL system flow in the
// Banterpacks README (user request -> JARVIS gateway -> TDD002 constitutional
// router -> Chimera debate -> RLAIF loop -> TDD005 provenance):
//   - star SIZE ~ architectural mass (core monorepo 141K LOC > research
//     platform > control plane > interfaces > thin channel adapters)
//   - orbit RADIUS ~ coupling to the constitutional core (Banterpacks hosts
//     it; Banterhearts feeds the safety loop; adapters ride the rim)
// Orbital elements are Keplerian (solved per frame via eccentric anomaly);
// periods follow Kepler's third law (P ~ a^1.5) so inner systems lap outer
// ones. Star temperature renders through the blackbody ramp.
export interface StarSystemDef {
  name: string;
  blurb: string;
  href: string;
  /** semi-major axis, world units */
  a: number;
  /** eccentricity 0..1 */
  e: number;
  /** inclination, radians (tilt out of the reference plane) */
  inc: number;
  /** longitude of ascending node, radians (rotation of the orbit plane) */
  node: number;
  /** initial mean anomaly, radians */
  phase: number;
  /** visual orbital period, seconds */
  period: number;
  /** blackbody temperature, Kelvin */
  tempK: number;
  /** star radius, world units */
  size: number;
}

// What a click in the scene selected: the core (Chimera, the architecture
// everything orbits) or one of the nine repo star systems.
export type GalacticSelection = { kind: 'core' } | { kind: 'star'; system: StarSystemDef };

export const CORE_SELECTION = {
  name: 'Chimera',
  eyebrow: 'Gravitational core',
  blurb:
    'The constitutional AI architecture everything here orbits — debate engine, multi-model consensus, embedding-based safety routing, BFT/Ed25519 provenance, ZK proofs, RLAIF self-improvement.',
  stats: '9 repositories · 55 technical reports · 1,348,000+ measurements',
  href: '/platform',
  cta: 'Explore the platform',
} as const;

const KEPLER_K = 14; // seconds of period for a=10 — tuned for watchable motion

function period(a: number): number {
  return KEPLER_K * Math.pow(a / 10, 1.5);
}

export const STAR_SYSTEMS: StarSystemDef[] = [
  {
    // The platform's home: 6 subsystems, ~141K LOC — the giant closest to
    // the core it hosts.
    name: 'Banterpacks',
    blurb: 'Core monorepo — JARVIS gateway, constitutional router, debate engine, Rust provenance',
    href: 'https://github.com/Sahil170595',
    a: 11.8, e: 0.10, inc: 0.10, node: 0.4, phase: 1.1, period: period(11.8),
    tempK: 6500, size: 0.50,
  },
  {
    // The research furnace — 1.34M+ measurements feed the safety loop.
    name: 'Banterhearts',
    blurb: 'ML research platform — source of the 1.34M+ measurements',
    href: 'https://github.com/Sahil170595',
    a: 14, e: 0.28, inc: 0.22, node: 2.1, phase: 3.9, period: period(14),
    tempK: 11000, size: 0.44,
  },
  {
    // Observability control plane wrapping the whole stack.
    name: 'Chimera Multi-Agent',
    blurb: 'Muse Protocol — 6-agent content pipeline + observability control plane',
    href: 'https://github.com/Sahil170595',
    a: 16, e: 0.18, inc: 0.30, node: 1.2, phase: 5.0, period: period(16),
    tempK: 5200, size: 0.30,
  },
  {
    // Primary human interface to the JARVIS gateway.
    name: 'JARVIS Console',
    blurb: 'Web console — streaming chat, control room, agent ELO',
    href: 'https://github.com/Sahil170595',
    a: 18, e: 0.14, inc: 0.12, node: 0.9, phase: 0.8, period: period(18),
    tempK: 7500, size: 0.27,
  },
  {
    // Productized research output on PyPI.
    name: 'Chimeraforge',
    blurb: 'LLM deployment optimizer on PyPI — 5-gate capacity planner',
    href: 'https://pypi.org/project/chimeraforge/',
    a: 20, e: 0.05, inc: 0.06, node: 5.2, phase: 0.2, period: period(20),
    tempK: 3800, size: 0.28,
  },
  {
    // Thin channel adapters — the red dwarf of the system.
    name: 'Echo',
    blurb: 'Messaging adapters — Slack and Discord bridges to JARVIS',
    href: 'https://github.com/Sahil170595',
    a: 21.5, e: 0.08, inc: 0.42, node: 4.4, phase: 4.2, period: period(21.5),
    tempK: 3200, size: 0.16,
  },
  {
    name: 'Chimeradroid',
    blurb: 'Android companion — voice, session handoff, mesh networking',
    href: 'https://github.com/Sahil170595',
    a: 23, e: 0.10, inc: 0.16, node: 3.6, phase: 2.4, period: period(23),
    tempK: 4200, size: 0.22,
  },
  {
    // The documentation layer — outermost stable orbit, sees everything.
    name: 'Chimeraforge Site',
    blurb: 'This site — research archive, 55 technical reports',
    href: 'https://github.com/Sahil170595/Banterblogs',
    a: 25, e: 0.06, inc: 0.20, node: 2.9, phase: 2.0, period: period(25),
    tempK: 5800, size: 0.24,
  },
  {
    // The S2 analog: embodied autonomy on a high-eccentricity plunge orbit —
    // periapsis passes skim the disk the way S-stars skim Sagittarius A*.
    name: 'Project Wyvern',
    blurb: 'Embodied autonomy — governed PX4/ROS 2 mission plane (sim-only MVP)',
    href: 'https://github.com/Sahil170595',
    a: 19, e: 0.82, inc: 0.36, node: 5.8, phase: 5.9, period: period(19),
    tempK: 9500, size: 0.26,
  },
];
