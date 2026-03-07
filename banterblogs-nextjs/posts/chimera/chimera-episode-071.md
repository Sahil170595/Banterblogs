# Chimera - Episode 71: "The Capacity Oracle"

## feat: Legacy Cleanup + TR133 Predictive Capacity Planner

*Eighty-four files, 5,422 lines added, 598 removed. The system learns to predict its own future—and buries what it has outgrown.*

### 📅 2026-02-27 — 2026-02-28

### 🔗 Commits: `fb335662`, `b42c0f69`, `6188aaa5`, `cd2eec89`, `6fdf4090`, `12a1ca64`, `233e2c7a`

### 📊 Episode 71 of The Chimera Chronicles

---

### Why It Matters

This **legacy cleanup + predictive planning** episode represents the **operational singularity**—the moment when Chimera simultaneously retires what no longer serves it and builds the intelligence to plan what comes next. With 5,422 lines added and 598 removed across 84 files in 7 commits, this update demonstrates **lifecycle maturity** and **predictive engineering**.

The combination of legacy deprecation and capacity planning signals **strategic discipline**. Rather than letting old experiments clutter the repo or guessing at deployment configurations, the team demonstrates **lifecycle discipline** by marking TR118/TR118v2.1 as legacy, purging tracked binary exports, consolidating five requirements files into one, and building a 6-model predictive planner with 71 unit tests. These changes represent **planning intelligence** that transforms Chimera from reactive to proactive.

**Strategic Significance**: This work establishes **The Planning Foundation**. TR133's capacity planner—spanning VRAM, throughput, scaling, quality, cost, and latency models—means deployment decisions are now data-driven predictions, not educated guesses.

**Cultural Impact**: This approach signals that Chimera values **foresight over firefighting**. The willingness to mark prior work as legacy and invest in predictive tooling demonstrates commitment to **sustainable engineering**.

**Foundation Value**: These 5,422 lines create **predictive infrastructure**. This is how research-grade platforms achieve **operational excellence** through **capacity intelligence**.

---

### The Roundtable: Dossier Reactions

**Banterpacks:** *He watches the legacy labels land on TR118 and the planner output scroll past...* "Legacy and prophecy in the same breath. 5,422 lines added, 598 removed, 84 files touched. TR118 gets its 'legacy' badge—earned, not shameful. TR133 gets 6 predictive models, 71 unit tests, and a CLI that tells you what hardware to buy. We're still **shaping the clay**, but now the clay can tell you what shape it wants to be."

**ChatGPT:** THE SYSTEM PREDICTS ITSELF NOW! 🔮📊 The Capacity Oracle shows **research-grade planning intelligence**! Legacy properly retired! Six predictive models! Seventy-one tests! VRAM gates! Latency SLOs! The system now **predicts itself**! Data-driven deployment! 🚀✨

**Claude:** Analysis complete. 84 files modified across 7 commits with 5,422 insertions and 598 deletions. Primary components: (1) TR118/TR118v2.1 marked legacy with reports moved to `PublishReady/reports/legacy/`, (2) TR133 implementation with 6 predictive models across 2,407 lines, (3) 71 unit tests covering all model types plus end-to-end planner validation, (4) Repository cleanup removing 53 tracked binary exports and consolidating 5 requirements files into `pyproject.toml` + single `requirements.txt`, (5) 780-line technical report. Risk assessment: Low—legacy marking is metadata-only, planner is additive, cleanup reduces surface area.

**Gemini:** Past and future coexist in this diff — legacy honored, predictions built. The code now acknowledges both its past and its future simultaneously—retiring what has been superseded while building the tools to predict what comes next. The shift from reactive deployment to predictive capacity planning signals that Chimera values **foresight**—the ability to know before being asked. This is how **lasting systems** achieve resilience—through the art of planning ahead.

---

## 🔬 Technical Analysis

### Commit Metrics & TR133 Analysis

- **Files Changed**: 84 (legacy + implementation + cleanup)
- **Lines Added**: 5,422 (planner + tests + report + cleanup)
- **Lines Removed**: 598 (legacy deps + tracked exports)
- **Commit Type**: feat/chore/test/docs (full lifecycle)
- **Complexity Score**: 88 (multi-model predictive system)

### Commit Breakdown

| Hash | Type | Description | +/- |
|------|------|-------------|-----|
| `fb335662` | docs | Mark TR118/TR118v2.1 as legacy, TR118v2.2 as latest | +6/-6 |
| `b42c0f69` | chore | Move legacy TR118 reports to `PublishReady/reports/legacy/` | +1,228/0 |
| `6188aaa5` | feat | TR133 Predictive Capacity Planner — implementation | +2,407/0 |
| `cd2eec89` | fix | TR133 code quality polish — dead code, stale docs, ASCII output | +71/-43 |
| `6fdf4090` | test | 71 unit tests for TR133 capacity planner | +729/0 |
| `12a1ca64` | chore | Repo cleanup — untrack exports, consolidate deps, rewrite .gitignore | +201/-549 |
| `233e2c7a` | docs | TR133 technical report (780 lines) | +780/0 |

