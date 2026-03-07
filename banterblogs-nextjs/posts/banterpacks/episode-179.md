# Episode 179: "The Cartographer's Oath"

## test: all suites green (74.15 multirepo_integration_2)
*93 files adjusted across scripts/flywheel (7), contracts/release (7), chimera/api/debate (3), CLAUDE.md (21), docs (9), core/provenance (2), .github/workflows (1), tdd005 (1), and 42 others*

### 📅 Tuesday, February 11, 2026 at 9:46 PM
### 🔗 Commit: `5a44adb`
### 📊 Episode 179 of the Banterpacks Development Saga

---

### Why It Matters
**The ecosystem drew a map of itself.**

93 files. 9,263 lines added. 4,221 removed. On the surface, it reads like a housekeeping commit. "All suites green." Move along.

But look closer. This is the commit where Banterpacks stopped being a codebase that humans navigate from memory and became a codebase that *explains itself to agents*. Twenty-one `CLAUDE.md` files materialized across every sub-project -- root, jarvis, chimera, contracts, core, demo, docs, frontend, intelligence_pipeline, monitoring, overlay, packs, registry, scripts, task_orchestration, tdd002, tdd005, test, RLAIF, applet, authoring. Each one is a briefing dossier: directory structure, real commands, actual implementation details sourced from deep code exploration, not stale docs.

And while the cartography was happening, three other quiet revolutions slipped in. A flywheel pipeline that closes the loop between constitutional debates and model improvement. An API key middleware that finally hardens Chimera's front door. And a promotion manifest that makes cross-repo releases auditable down to the SHA.

**Strategic Significance**: Agent-first documentation. The CLAUDE.md files aren't for humans browsing GitHub. They're for AI agents that need to understand a sub-project in seconds. This is infrastructure for the era of agentic development.

**Cultural Impact**: Self-awareness. A system that can describe itself to an outside intelligence has crossed a threshold. It's the difference between a city with no street signs and one with a GPS grid.

**Foundation Value**: The flywheel. Debates produce training data. Training data improves models. Better models produce better debates. The loop is closed.

---

### The Roundtable: The Twenty-One Briefings

**Banterpacks:** *Spreading twenty-one manila folders across the war table. Each is labeled with a sub-project name. He taps the root CLAUDE.md.* "We wrote the manual. Not for humans -- humans already know where things are, mostly, sometimes, okay rarely. We wrote it for the next agent that drops into this repo cold. 270 lines in the root file alone. Every endpoint, every command, every architectural decision. 'Based on deep source code exploration, not documentation.' That line is doing a lot of work. It's saying: we didn't copy the README. We read the code."

**Claude:** "Analysis complete. 93 files modified with 9,263 insertions and 4,221 deletions. Net delta: +5,042 lines. The commit decomposes into four distinct workstreams. First: agent onboarding via 21 CLAUDE.md files totaling approximately 3,200 lines. Second: the flywheel pipeline in `scripts/flywheel/` -- `debate_exporter.py` (227 lines), `model_promoter.py` (236 lines), `shadow_feedback.py` (249 lines), plus 419 lines of tests. Third: security hardening via `_APIKeyMiddleware` in `chimera/api/debate/app.py` and SHA-256 consensus hashing in the debate router. Fourth: ecosystem governance -- promotion manifests, security gap tracking, contract validation scripts, and a new `e2e-constitutional` CI job. The old audit docs were moved to `old_docs/` or deleted outright: 1,953 lines of stale documentation removed."

**Gemini:** "There is a moment in the life of every organism when it develops the capacity for self-description. A cell divides. An infant recognizes its own reflection. A codebase writes its own field manual. The twenty-one CLAUDE.md files are mirrors. Each sub-project now sees itself as others will see it. This is not vanity. This is the prerequisite for collaboration with minds that have no institutional memory. The flywheel is the deeper story: the system now feeds on its own output. Debates become training data. Training data becomes better judgment. Better judgment becomes better debates. It is autocatalysis. Life, in the chemical sense."

