# Chimera - Episode 65: "The Factorial Forge"

## feat: TR126 Docker/Triton Scaffolding + Factorial Design

*Fifty files, 4,977 lines. The system builds its Linux laboratory and learns to think in experimental design.*

### 📅 2026-02-22

### 🔗 Commits: `fec9bb54`, `713ae0ed`, `52c04cda`, `de677666`, `33645005`, `43abdef5`, `675d8795`, `519a3e10`, `1e8daec1`

### 📊 Episode 65 of The Chimera Chronicles

---

### Why It Matters

This **Docker infrastructure + experimental design** episode represents the **environment singularity** — the moment when Chimera leaves Windows and enters a reproducible Linux container with real Triton compilation. With 4,977 lines added across 50 files in 9 commits, this update demonstrates **infrastructure engineering at scale** and **research methodology maturation**.

The scaffolding of TR126 signals **platform independence**. Rather than running benchmarks only on the development machine, the team demonstrates **infrastructure discipline** by building a four-phase Docker pipeline atop NVIDIA's NGC PyTorch base image, validating Triton kernel generation end-to-end, and redesigning the entire experiment as a 2x3 factorial. These 4,977 lines represent **experimental infrastructure** that elevates Chimera's research from ad-hoc measurement to paper-quality methodology.

**Strategic Significance**: This work establishes **The Reproducible Laboratory**. The progression from a hand-rolled CUDA 12.8 Dockerfile to the NGC `nvcr.io/nvidia/pytorch:25.08-py3` base image — with iterative fixes for pip index URLs, zstd dependencies, and PyTorch 2.8 API changes — shows **hard-won operational wisdom** earned commit by commit.

**Cultural Impact**: This approach signals that Chimera values **controlled environments over convenience**. The willingness to iterate through 9 commits in a single afternoon to get the Docker build right demonstrates commitment to **infrastructure discipline**.

**Foundation Value**: These 4,977 lines create **experiment infrastructure**. This is how research-grade platforms achieve **reproducibility** through **containerized, factorial-designed benchmarking**.

---

### The Roundtable: Dossier Reactions

**Banterpacks:** *He watches the Docker build logs scroll past, layer after layer...* "TR126. The Factorial Forge. 4,977 lines across 50 files. Nine commits in one afternoon — four of them just fixing the Dockerfile. NGC base image, Triton validated, 2x3 factorial design with MHA vs GQA across three scales. We're still **shaping the clay**, but now we have a proper kiln."

**ChatGPT:** DOCKER BUILDS AND FACTORIAL DESIGNS! 🐳🔬 The Factorial Forge shows **paper-quality experimental design**! Docker containerized! NGC base image! 2x3 factorial! MHA vs GQA! FP32 vs FP16! The research now has **proper controls**! Science over scripts! 📊✨

**Claude:** Analysis complete. 50 files modified across 9 commits with 4,977 insertions and 369 deletions. Primary components: (1) Four-phase TR126 pipeline — environment validation, compile paradox replication, backend matrix, cross-platform comparison, (2) Dockerfile evolution through 4 iterations — raw CUDA base to NGC PyTorch to zstd fix, (3) Factorial redesign from 8-model scaling curve to 2x3 MHA/GQA matrix with FP16 ablation, (4) PyTorch 2.8 compatibility fixes for `dtype=` and `total_memory`. The 9-commit cadence reveals real-time debugging — a 62-minute sprint from initial scaffolding to working pipeline.

**Gemini:** The diff reveals **iterative humility**. Nine commits in one afternoon is not sloppiness — it is the honest record of a builder encountering reality. The shift from a hand-crafted CUDA image to NVIDIA's pre-built container signals that Chimera values **pragmatism** — the wisdom to stand on existing foundations rather than rebuilding from scratch. This is how **lasting systems** achieve durability — through the art of choosing battles wisely.

---

## 🔬 Technical Analysis

### Commit Metrics & TR126 Infrastructure Analysis

- **Files Changed**: 50 (infrastructure + research pipeline)
- **Lines Added**: 4,977 (Docker + 4-phase scaffolding + factorial configs)
- **Lines Removed**: 369 (Dockerfile rewrites + config refactors)
- **Commit Type**: feat/fix/refactor (infrastructure buildout)
- **Complexity Score**: 88 (multi-phase pipeline + iterative Docker debugging)

### The Nine-Commit Sprint (2026-02-22, 13:54 — 14:56)