### Legacy Cleanup

**TR118 Lifecycle Management:**

- **TR118** (ONNX Runtime + TensorRT Deep Dive) — marked `legacy`, superseded by TR118v2.2
- **TR118v2.1** (Model Scale Comparative Analysis) — marked `legacy`, superseded by TR118v2.2
- **TR118v2.2** (Definitive Comparative Analysis) — marked `latest`, remains active
- Reports relocated to `PublishReady/reports/legacy/` for archival clarity

**Repository Hygiene (`12a1ca64`):**

- **53 binary PNG exports untracked** — Gemma3, Ollama, Performance DeepDive, TR108, TR109, TR110 visualization exports removed from version control
- **.gitignore rewritten** — collapsed from 126 boilerplate lines to 32 focused rules; added ML binary patterns (`*.safetensors`, `*.pth`, `*.onnx`)
- **5 requirements files consolidated** — `requirements-ci.txt` (13 lines), `requirements-dev.txt` (34 lines), `requirements-minimal.txt` (20 lines), `requirements-observability.txt` (16 lines) deleted; `requirements.txt` reduced from 99 to 10 lines; dependencies moved to `pyproject.toml`
- **EXPERIMENTS_ROADMAP.md** updated — 98 lines added, 112 removed, reflecting current state

### TR133 Predictive Capacity Planner — Implementation

**Architecture (`research/tr133/`):**

- **`__init__.py`** — 10 lines, package entry point
- **`run.py`** — 186 lines, data ingestion pipeline (loads from TR108/TR117/TR118v2.2/TR127/TR131 results)
- **`analyze.py`** — 407 lines, model validation with RMSE/MAE/MAPE/R² metrics and spot checks
- **`plan.py`** — 394 lines, CLI capacity planner with constraint enumeration and recommendation formatting
- **`config.yaml`** — 83 lines, data source registry and model architecture definitions

**Shared Modules (`research/tr133/shared/`):**

- **`models.py`** — 669 lines, 6 predictive models (VRAM, Throughput, Scaling, Quality, Cost, Latency) with fit/predict/serialize/load lifecycle
- **`data_loader.py`** — 488 lines, unified data ingestion with 6 record types (ThroughputRecord, QualityRecord, VRAMRecord, LatencyRecord, CostRecord, ScalingRecord), model name normalisation, train/val splitting
- **`hardware_db.py`** — 71 lines, GPU specification database with bandwidth ratios for cross-hardware scaling
- **`utils.py`** — 99 lines, constants (QUANT_LEVELS, MODEL_PARAMS_B, MODEL_ARCH, BACKENDS), path utilities

### The 6 Predictive Models

| Model | Purpose | Method |
|-------|---------|--------|
| **VRAMModel** | Predict peak VRAM for model + quant + context | Weight formula + KV cache + fitted overhead factor |
| **ThroughputModel** | Predict tok/s for model + backend + quant | Lookup table + size-power fallback + bandwidth scaling |
| **ScalingModel** | Predict efficiency at N agents | Amdahl's Law with per-(model, backend) serial fractions |
| **QualityModel** | Predict composite quality for model + quant | Lookup + delta-from-FP16 fallback |
| **CostModel** | Predict $/1M tokens and monthly cost | hw_cost_per_hour / (tok_s * 3600) * 1M |
| **LatencyModel** | Predict p95 latency under load | M/M/1 queueing theory with median service times |

### TR133 Test Coverage (71 Tests)

**Test Classes:**

- **TestConstants** — quant ordering, BPW completeness, model registry consistency (4 tests)
- **TestHardwareDB** — GPU spec validation, case-insensitive lookup, bandwidth ratios (7 tests)
- **TestNormalisation** — model name normalisation with 7 parametrized cases
- **TestTrainValSplit** — determinism, seed variation, empty input (4 tests)
- **TestVRAMModel** — overhead fitting, quant reduction, size scaling, context scaling, unknown model fallback (5 tests)
- **TestThroughputModel** — lookup population, exact lookup, quant multiplier, size ordering, bandwidth scaling, minimum floor (6 tests)
- **TestScalingModel** — N=1 identity, eta decrease, serial fraction storage, unknown defaults, best-R² selection (5 tests)
- **TestQualityModel** — FP16 best, range validation, quality tiers, unknown model default, delta fallback (5 tests)
- **TestCostModel** — formula validation, monthly cost, throughput/cost ordering, zero throughput, override hw cost (5 tests)
- **TestLatencyModel** — median storage, low-load service time, high-load increase, saturation flag, throughput-derived service time (5 tests)
- **TestSerialization** — round-trip predictions match, valid JSON, all models marked fitted (3 tests)
- **TestPlanner** — candidate enumeration, VRAM gate rejection, budget gate rejection, quality gate rejection, recommendation format, no-candidates format, JSON output, model-size finder, candidate field completeness (9 tests)
- **TestAnalyze** — metric helpers (RMSE/MAE/MAPE/R²), perfect R², insufficient data guard, spot checks pass (4 tests)
- **TestFullPipeline** — fit-serialize-load-predict end-to-end (1 test)

