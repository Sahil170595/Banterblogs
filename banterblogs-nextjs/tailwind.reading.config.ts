import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

// The reading routes' stylesheet (src/app/reading.css, `@config` at its top)
// builds from this config: the typography plugin's .prose components and
// nothing else (no core plugins, so no preflight, container or utilities;
// those come from globals.css on every page). tailwind.config.ts leaves the
// plugin out, so no other page downloads the components. The content globs
// cover the files that set `prose` classes on the reading pages.
const config: Config = {
  content: ["./src/components/reports/**/*.tsx", "./src/app/reports/**/*.tsx", "./src/app/episodes/**/*.tsx"],
  corePlugins: [],
  plugins: [typography],
};

export default config;
