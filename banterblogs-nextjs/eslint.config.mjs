import Js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  Js.configs.recommended,
  ...nextCoreWebVitals,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // React Three Fiber's render loop is imperative by design — useFrame
    // mutates three.js objects (camera, positions, uniforms) every frame.
    // react-hooks/immutability cannot model that and flags all of it.
    files: ["src/components/galactic/**/*.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  {
    // The 5 /show scene components share a deliberate SSR-hydration bridge
    // (mounted-flag + reduced-motion sync via setState-in-effect) that this
    // heuristic rule can't distinguish from cascading-render bugs. Scoped
    // here instead of repo-wide; the shared-scene-primitives refactor (PR #14)
    // is the place to consolidate the bridge.
    files: ["src/components/scenes/**/*.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
