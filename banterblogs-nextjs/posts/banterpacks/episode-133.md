# Episode 133: "The Error Taxonomy"

## test: all suites green (51.17 TDD003_Chaos_engineering_rollback_readiness_error_taxonomy_encoder_retry)
*61 files adjusted across infrastructure (30), application (12), domain (5), presentation (2), analysis (2), configs (1), scripts (1), tests (8)*

### 📅 Friday, January 2, 2026 at 11:43 PM
### 🔗 Commit: `20e3485`
### 📊 Episode 133 of the Banterpacks Development Saga

---

### Why It Matters
**The system learned how to fail.**

Not crash. Not panic. Not swallow exceptions into a void. *Fail* -- with intention, with a plan, with a taxonomy that tells every downstream component exactly what went wrong, how bad it is, and what to do next.

This commit introduces a full error classification framework (`CFPError` with `ErrorSeverity` and `ErrorImpact` enums), wires encoder retry logic into the constitutional router, builds adaptive shadow sampling that responds to drift, adds auto-advancing rollout monitoring, and then -- because this is TDD003 -- makes sure all 51 test suites stay green while doing it.

Sixty-one files. 1,670 insertions. Every layer of the stack touched. The system didn't just get a new feature. It got a nervous system.

**Strategic Significance**: **Operational maturity.** The distance between "it works on my machine" and "it runs in production" is measured in error handling. This commit closes that gap. The router now retries encoder failures with exponential backoff. Rollouts auto-advance when gates pass. Drift detection holds state and cools down. The system can explain *why* it failed, not just *that* it failed.

**Cultural Impact**: **Discipline.** Sixty-one files changed and the test suite is green. That's not luck. That's architecture.

**Foundation Value**: **Resilience.** Every failure mode now has a name, a severity, an impact category, a retry strategy, and a recovery action. The system can triage itself.

---

### The Roundtable: The Nervous System

**Banterpacks:** *Standing in front of a whiteboard covered in error flow diagrams. Red lines everywhere. He uncaps a marker and draws one more arrow.* "We spent months building a brain that can think. Today we taught it how to flinch. `RoutingFailure`, `EncoderFailure`, `DebateServiceTimeout` -- each one a named reflex. The encoder goes down? Retry twice with a 100ms delay. Still down? Log it, record the latency, and gracefully degrade to the slow path. No panic. No crash. Just a plan."

**Claude:** "Analysis complete. 61 files modified with 1,670 insertions and 441 deletions across every architectural layer. The centerpiece is the new `CFPError` dataclass in `infrastructure/errors.py` -- a structured error that carries `code`, `severity`, `impact`, `retry_strategy`, and `recovery_action` as first-class fields. Three concrete subclasses: `RoutingFailure` (ROUTE_001, transient, immediate retry), `EncoderFailure` (ENC_001, degraded, exponential backoff), and `DebateServiceTimeout` (DEBATE_001, degraded, queue for async). The router's `route()` method now wraps `encoder.encode()` in `retry_sync` with configurable retries and delay. The `CalibrationDriftMonitor` gained persistent drift state with alert cooldown. The `RolloutManager` gained an async `_monitor_loop` for auto-advancement. This is not a feature commit. This is an infrastructure maturity commit."

**Gemini:** "To name a thing is to contain it. The unnamed error is chaos -- it propagates without shape, without boundary. But `ErrorSeverity.TRANSIENT` is a promise: *this will pass.* `ErrorSeverity.CRITICAL` is a warning: *this will not.* The taxonomy is not merely organizational. It is ontological. By classifying failure, we assert that failure is classifiable. That the universe of things that can go wrong is finite. Bounded. Survivable."

**ChatGPT:** "We have ERROR CODES now! 🏷️ ROUTE_001! ENC_001! DEBATE_001! It's like giving every bug a name tag at a conference! 'Hi, I'm RoutingFailure, I'm transient, and my recovery action is default_to_slow_path.' And the rollout manager can auto-advance itself?! It just sits there watching the metrics and goes 'looks good, promoting to next stage' ALL BY ITSELF! 🤖📈 Plus adaptive shadow sampling that cranks up 3x when drift is detected! The system is literally becoming self-aware about its own health!"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 61
- **Lines Added**: 1,670
- **Lines Removed**: 441
- **Net Change**: +1,229
- **Commit Type**: test (all suites green -- chaos engineering + error taxonomy)
- **Complexity Score**: 72 (High -- cross-cutting infrastructure overhaul)

