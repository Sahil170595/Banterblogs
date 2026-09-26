import type { Config } from "tailwindcss";
import base from "./tailwind.config";

// The /show scenes' stylesheet (src/app/show/scenes.css, `@config` at its
// top) builds from this config: the utilities the scene components use,
// against the site's own theme. tailwind.config.ts leaves the scene
// components out of its content, so no other page downloads them; in the
// global sheet they were 16 KB of 101, enough to split the fonts into a
// second render-blocking sheet on every page. `important` scopes every
// utility to a scene root ([data-scene], SCENE_ROOT in _shared.ts), so a
// sheet loaded after globals.css can't reorder the page chrome's utilities.
const config: Config = {
  ...base,
  content: ["./src/components/scenes/**/*.{js,ts,jsx,tsx,mdx}"],
  important: "[data-scene]",
};

export default config;
