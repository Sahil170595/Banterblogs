# Chimera - Episode 55: "The Quantized Deep"

## docs: TR118v2.2 - Model Scale Comparative Analysis

*1,327 lines. The system discovers the 76M crossover—and TensorRT's true power.*

### 📅 2025-12-12

### 🔗 Commits: `92275d8`, `7cfde87`, `8bdddaf`

### 📊 Episode 55 of The Chimera Chronicles

---

### Why It Matters

This **scaling research** episode represents the **parameter singularity**—the moment when Chimera discovers **exactly when CPU optimizations lose to GPU**. With 1,327 lines in TR118v2.2, this update demonstrates **frontier research execution** and **systematic scaling analysis**.

The publication of TR118v2.2 signals **deep empirical investigation**. Rather than assuming GPU always wins, the team demonstrates **systematic thinking** by benchmarking across a 1,210x parameter span (0.103M to 124.4M). These 1,327 lines represent **scaling intelligence** that enables hardware-aware deployment decisions.

**Strategic Significance**: This work establishes **The Crossover Point**. The discovery that ONNX CPU advantage inverts at ~76M parameters provides concrete deployment guidance.

**Cultural Impact**: This approach signals that Chimera values **quantified truth**. The rigorous power-law fit and confidence intervals demonstrate commitment to **statistical precision**.

**Foundation Value**: These 1,327 lines create **scaling knowledge**. This is how research-grade platforms achieve **optimal deployment** through **empirical analysis**.

---

### The Roundtable: Dossier Reactions

**Banterpacks:** *He stares at the crossover plot, the power-law fit clear...* "TR118. The Crossover. 1,327 lines of pure scaling truth. At 0.1M params, ONNX CPU is 21.9x faster than PyTorch. At 124M params, it's 32% **slower**. The lines cross at 76M. We're still **shaping the clay**, but now we know exactly where GPU becomes mandatory."

**ChatGPT:** SO PRECISE! 📈🔬 The Quantized Deep shows **frontier-grade scaling analysis**! 76M crossover! 2.96x TensorRT speedup! Profile mismatches discovered! The research now has **scaling laws**! Data drives decisions! 📊✨

**Claude:** Analysis complete. TR118v2.2 contains 1,327 lines with 720 benchmark runs. Key findings: (1) ONNX CPU vs PyTorch crossover at ~76M params (95% CI: 56M-120M), (2) TensorRT INT8 speedup: 1.35x at 0.1M → 2.96x at 124M, (3) All TensorRT generate runs fail with profile mismatch (not timeout), (4) GPT-2 perplexity delta <0.022%. The power-law fit (k=-0.506) is statistically robust.

**Gemini:** The diff reveals **empirical humility**. The code now understands that optimization is context-dependent. The shift from absolute to conditional truth signals that Chimera values **nuance**—the wisdom to know that "it depends." This is how **lasting systems** achieve efficiency—through the art of regime-aware optimization.

---

## 🔬 Technical Analysis

### Commit Metrics & TR118 Report Analysis

- **Files Changed**: 3 (technical report + analysis scripts)
- **Lines Added**: 1,327 (comprehensive scaling analysis)
- **Lines Removed**: 0 (additive)
- **Commit Type**: docs (research publication)
- **Complexity Score**: 90 (high research depth)

### TR118v2.2 Report Metrics

- **Total Lines**: 1,327
- **Benchmark Runs**: 720 (360 prefill + 360 generate)
- **Models**: tiny-gpt2 (0.103M) + GPT-2 (124.4M)
- **Parameter Span**: 1,210x
- **Backends**: 6 (PyTorch, ONNX CPU/GPU, TensorRT FP32/FP16/INT8)

### Key Findings

**The 76M Crossover:**

| Model | Params | ONNX CPU | PyTorch | Ratio |
|-------|--------|----------|---------|-------|
| tiny-gpt2 | 0.10M | 87,996 tok/s | 4,011 tok/s | 21.94x |
| gpt2-50m | 51.48M | 2,173 tok/s | 1,722 tok/s | 1.26x |
| gpt2-75m | 74.82M | 2,019 tok/s | 2,812 tok/s | **0.72x** |
| gpt2 | 124.44M | 1,434 tok/s | 2,121 tok/s | **0.68x** |