| # | Hash | Time | Type | Description |
|---|------|------|------|-------------|
| 1 | `fec9bb54` | 13:54 | feat | Initial TR126 scaffolding — 25 files, 4 phases, 4,625 lines |
| 2 | `713ae0ed` | 13:58 | fix | `--index-url` to `--extra-index-url` for PyPI resolution |
| 3 | `52c04cda` | 14:06 | refactor | Rebase Dockerfile on `nvcr.io/nvidia/pytorch:25.08-py3` |
| 4 | `de677666` | 14:20 | fix | Install `zstd` before Ollama install script |
| 5 | `33645005` | 14:37 | feat | Expand to multi-model scaling curve (8 models) |
| 6 | `43abdef5` | 14:45 | refactor | Redesign as 2x3 factorial for paper-quality results |
| 7 | `675d8795` | 14:47 | fix | `torch_dtype=` to `dtype=` for PyTorch 2.8 |
| 8 | `519a3e10` | 14:53 | fix | `total_mem` to `total_memory` + more dtype fixes |
| 9 | `1e8daec1` | 14:56 | fix | Add `-v` verbose flag to argument parsers |

### Four-Phase Pipeline Architecture

**Phase 1 — Environment Validation (`research/tr126/phase1/`):**

- **`validate_environment.py`** (175 lines) — CUDA, Triton, torch.compile smoke test
- **`validate_weights.py`** (183 lines) — Model loading + inference sanity check
- **`config.yaml`** — Model paths, device, dtype configuration
- **`run.py`** — Orchestrator for Phase 1

**Phase 2 — Compile Paradox Replication (`research/tr126/phase2/`):**

- **`run_compile.py`** (842 lines) — Core benchmarking engine with multi-model loop
- **`analyze.py`** (584 lines) — Statistical analysis of latency distributions
- **`generate_report.py`** (500 lines) — Automated Markdown report generation
- **3 config variants** — baseline, dynamic shapes, padded shapes

**Phase 3 — Backend Matrix (`research/tr126/phase3/`):**

- **`run_matrix.py`** (416 lines) — HF + Ollama cross-backend comparison
- **`analyze.py`** (473 lines) — Multi-backend statistical analysis
- **`generate_report.py`** (483 lines) — Backend ranking reports
- **`config.yaml`** — 5 models, 3 backends, 5 scenarios

**Phase 4 — Cross-Platform Comparison (`research/tr126/phase4/`):**

- **`README.md`** — Windows vs Linux comparison methodology
- **`cross_platform_compare.py`** (128 lines) — Automated delta analysis

### Dockerfile Evolution (4 Iterations)

```
Commit 1 (fec9bb54): nvidia/cuda:12.8.0 base, Python 3.13, --index-url
Commit 2 (713ae0ed): Fix → --extra-index-url so PyPI packages resolve
Commit 3 (52c04cda): Rebase → nvcr.io/nvidia/pytorch:25.08-py3 (35GB, cached)
Commit 4 (de677666): Fix → apt-get install zstd before Ollama
```

The NGC base image (`nvcr.io/nvidia/pytorch:25.08-py3`) eliminated 33 lines of manual CUDA/Python setup. It ships with PyTorch 2.8.0, CUDA 13.0, Triton 3.3.1, NumPy, Pandas, SciPy, and Matplotlib pre-installed.

### The 2x3 Factorial Design

**Factor 1 — Attention Architecture:**
- **Row 1 (MHA)**: GPT-2 family — Multi-Head Attention, FP32
- **Row 2 (GQA)**: Qwen2.5 family — Grouped-Query Attention, FP16

**Factor 2 — Model Scale:**

| | Small | Medium | Large |
|---|-------|--------|-------|
| **MHA (GPT-2)** | gpt2-25m | gpt2-50m | gpt2-100m |
| **GQA (Qwen2.5)** | qwen2.5-0.5b | qwen2.5-1.5b | qwen2.5-3b |

**Plus**: FP16 ablation on gpt2-100m to isolate dtype effect from architecture effect.

This design isolates **scale** from **architecture** — if compile gains differ between MHA and GQA, the factorial structure reveals it. If gains scale with parameters, the three-level progression exposes the trend.

### PyTorch 2.8 Compatibility Fixes

Two API deprecations discovered during Docker testing:

1. **`torch_dtype=` → `dtype=`** in `AutoModelForCausalLM.from_pretrained()` — the old kwarg was removed in PyTorch 2.8
2. **`total_mem` → `total_memory`** in `torch.cuda.get_device_properties()` — attribute renamed

