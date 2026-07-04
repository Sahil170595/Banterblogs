import { MEASUREMENTS, REPORTS } from "@/lib/constants";

export const siteConfig = {
  name: "Chimeraforge",
  description: `Personal AI platform — local inference, constitutional AI governance, and ${MEASUREMENTS.SHORT} research measurements across ${REPORTS.DISPLAY} technical reports.`,
  // NOTE: a dead `paths` block was removed 2026-07-04 — nothing consumed it,
  // and it included a `../Banterhearts` cross-repo filesystem path (banned by
  // the ecosystem standards). episodes.ts/locator.ts own their real paths.
  platformOffsets: {
    banterpacks: 0,
    chimera: 10_000,
    benchmark: 20_000,
    unknown: 30_000,
  },
  autoTagHints: [
    ["banterpacks", "banterpacks"],
    ["chimera", "chimera"],
    ["banterhearts", "banterhearts"],
    ["ai ", "ai"],
    [" llm", "ai"],
    ["machine learning", "ai"],
    ["testing", "testing"],
    ["deployment", "deployment"],
    ["architecture", "architecture"],
    ["benchmark", "benchmarks"],
    ["performance", "performance"],
  ] as [string, string][],
};

export type SiteConfig = typeof siteConfig;
