# Route and visual checks (Playwright)

`routes.spec.ts` visits every route the site redesign touches, plus a missing page, at 1440×900 (`desktop`) and 390×844 (`phone`, touch), against a production build. For each one it checks:

- the page is exactly as wide as the viewport (`scrollWidth === innerWidth`);
- the console shows no errors and nothing throws (the `/_vercel/*` analytics scripts 404 everywhere except Vercel, so those are ignored, as is the missing page's own 404);
- the page has an `h1`;
- the fold matches its screenshot baseline, with reduced motion, animations disabled, the canvas masked and 1% of pixels allowed to differ. This check only runs when `VISUAL_SCREENSHOTS=on`.

Those routes, plus `/banterpacks`, `/chimera` and the five `/show/*` scenes, also load once at 320×640 on the `phone` project and must not scroll sideways (WCAG 1.4.10 reflow) or log errors. That check has no screenshot.

The suite is not part of `npm run verify` or vitest (it needs a server and a browser), and it sits outside the app's `tsconfig.json`, so `next build` never type-checks it; `e2e/tsconfig.json` does, in CI. CI runs it in the `visual` job of `.github/workflows/ci.yml`, inside `mcr.microsoft.com/playwright:v1.63.0-noble`, next to the `build` job. The image tag and the exact `@playwright/test` version in `package.json` move together.

## Run it locally

```bash
npm run build
npx playwright install chromium   # once per Playwright version
npm run test:e2e                  # starts `next start` on :3100 itself
```

Use `E2E_PORT=<port>` for another port, or `E2E_BASE_URL=<url>` to test a server that is already running. Locally the screenshot check stays off: baselines are Linux renders from the CI image, and the snapshot names carry the platform, so a Windows or macOS render is never compared with them.

## Screenshot baselines

Baselines must be rendered by the same container image that compares them, so they are generated in CI:

1. Run the workflow by hand with `update_snapshots` set, from the repository root. GitHub dispatches a workflow only once `main` has the `workflow_dispatch` trigger; the ref can be any branch.

   ```bash
   gh workflow run ci.yml --ref <branch> -f update_snapshots=true
   gh run list --workflow ci.yml --event workflow_dispatch --limit 1   # note the run id
   gh run watch <run-id>
   ```

2. Replace this folder's `__snapshots__` with the `visual-snapshots` artifact:

   ```bash
   rm -rf banterblogs-nextjs/e2e/__snapshots__
   gh run download <run-id> -n visual-snapshots -D banterblogs-nextjs/e2e/__snapshots__
   ```

3. Commit `e2e/__snapshots__/`. The first time, also set `VISUAL_SCREENSHOTS: "on"` in the `visual` job's `env` in `ci.yml`, in the same commit.

Regenerate the same way whenever a page changes on purpose, and review the new images before committing them.
