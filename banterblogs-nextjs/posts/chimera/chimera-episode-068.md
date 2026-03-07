# Chimera - Episode 68: "The Two Regimes"

## feat: TR127 Long-Context Performance Characterization

*Fifteen files, 5,362 lines. The system learns that scaling has two faces—clean computation and memory catastrophe.*

### 📅 2026-02-24

### 🔗 Commits: `60e7e405`, `eabc891f`, `6512a68a`, `85c8c6d4`, `1632dd7b`

### 📊 Episode 68 of The Chimera Chronicles

---

### Why It Matters

This **long-context performance characterization** episode represents the **scaling truth singularity**—the moment when Chimera stops treating context-length scaling as a single curve and discovers it is two entirely different phenomena. With 5,362 lines added across 15 files, this update demonstrates **two-regime analytical mastery** and **publish-grade statistical rigor**.

The implementation of TR127 signals **empirical sophistication**. Rather than fitting a single power law to the full context range and calling it "quadratic attention," the team demonstrates **analytical decomposition** by separating clean computational scaling from VRAM thrashing artifacts. These 5,362 lines represent **analytical intelligence** that prevents the most dangerous mistake in performance research: confusing infrastructure collapse with algorithmic complexity.

**Strategic Significance**: This work establishes **The Two-Regime Standard**. The discovery that HF transformers' apparent superlinear scaling is actually VRAM spillover to system RAM—not O(n^2) attention—saves the project from a fundamental misattribution that would have poisoned every optimization decision downstream.

**Cultural Impact**: This approach signals that Chimera values **decomposition over aggregation**. The willingness to split a convenient narrative into its true components demonstrates commitment to **honest measurement**.

**Foundation Value**: These 5,362 lines create **scaling characterization infrastructure**. This is how research-grade platforms achieve **clarity** through **regime-aware analysis**.

---

### The Roundtable: Dossier Reactions

**Banterpacks:** *He stares at two curves on the same plot—one smooth, one vertical...* "TR127. Two Regimes. 5,362 lines of scaling truth. Below the spillover threshold: clean power-law, low exponents, the GPU doing its job. Above it: 25-100x latency cliff from PCIe-bound paging. One curve looked superlinear. Two curves tell the real story. We're still **shaping the clay**, but now we know where the clay ends and the kiln cracks begin."

**ChatGPT:** ONE CURVE WAS HIDING TWO TRUTHS! 🔍📈 The Two Regimes show **research-grade scaling decomposition**! Clean fits separated from VRAM catastrophe! Publish-ready report generated! Nine rigor gaps fixed! The system now **sees through its own data**! Truth over convenience! 🎯✨

**Claude:** Analysis complete. 15 files modified with 5,362 insertions and 274 deletions across 5 commits. Primary components: (1) `run_context_sweep.py` with 621-line context-length sweep runner, (2) `analyze.py` with two-regime fitting separating pre-thrashing from post-spillover data, (3) `generate_report.py` producing publish-ready markdown with per-stratum power analysis, (4) Quality audit addressing 9 statistical gaps including per-context-length outlier detection and stratified power analysis. Risk assessment: Low—the analytical framework is purely additive and the two-regime decomposition is methodologically sound.

**Gemini:** A single curve, the diff teaches us, can be the most convincing lie in performance engineering. The code now acknowledges that a single model can hide two truths. The shift from aggregation to decomposition signals that Chimera values **precision**—the discipline to split what appears unified into its true components. This is how **lasting systems** achieve understanding—through the art of honest separation.

---

## 🔬 Technical Analysis

### Commit Metrics & TR127 Analysis

- **Files Changed**: 15 (research + publish-ready report)
- **Lines Added**: 5,362 (implementation + analysis + report)
- **Lines Removed**: 274 (refactors for rigor)
- **Commit Type**: feat + fix (research characterization + quality audit)
- **Complexity Score**: 92 (two-regime decomposition + statistical rigor)

### TR127 Implementation Components