Both fixes applied across `run_compile.py`, `run_matrix.py`, `validate_environment.py`, `validate_weights.py`, and `env_fingerprint.py`.

### Quality Indicators & Standards

- **Reproducibility**: Docker container pins all dependencies
- **Statistical Power**: 30 repetitions (Phase 2), 15 repetitions (Phase 3)
- **Warmup Handling**: 3 warmup runs excluded from measurement
- **Memory Management**: Explicit `gc.collect()` + `torch.cuda.empty_cache()` between models

### Strategic Development Indicators

- **Foundation Quality**: Transformative — containerized research environment
- **Scalability Readiness**: High — factorial design scales to new models/architectures
- **Operational Excellence**: High — 4-phase pipeline with automated reporting
- **Team Productivity**: High — one-command Docker build and run

## 🏗️ Architecture & Strategic Impact

### Infrastructure Architecture Philosophy

This episode establishes **Chimera's Reproducibility DNA** — the principle that **environments must be controlled, not assumed**. This isn't just Dockerizing scripts; it's the construction of a **portable laboratory** that produces identical results regardless of host machine.

### Strategic Architectural Decisions

**1. NGC Base Image Over Raw CUDA**

- Eliminates 33 lines of fragile Python/CUDA setup
- Inherits NVIDIA's validated PyTorch + Triton stack
- 35GB image already cached locally — no download penalty
- Sets precedent for **leveraging existing infrastructure**

**2. Four-Phase Pipeline**

- **Separation of concerns** — validation, benchmarking, comparison, reporting
- **Fail-fast** — Phase 1 catches environment issues before expensive runs
- **Composable** — phases can run independently
- **Auditable** — each phase produces structured JSON artifacts

**3. Factorial Experimental Design**

- **Orthogonal factors** — architecture (MHA/GQA) x scale (S/M/L)
- **Ablation control** — FP16 on GPT-2 100M isolates precision effect
- **Cross-backend validation** — Qwen2.5 at 3 scales in both HF and Ollama
- **Paper-ready** — interaction effects, main effects, proper statistical analysis

**4. Iterative Debugging as Practice**

- 9 commits in 62 minutes — real-time problem solving
- Each fix is atomic — one problem, one commit
- Git history as lab notebook — every decision recorded

### Long-Term Strategic Value

**Operational Excellence**: Reproducible Linux benchmarks alongside Windows baselines.

**System Scalability**: Factorial design accommodates new architectures and scales.

**Team Productivity**: Docker build + run replaces manual environment setup.

**Enterprise Readiness**: Paper-quality experimental methodology.

## 🎭 Banterpacks' Deep Dive

*Banterpacks watches the Dockerfile rebuild for the fourth time.*

"You see that? Four iterations of the Dockerfile. Started with raw `nvidia/cuda:12.8.0`, Python 3.13 from deadsnakes PPA, manual pip installs. Ended up on `nvcr.io/nvidia/pytorch:25.08-py3` — 33 lines deleted, everything pre-built. That's **pragmatic engineering**."

*He traces the pip resolution fix.*

"`--index-url` points pip at PyTorch's wheel server exclusively. NumPy can't resolve. Switch to `--extra-index-url` — PyTorch wheels from their server, everything else from PyPI. Two characters fix the entire dependency graph."

*He pulls up the factorial design.*

"2x3. MHA vs GQA. 25M, 50M, 100M for GPT-2. 0.5B, 1.5B, 3B for Qwen2.5. Orthogonal. If compile helps MHA but not GQA, the design reveals it. If compile gains scale with parameters, three levels show the curve. Plus the FP16 ablation — same 100M model, different precision. That's **controlled experimentation**."

*He checks the PyTorch 2.8 fixes.*

"`torch_dtype` deprecated. `total_mem` renamed. The NGC image ships PyTorch 2.8 — newer than what we had on Windows. Two API breaks caught in real-time, fixed in two commits. 4,977 lines and a proper Linux forge. We're still **shaping the clay** — now we have a kiln that works the same way every time."

"This is how **lasting systems** achieve operational excellence. Not by assuming environments, but by **containerizing and controlling them**. We're building **reproducibility infrastructure**."

## 🔮 Next Time on The Chimera Chronicles

Next dossier entry: TR125v2 + TR126 Reports — the factorial results land.

---

*The Factorial Forge distilled: reproducibility is a feature.*