**Power-Law Fit:**

- k = -0.506
- Crossover at ~76M params
- 95% CI: 56M to 120M

**TensorRT Scaling:**

| Model | TRT INT8 vs PyTorch |
|-------|---------------------|
| tiny-gpt2 (0.103M) | 1.35x faster |
| GPT-2 (124.4M) | **2.96x faster** |

- Scaling factor: 2.19x improvement as model grows 1,210x
- INT8 advantage **increases** with model size

**Profile Mismatch Discovery:**

- All TensorRT generate runs failed
- Error: `set_input_shape_failed: profile mismatch`
- Not timeouts—hard failures
- Root cause: Variable sequence lengths violate optimization profiles

**Perplexity Preservation:**

- GPT-2: All backends <0.022% delta from PyTorch
- tiny-gpt2: ~50,286 (matches uniform distribution over vocab 50,257)
- INT8 quantization: No accuracy loss detected

### Production Deployment Matrix

| Model Size | CPU Option | GPU Option | Recommended |
|------------|-----------|-----------|-------------|
| <1M params | ONNX CPU | ONNX GPU | **ONNX CPU** (20-100x faster) |
| 1M-10M | ONNX CPU | ONNX GPU | **ONNX GPU** (transition zone) |
| 10M-1B | ❌ | TRT FP16 | **TRT FP16** |
| >7B params | ❌ | TRT INT8 | **TRT INT8** |

### Strategic Development Indicators

- **Foundation Quality**: Transformative—scaling laws now quantified
- **Scalability Readiness**: High—deployment matrix enables correct choices
- **Operational Excellence**: High—profile mismatch documented
- **Team Productivity**: High—clear decision framework

## 🏗️ Architecture & Strategic Impact

### Scaling Architecture Philosophy

This episode establishes **Chimera's Regime DNA**—the principle that **optimal varies with scale**. This isn't just benchmarking; it's the discovery of **phase transitions** that enable regime-appropriate optimization.

### Key Discoveries

**1. The Crossover is Real**

- ONNX CPU dominance doesn't last forever
- At 76M params, GPU takes over
- This is **physics, not preference**

**2. TensorRT Scales Better**

- 1.35x at tiny → 2.96x at 124M
- Graph-level optimizations compound
- Kernel fusion matters more as models grow

**3. Profile Mismatches are Hard Failures**

- TensorRT generate path broken
- Not a timeout—a shape mismatch
- Requires TRT-LLM for production decode

**4. Perplexity is Preserved**

- <0.022% delta proves correctness
- INT8 quantization doesn't hurt accuracy
- Production-safe deployment

### Long-Term Strategic Value

**Operational Excellence**: Right backend for right scale.

**System Scalability**: Regime-aware optimization.

**Team Productivity**: Clear decision matrix.

**Enterprise Readiness**: Performance guarantees.

## 🎭 Banterpacks' Deep Dive

*Banterpacks traces the crossover plot, finger following the power-law curve.*

"You see that? At 0.1M params, ONNX CPU is 22x faster than GPU. At 75M params, it's 28% slower. The lines cross. That's not opinion—that's **physics**."

*He points at the TensorRT scaling.*

"1.35x speedup at tiny. 2.96x at 124M. TensorRT gets **better** as models get bigger. Kernel fusion compounds. Graph optimization pays dividends. That's **scaling advantage**."

*He pulls up the profile mismatch errors.*

"Every TensorRT generate run failed. Not timed out—failed with `set_input_shape_failed`. The optimization profiles don't cover decode shapes. We know exactly why TRT generate doesn't work yet. That's **honest failure documentation**."

*He checks the perplexity table.*

"<0.022% delta. That's not noise—that's **precision preservation**. We're not trading accuracy for speed. 1,327 lines don't scare me—they remind me we're still **shaping the clay**, but now we have the scaling laws."

"This is how **lasting systems** achieve operational excellence. Not by assuming, but by **measuring across regimes**. We're building **scaling knowledge infrastructure**."

## 🔮 Next Time on The Chimera Chronicles

Next dossier entry: The Cost of Thought (TR119).

---

*The Quantized Deep distilled: scaling matters.*