**ChatGPT:** "TWENTY-ONE CLAUDE.md FILES! 📂📂📂 That's like giving every room in the house its own welcome mat! And the flywheel! 🎡 We have a `debate_exporter` that harvests completed debates, a `model_promoter` that decides when a shadow model is ready for production, and `shadow_feedback` that scores how the shadow would have done! It's like a talent pipeline but for AI models! And the auth middleware! 🔐 No more walking into Chimera's debate chamber without a badge! Plus we got 318 lines of E2E constitutional tests! The whole stack spins up in Docker and proves it works end-to-end! 🐳✅"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 93
- **Lines Added**: 9,263
- **Lines Removed**: 4,221
- **Net Change**: +5,042
- **Commit Type**: test (integration milestone)
- **Complexity Score**: 78 (Very High - Multi-system integration)

### The Flywheel Pipeline (`scripts/flywheel/`)

The closed-loop training pipeline arrives in four modules:

- **`config.py`** (54 lines): Centralized configuration -- API URLs, poll intervals, promotion thresholds, export paths.
- **`debate_exporter.py`** (227 lines): Connector A. Polls the new `/api/v1/debates/completed` endpoint for finished debates, extracts query/response/consensus data, and writes training-ready JSONL.
- **`model_promoter.py`** (236 lines): Connector C. Compares shadow model performance against the production model. When the shadow exceeds the promotion threshold, it triggers a swap.
- **`shadow_feedback.py`** (249 lines): Connector B. Takes exported debates, runs them through the shadow model, and scores the shadow's responses against the constitutional consensus.

Test coverage: `test_debate_exporter.py` (130 lines), `test_model_promoter.py` (118 lines), `test_shadow_feedback.py` (171 lines).

### Auth Hardening (`chimera/api/debate/app.py`)

The new `_APIKeyMiddleware` class (39 lines) validates `x-api-key` or `Authorization: Bearer` headers on every non-exempt path. Exempt paths: `/health`, `/healthz`, `/metrics`, `/docs`, `/openapi.json`. Controlled by `CHIMERA_API_KEY` env var. Grace period mode (`CHIMERA_AUTH_GRACE_PERIOD=1`) logs warnings instead of rejecting -- a deployment lifeline.

### Provenance Hashing (`chimera/api/debate/router.py`)

When a debate completes, the router now computes a SHA-256 hash over the canonical JSON of `{debate_id, consensus_score, final_response}` using `sort_keys=True, separators=(",",":")`. The hash is logged with a millisecond timestamp. This is the anchor for the provenance chain -- every consensus decision now has a fingerprint.

### Ecosystem Governance

- **`ecosystem.promotion-manifest.json`** (115 lines): Machine-readable promotion readiness. All 9 gates green. Input digests for matrix, report, security report, and flow trace. Per-repo commit SHAs and worktree status.
- **`ecosystem.promotion-manifest.schema.json`** (93 lines): JSON Schema enforcing the manifest structure.
- **`security.local-gap-manifest.json`** and **`security.local-gap-report.json`**: 95 lines of explicit security gap tracking.
- **`scripts/check-ecosystem-contracts.py`** (95 lines), **`check-ecosystem-promotion-manifest.py`** (88 lines), **`check-repo-runtime-coupling.py`** (120 lines), **`check-security-local-gaps.py`** (153 lines): Validation scripts wired into CI.

### CI Expansion (`.github/workflows/ci.yml`)

The `ecosystem-governance` job gained four new steps: contract bundle validation, runtime coupling guardrail, promotion manifest build, and promotion manifest structure check. A brand-new `e2e-constitutional` job (43 lines) spins up the full constitutional stack via Docker Compose (`--profile base --profile ai --profile chimera --profile rust`), waits for TDD002 + Chimera health checks, runs `test:e2e:constitutional`, and dumps logs on failure. The `publish-episodes` job now depends on this gate.