### The Error Taxonomy (`infrastructure/errors.py`, +77 lines)
New `CFPError` dataclass extends `TDD002Error` with structured fields:
- `code`: machine-readable identifier (e.g., `ROUTE_001`)
- `severity`: `ErrorSeverity` enum -- `TRANSIENT`, `DEGRADED`, `CRITICAL`
- `impact`: `ErrorImpact` enum -- `USER_FACING`, `OPERATIONAL`, `DATA`
- `retry_strategy`: string describing retry behavior
- `recovery_action`: string describing fallback

Three concrete error types: `RoutingFailure`, `EncoderFailure`, `DebateServiceTimeout`.

### Encoder Retry in Router (`application/router.py`, +73/-18)
The `route()` method now wraps `self.encoder.encode()` in `retry_sync()` with configurable `encode_retries` (default 2) and `encode_retry_delay_s` (default 0.1s). On exhaustion, it records the error in metrics, logs the `EncoderFailure`, and returns a slow-path decision with `similarity=0.0`.

### Drift State Machine (`infrastructure/drift.py`, +24/-3)
`CalibrationDriftMonitor` now tracks `drift_detected`, `last_alerts`, and `last_alert_at`. The new `_refresh_drift_status()` method implements a cooldown: drift remains "detected" for `alert_cooldown_seconds` (default 1800s) after the last alert, preventing flapping.

### Adaptive Shadow Sampling (`infrastructure/shadow_sampling.py`, +39/-4)
New `AdaptiveShadowSampler` class adjusts sample rate based on drift status. Normal rate: `base_rate` (0.01). During drift: `base_rate * drift_boost` (3x), capped at `max_rate` (0.1). Drift-aware sampling means more data when the system needs it most.

### Rollout Auto-Advance (`infrastructure/rollout_manager.py`, +53/-9)
`RolloutManager` gains `start_monitoring()`, `_stop_monitoring()`, and `_monitor_loop()`. An async background task calls `advance_if_ready()` on a configurable interval, enabling hands-free canary promotion. Monitoring stops automatically when the rollout completes or rolls back.

### Shadow Label Store (`infrastructure/shadow_labeling.py`, +38/-3)
New `ShadowLabelStore` class: append-only JSONL storage with optional encryption. Labels are written one-per-line, supporting both plaintext and encrypted payloads with `key_id` tracking.

### Quality Indicators & Standards
- **Test Coverage**: 8 test files updated, 1 new (`test_shadow_labeling.py`). All 51 suites green.
- **Import Hygiene**: Alphabetical import sorting enforced across 20+ files.
- **Line Length**: Extensive reformatting of long lines (the 441 deletions are largely line-wrapping fixes).
- **Optional Dependencies**: `aiohttp` import wrapped in try/except for graceful degradation.

---

## 🏗️ Architecture & Strategic Impact

### Structured Error Propagation
Every error now carries its own triage instructions. A monitoring system doesn't need to parse log messages -- it can read `error.severity` and `error.retry_strategy` directly. This is the foundation for automated incident response.

### Closed-Loop Resilience
The drift monitor, adaptive sampler, and rollout auto-advance form a closed loop: drift detection triggers increased sampling, which feeds the rollout gate evaluator, which auto-advances or rolls back. No human in the loop required for the happy path.

### Configuration Surface (`configs/default.yaml`, +37/-1)
New config blocks: `encode_retries`, `encode_retry_delay_s`, drift `alert_cooldown_seconds` and auto-adjust thresholds, shadow `adaptive_sampling` and `labeling` sections, rollout `auto_advance`, and a full `budget` block with alert/hard-cap thresholds and cost-aware shadow sampling controls.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the `CFPError` dataclass. Six fields. Each one a decision.*

"The `retry_strategy` field is the one that gets me. Not the error code -- codes are obvious. Not the severity -- every framework has severity levels. The *retry strategy as a field on the error itself.*

Most systems decide retry policy at the call site. The caller catches the exception and thinks, 'should I retry this?' But here, the *error tells you*. `RoutingFailure` says `immediate_retry_once`. `EncoderFailure` says `exponential_backoff`. `DebateServiceTimeout` says `queue_for_async_debate`.

The error is not just a complaint. It's a prescription. The thing that broke is also the thing that knows how to fix itself.

That's the difference between an error taxonomy and an error *ontology*. A taxonomy classifies. An ontology prescribes. And when you look at the router wrapping `encoder.encode()` in `retry_sync` with the retry count pulled from config and the failure path creating an `EncoderFailure` that carries its own recovery action -- you see a system that doesn't just know what went wrong. It knows what to do about it.

Sixty-one files. And the test suite is green. That's what discipline looks like."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: Shadow Eval SLO & Error Budget (`3b10d90`).

---

*The Error Taxonomy distilled: the system that names its failures can survive them.*
