import path from "path";

export const siteConfig = {
  name: "Banterblogs",
  description: "Autonomous devlog covering Banterpacks overlay, Banterhearts (Chimera Heart) ML platform, and the Banterblogs automation loop.",
  paths: {
    posts: path.join(process.cwd(), "posts"),
    banterpacks: path.join(process.cwd(), "posts", "banterpacks"),
    chimera: path.join(process.cwd(), "posts", "chimera"),
    reports: path.join(process.cwd(), "reports"),
    publishReady: path.join(process.cwd(), "PublishReady"),
    banterhearts: path.join(process.cwd(), "..", "Banterhearts"),
  },
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