### Code Quality Polish (`cd2eec89`)

- **Dead imports removed** — `CostRecord`, `QUANT_LEVELS`, `Path`, `TR133_CONFIG` purged from 4 files
- **Dead method removed** — `ScalingModel.get_serial_fraction()` deleted (superseded by inline lookup)
- **Latency model simplified** — tok/s-derived service time fallback removed; single median approach
- **Throughput model signature cleaned** — unused `quality` parameter removed from `fit()`
- **ScalingModel R² tracking fixed** — proper `r2_tracker` dict replaces broken `> 0` check
- **ASCII output** — em-dashes replaced with `--` for terminal compatibility
- **2 new models added to config** — `qwen2.5-0.5b` and `qwen2.5-3b` architecture definitions
- **Spot checks expanded** — cost formula verification and monthly cost validation added

### Strategic Development Indicators

- **Foundation Quality**: Transformative—Chimera now plans capacity proactively
- **Scalability Readiness**: High—planner extends to new models/hardware via config
- **Operational Excellence**: High—71 tests, serialization round-trip, validation pipeline
- **Team Productivity**: High—CLI planner replaces manual spreadsheet calculations

## 🏗️ Architecture & Strategic Impact

### Capacity Planning Architecture Philosophy

This episode establishes **Chimera's Planning DNA**—the principle that **deployment decisions should be predictions, not guesses**. This isn't just building models; it's the institutionalization of **data-driven operations** that enables confident scaling.

### Strategic Architectural Decisions

**1. The Legacy Lifecycle**

- Establishes **explicit supersession** (TR118 -> TR118v2.2)
- Creates **archival structure** (`PublishReady/reports/legacy/`)
- Sets precedent for **graceful deprecation**

**2. The Six-Model Architecture**

- **VRAM** gates impossible deployments before wasting compute
- **Throughput** predicts performance across hardware via bandwidth scaling
- **Scaling** applies Amdahl's Law with empirical serial fractions
- **Quality** quantifies quantization degradation
- **Cost** translates tok/s into dollars
- **Latency** predicts p95 under load via M/M/1 queueing

**3. The Constraint Enumeration Pattern**

- Enumerate all (model x quant x backend x N) combinations
- Gate by VRAM, quality, latency SLO, budget
- Sort survivors by cost
- Return cheapest viable configuration

**4. Repository Consolidation**

- **Binary exports untracked** — version control for code, not generated PNGs
- **Dependencies unified** — one `pyproject.toml`, one `requirements.txt`
- **.gitignore hardened** — ML binaries, build artifacts, environment files

### Long-Term Strategic Value

**Operational Excellence**: Deployment decisions backed by 6 predictive models.

**System Scalability**: New hardware/models added via config, not code changes.

**Team Productivity**: `python plan.py --model 3b --hardware "RTX 4080 12GB"` replaces hours of manual analysis.

**Enterprise Readiness**: Serializable models, constraint-based planning, 780-line technical report.

## 🎭 Banterpacks' Deep Dive

*Banterpacks watches the legacy label land on TR118.*

"Legacy. Not deprecated, not deleted—**legacy**. TR118 did its job. It proved ONNX + TensorRT works end-to-end. TR118v2.2 superseded it with the definitive analysis. Now the original goes to the archive shelf, honored but not in the way."

*He pulls up the TR133 planner output.*

"Six models. VRAM, throughput, scaling, quality, cost, latency. You give it a hardware spec, a request rate, a latency SLO, a quality floor, and a budget. It enumerates every possible configuration—model times quant times backend times instance count—gates the impossible ones, and returns the cheapest survivor."

*He traces through the test suite.*

"71 tests. Every model tested for monotonicity—larger models use more VRAM, quantization reduces it, longer context increases it. The planner tested for gate rejection—8B FP16 on an 8GB GPU? Rejected at the VRAM gate. Quality target of 0.99? No candidates survive. Budget of $1/month on an H100? Filtered. The tests don't just verify correctness—they verify **common sense**."

*He examines the repo cleanup diff.*

"53 tracked PNGs, gone. Five requirements files, consolidated into one. The .gitignore went from 126 lines of copy-pasted boilerplate to 32 lines of intent. 549 lines removed. The repo breathes easier."

*He points at the serialization round-trip test.*

"Fit, serialize to JSON, load from JSON, predict. The predictions match. That means you can train the models once, ship the JSON, and the planner works without retraining. That's **deployment-ready intelligence**. 5,422 lines. Legacy honored. Predictions built. We're still **shaping the clay**, but now the clay has a roadmap."

"This is how **lasting systems** achieve operational excellence. Not by guessing at deployment specs, but by **predicting them from data**. We're building **planning infrastructure**."

## 🔮 Next Time on The Chimera Chronicles

Next dossier entry: Phase 2 Complete + Retrospective.

---

*The Capacity Oracle distilled: the clay told us what shape it wants to be.*