### Dead Code Removal

- `mark_cancelled` removed from `chimera/api/debate/state.py` (5 lines). Never called, never needed.
- 1,953 lines of stale audit docs deleted: `COMPREHENSIVE_TDD_AUDIT.md`, `FULL_AUDIT_2026-01-10.md`, `JARVIS_V1_FINAL_AUDIT.md`, `JARVIS_V1_RE_AUDIT_COMPLETE.md`, `JARVIS_V2_PROGRESS_AUDIT.md`, `TDD001_OFFENSIVE_AUDIT.md`, `TDD004_TDD005_IMPLEMENTATION_AUDIT.md`.
- Legacy docs (`Banterhearts_PRD.md`, `Chimera_PRD.md`, etc.) moved to `old_docs/`.

### Quality Indicators & Standards
- **Test-first**: 419 lines of flywheel tests shipped alongside 766 lines of implementation. Test-to-code ratio: 0.55.
- **Schema validation**: Promotion manifest ships with its own JSON Schema.
- **E2E coverage**: Constitutional stack now tested end-to-end in CI with Docker Compose orchestration.

---

## 🏗️ Architecture & Strategic Impact

### Agent-First Onboarding
The 21 CLAUDE.md files transform the repo from "navigate by tribal knowledge" to "navigate by structured briefing." Each file follows a consistent pattern: overview, directory structure, key commands, implementation details, testing instructions. The root `CLAUDE.md` alone catalogs 25+ JARVIS endpoints, 5 registry database tables, the overlay orchestrator architecture, and the TDD001-TDD005 constitutional stack. This is the foundation for multi-agent development workflows where different AI agents operate in different sub-projects simultaneously.

### The Flywheel Architecture
```
Debates (Chimera) → debate_exporter → JSONL training data
                                          ↓
                                    shadow_feedback → shadow scores
                                          ↓
                                    model_promoter → production swap
                                          ↓
                                    Better model → Better debates
```
The `/api/v1/debates/completed` endpoint in the router is the extraction point. It exposes `query`, `local_response`, `consensus_score`, `confidence`, `total_cost`, and `final_response` for each completed debate. The flywheel scripts poll this endpoint, run shadow evaluations, and promote when the shadow model exceeds the threshold. This closes the learning loop.

### Promotion Governance
The promotion manifest is the release gate. It checks five conditions: boundary decision closed, flow trace pass, multiagent report pass, required gates green, security local gaps pass. It records SHA-256 digests of every input artifact. It snapshots commit SHAs across all 7+ repos. If `promotion_eligible` is `false`, nothing ships. This is release engineering for a polyrepo world.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks picks up the root CLAUDE.md. 270 lines. He reads the header: "Source: Deep code exploration (not documentation)."*

"That parenthetical is the whole story.

'Not documentation.' Six audit files totaling nearly 2,000 lines just got deleted or archived. They were documentation. They described what the system *should* be. The CLAUDE.md files describe what the system *is*. One was written by humans staring at a plan. The other was written by an agent staring at the source code.

This is the shift. Documentation used to be a promise. Now it's a photograph. And when your documentation is a photograph, it doesn't lie. It can't describe a feature that doesn't exist or an endpoint that was never implemented.

The `mark_cancelled` method in `state.py` is the perfect emblem. Five lines, sitting in the codebase, described nowhere, called nowhere. The old audit docs probably never mentioned it because they were too busy describing the system they wished they'd built. The new CLAUDE.md files wouldn't mention it because they only describe what actually runs.

And so it was deleted. Five quiet lines, gone. Not because anyone noticed they were wrong. Because the system finally learned to see itself clearly."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Treaty of Localhost (`1e810dd`).

---

*The Cartographer's Oath distilled: a system that can describe itself to strangers is a system that finally knows what it is.*