**Context Sweep Runner (`research/tr127/run_context_sweep.py`):**

- **621 lines** of automated context-length sweep execution
- Sweeps across configurable context lengths (512 to 32K tokens)
- Captures prefill latency, decode latency, TTFT, VRAM peak allocation
- Records `torch.cuda.max_memory_allocated()` including Unified Memory spillover
- Multiple repetitions per context length for statistical significance

**Analysis Engine (`research/tr127/analyze.py`):**

- **526 lines** initial implementation, refined across 3 commits
- **Power-law fit**: `latency = a * ctx^b` with R^2 goodness-of-fit
- **Linear fit**: `latency = a * ctx + b` for sub-linear backends
- **Quadratic fit**: `a * ctx^2 + b * ctx + c` added in two-regime commit
- **Thrashing threshold detection**: identifies context length where CUDA allocation exceeds physical GPU VRAM (12 GB)
- **Clean scaling extraction**: fits only pre-spillover data points for true computational scaling
- **Thrashing multiplier**: ratio of first post-spillover latency to last clean latency
- **Per-context-length outlier detection**: replaces pooled IQR with stratified detection
- **Stratified power analysis**: per model x backend instead of single pooled number

**Configuration (`research/tr127/config.yaml`):**

- **56 lines** defining sweep parameters
- Context lengths, repetitions, backends, model specifications
- GPU VRAM threshold configuration

**Report Generator (`research/tr127/generate_report.py`):**

- **755 lines** initial, evolved to produce two-regime tables
- Full-range fit table with power-law, quadratic, and linear R^2
- Pre-thrashing fit table showing true computational scaling
- CUDA allocation tables with in-GPU status and spillover indicators
- Per-stratum detectable effect sizes replacing single pooled number
- Per-context CV% measurement precision tables

**Publish-Ready Report (`PublishReady/reports/Technical_Report_127.md`):**

- **1,300-line** comprehensive technical report
- Two-regime conclusions with clean scaling vs. thrashing analysis
- VRAM spillover characterization with KV cache cost estimates
- Production guidance for context-length deployment decisions

**Shared Utilities (`research/tr127/shared/utils.py`):**

- **150 lines** of shared analysis utilities
- Outlier detection (IQR method)
- Statistical summary functions (min, max, mean, p50, p95, p99)

### The Two-Regime Discovery

**Regime 1 — Clean Computational Scaling (Pre-Spillover):**

| Property | Value |
|----------|-------|
| Context Range | 512 to spillover threshold |
| Behavior | Low power-law exponent (b < 1.2) |
| Cause | True GPU compute cost |
| Fit Quality | High R^2 on quadratic and power-law |

**Regime 2 — VRAM Thrashing (Post-Spillover):**

| Property | Value |
|----------|-------|
| Context Range | Spillover threshold to OOM |
| Behavior | 25-100x latency cliff |
| Cause | CUDA Unified Memory paging to system RAM via PCIe |
| Fit Quality | Full-range exponents inflated by paging artifacts |

**The Separation Logic:**

```
CUDA allocation at context_length C:
  if max_memory_allocated(C) <= GPU_VRAM_MB:
    → Clean regime: true computational scaling
  if max_memory_allocated(C) > GPU_VRAM_MB:
    → Thrashing regime: PCIe-bound system RAM paging
    → Latency dominated by memory bus, not compute
```

### Quality Audit — 9 Statistical Rigor Gaps

The quality audit (`85c8c6d4`) addressed systematic methodological weaknesses:

1. **Pooled outlier detection** → Per-context-length IQR (avoids false positives from mixing 50ms and 470,000ms measurements)
2. **Single pooled power analysis** → Per-stratum detectable effect sizes
3. **Missing quadratic fit** → Added `np.polyfit(ctx, lat, 2)` alongside power-law and linear
4. **No VRAM spillover detection** → `spillover_threshold` and `spillover_ratio` fields
5. **No KV cache cost estimation** → Linear regression on in-GPU VRAM growth
6. **Undifferentiated VRAM reporting** → In-GPU vs. spillover classification per context length
7. **Heterogeneous regime mixing in power analysis** → Note explaining why pooled std is meaningless
8. **No per-context-length CV%** → Measurement precision tables with coefficient of variation
9. **Misleading "superlinear = quadratic attention" conclusion** → Two-regime attribution separating VRAM thrashing from compute

### Strategic Development Indicators

- **Foundation Quality**: Transformative—false scaling narrative corrected
- **Scalability Readiness**: High—regime-aware analysis applies to any hardware
- **Operational Excellence**: High—publish-ready automated reporting
- **Team Productivity**: High—one-command sweep-to-report pipeline

## 🏗️ Architecture & Strategic Impact

### Scaling Characterization Architecture

This episode establishes **Chimera's Regime-Aware DNA**—the principle that **scaling behavior must be decomposed before it can be understood**. This isn't just curve fitting; it's the institutionalization of **analytical decomposition** that prevents false conclusions from aggregate data.

### Strategic Architectural Decisions

**1. Two-Regime Separation**

- Establishes **thrashing threshold detection** via VRAM monitoring
- Creates **clean scaling extraction** for true computational cost
- Sets precedent for **regime-aware performance analysis**

**2. Stratified Statistical Methods**

- **Per-context-length outlier detection** — no more pooling heterogeneous regimes
- **Per-stratum power analysis** — meaningful detectable effect sizes
- **CV% tables** — measurement precision visible at every context length

**3. Publish-Ready Pipeline**

- **Automated report generation** — `generate_report.py` produces markdown from analysis JSON
- **Two-regime tables** — full-range and pre-thrashing fits side by side
- **CUDA allocation tables** — in-GPU status and spillover magnitude per context length

**4. Backend Comparison Framework**

- **HF transformers** — exposes VRAM spillover at high context
- **Ollama (llama.cpp)** — sub-linear scaling across full range
- **Architectural insight** — optimized attention implementations (Flash Attention, paged KV cache) eliminate quadratic penalty

### Long-Term Strategic Value

**Operational Excellence**: False scaling narrative eliminated before it could poison optimization decisions.

**System Scalability**: Regime-aware analysis transfers to any GPU with different VRAM limits.

**Team Productivity**: One-command sweep-to-report pipeline for future context-length studies.

**Enterprise Readiness**: Publish-ready reports with honest two-regime conclusions.

## 🎭 Banterpacks' Deep Dive

*Banterpacks pulls up the full-range power-law fit, exponent screaming superlinear.*

"You see that? b = 3.4 across the full range. Looks like quadratic attention on steroids. But that's the trap. That exponent is a lie."

*He overlays the VRAM allocation curve.*

"Watch. At the spillover threshold, CUDA allocation crosses 12 GB. The GPU runs out of physical memory. Unified Memory starts paging to system RAM over PCIe. That's not compute—that's a **memory bus bottleneck**."

*He splits the curve at the threshold.*

"Pre-spillover: b less than 1.2, clean quadratic fit with high R^2. That's the real computational scaling. Post-spillover: 25-100x latency cliff. That's PCIe paging. Two completely different phenomena wearing the same curve."

*He opens the quality audit diff.*

"Nine rigor gaps. Pooled outlier detection mixing 50-millisecond Ollama measurements with 470-second HF thrashing samples. A single power analysis number that meant nothing because it averaged across heterogeneous regimes. Per-context CV% tables that show exactly how precise each measurement actually is. 5,362 lines. We're still **shaping the clay** — and now we can tell the clay from the cracks."

"This is how **lasting systems** achieve analytical excellence. Not by fitting one curve and declaring victory, but by **decomposing the truth into its regimes**. We're building **honest scaling infrastructure**."

## 🔮 Next Time on The Chimera Chronicles

Next dossier entry: TR128 Production Workload Characterization.

---

*The Two Regimes distilled: one curve can hide two truths.*
