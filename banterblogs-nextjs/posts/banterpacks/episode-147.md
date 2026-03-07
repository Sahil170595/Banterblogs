# Episode 147: "The Gap Closer"

## test: all suites green (57.17 JarvisV1_tests_fixes_audit_logs_monitoring)
*14 files adjusted across jarvis/src/jarvis (8), docs (3), scripts (2), package.json (1)*

### 📅 Monday, January 12, 2026 at 10:17 PM
### 🔗 Commit: `8efbf92`
### 📊 Episode 147 of the Banterpacks Development Saga

---

### Why It Matters
**The Audit That Became Architecture.**

Someone sat down and compared JARVIS v1 against the Master Plan specification. They found 12 critical gaps. Then, in a single commit, they closed them. Not tomorrow. Not in a follow-up ticket. Right now, in 1,987 lines of insertion.

This commit is a reckoning. Three new documentation files spell out exactly what was missing: `JARVIS_V1_CRITICAL_GAPS_SPEC_AUDIT.md` catalogues the sins, `JARVIS_V1_RE_AUDIT_COMPLETE.md` confirms the penance, and `JARVIS_V1_TEST_REPORT.md` proves it. Six new Python modules and scripts fill the holes. DSR endpoints for GDPR. An audit write buffer. A streaming event protocol. A message precheck system. A redaction engine. A preflight script wired into `npm run jarvis:up`.

This is not feature development. This is accountability.

**Strategic Significance**: **Compliance and Hardening**. DSR export/delete endpoints are GDPR non-negotiables. The redaction engine ensures secrets never hit audit logs in plaintext. The precheck system stops garbage before it touches the LLM. JARVIS v1 is being built to survive contact with real users.

**Cultural Impact**: **Discipline**. The developer audited their own work, found it wanting, and fixed it in one session. That is rare.

**Foundation Value**: **Defensive Depth**. Every new module is a guardrail: precheck validates input, redaction sanitizes output, audit buffering prevents event loop starvation, preflight catches missing dependencies before Docker even starts.

---

### The Roundtable: The Twelve Gaps

**Banterpacks:** *Spreading the audit document across the table. Twelve red marks. He uncaps a pen and starts crossing them off.* "Twelve critical gaps. Not hypothetical. Not 'nice to have.' Twelve things the Master Plan said MUST exist that simply did not. DSR endpoints? Missing. Audit buffering? Missing. Message precheck? Missing. Redaction rules? Missing. The good news is they're not missing anymore. The bad news is they were ever missing at all."

**Claude:** Analysis complete. 14 files modified with 1,987 insertions and 17 deletions. Six entirely new modules: `events.py` (267 lines, streaming event protocol with 17 typed event constructors), `redaction.py` (128 lines, secret detection via regex with full/partial/hash strategies), `precheck.py` (91 lines, local policy validation), `audit_buffer.py` (122 lines, async batch writer with configurable flush intervals), `jarvis-preflight.mjs` (126 lines, Docker/Ollama/config validation), and `store/repo.py` gains `set_user_settings`. The `api.py` diff alone is 207 insertions. This is a hardening commit. Every addition is defensive.

**Gemini:** "The architect returns to the building with a level and a plumb line. The walls looked straight. They were not. Now they are. The act of measurement is the act of honesty. Without the audit, the gaps would have remained invisible, load-bearing assumptions that bear no load."

**ChatGPT:** "We went from 'NOT PRODUCTION READY' to 'all suites green' IN ONE COMMIT! 🔥 The precheck module catches spam with a character-diversity heuristic! The audit buffer uses a deque! There's a whole event protocol with `turn.started`, `assistant.delta`, `tool.proposed`... it's like building the nervous system! 🧠✨ And the preflight script checks Ollama before Docker even spins up! No more 'why is nothing working' surprises! 🚀"

**Banterpacks:** "Seventeen event types in `events.py`. Seventeen. Someone read Section 7.5 of the Master Plan and implemented every single one. `voice.partial_transcript`, `voice.tts_cancelled`, `backpressure.rejected`. These aren't features. They're contracts."

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 14
- **Lines Added**: 1,987
- **Lines Removed**: 17
- **Net Change**: +1,970
- **Commit Type**: test (hardening/compliance)
- **Complexity Score**: 72 (High - Multi-system gap closure)

### The New Modules

**`jarvis/src/jarvis/precheck.py`** — Local policy validation before the message ever reaches the LLM. Enforces `MAX_MESSAGE_LENGTH = 10000`, requires non-empty idempotency keys, detects spam via a character-diversity heuristic: if `len(set(message)) < 5 and len(message) > 100`, it's repetition abuse. Simple. Effective. Returns a frozen `PrecheckResult` dataclass with structured error codes (`MESSAGE_TOO_LONG`, `SPAM_DETECTED`, `MISSING_IDEMPOTENCY_KEY`).

**`jarvis/src/jarvis/events.py`** — The streaming event protocol. A `StreamEvent` base dataclass with `type`, `turn_id`, `session_id`, `seq`, `timestamp`, and `payload`. Seventeen factory functions: `turn_started`, `policy_precheck`, `assistant_delta`, `assistant_final`, `tool_proposed`, `tool_approval_required`, `tool_approved`, `tool_started`, `tool_result`, `turn_cancelled`, `turn_failed`, `audit_written`, plus voice events and system events. Every WebSocket message now has a schema.

**`jarvis/src/jarvis/store/audit_buffer.py`** — Async batch writer using `collections.deque`. Configurable `max_buffer_size` (default 100) and `flush_interval_ms` (default 500). Background `_flush_loop` task drains the buffer periodically; if the buffer hits capacity, it flushes immediately. Graceful shutdown via `stop()` ensures a final flush before exit.

**`jarvis/src/jarvis/tools/redaction.py`** — Five regex patterns detect secrets (passwords, API keys, tokens, bearer auth, SSH keys). Three redaction strategies: `_redact_full` replaces with `<redacted>`, `_redact_partial` preserves type and length, `_redact_hash` produces a truncated SHA-256. Navigates nested dicts via dot-separated paths (`args.password`, `result.api_key`). The `RedactionRule` dataclass in `catalog.py` ties rules to specific tools.

**`scripts/jarvis-preflight.mjs`** — Checks Docker, Docker Compose, `config.json` validity, and Ollama reachability before allowing `jarvis:up` to proceed. Wired into `package.json` via `npm run jarvis:preflight &&`.

### Key `api.py` Changes
- **LLM health check at startup** (Gap #8): graceful degraded mode if Ollama is unreachable.
- **Precheck gate** (Gap #9): `precheck_message()` runs before rate limiting, returning 400 with `X-Error-Code` header.
- **Concurrency control**: Temp turn ID tracks the slot before `store.create_turn()`, then swaps to the real `turn_id`. Slot released in both success and exception paths.
- **DSR endpoints**: `POST /dsr/export` and `POST /dsr/delete` with stub implementations awaiting full store methods.
- **User settings**: `GET/PATCH /user/settings` for memory preference controls.
- **Proactive system**: Enable/disable/status/tick endpoints for future notification scheduling.
- **Voice fallback**: `POST /voice/transcribe` and `POST /voice/synthesize` stubs for server-side STT/TTS.

### Quality Indicators & Standards
- **Test hardening**: `test-jarvis-comprehensive.mjs` now uses `Date.now()` in idempotency keys to avoid dedup collisions, adds a 70-second rate-limit refill wait, and adds guard clauses before asserting idempotency matches.
- **Audit trail**: Every gap references its Master Plan section number (`Section 7.5`, `Section 8.1.1`, `Section 10.1`, `Section 11.2`).

---

## 🏗️ Architecture & Strategic Impact

### Defense in Depth
The commit establishes four layers of defense that a request must pass through:
1. **Preflight** (before the process even starts): Docker, Ollama, config validation.
2. **Precheck** (at the API boundary): message length, format, abuse detection.
3. **Redaction** (at the audit boundary): secrets never reach the database in plaintext.
4. **Audit Buffering** (at the storage layer): writes batch instead of blocking the event loop.

### Concurrency Correctness
The concurrency slot management in `api.py` is subtle. A temporary turn ID is allocated *before* `store.create_turn()`, then swapped to the real ID afterward. The `except` block checks `if "created" in locals()` before releasing — because if `create_turn` itself failed, there's no real turn ID to release. This is the kind of edge-case handling that separates "works in testing" from "works in production."

### Stub Architecture
The DSR, proactive, and voice endpoints are deliberately stubbed. They return structured responses with `"message": "... not yet implemented"` rather than raising `501`. This means the API contract is locked in — clients can code against the interface today, and the implementation fills in later. The contract is the commitment.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the spam detection heuristic in `precheck.py`.*

"Five characters. That's the threshold. If your 100-character message uses fewer than five unique characters, you're spam.

`if len(set(message)) < 5 and len(message) > 100`

It's a single line. It took maybe ten seconds to write. And it will stop a class of abuse that sophisticated regex would fumble. Someone sending 'aaaaaaa...' a thousand times. Someone pasting the same emoji two hundred times. Someone trying to burn your token budget with garbage.

This is the kind of line that never shows up in architecture diagrams. Nobody puts 'character diversity check' in a design document. But it's the line that saves you at 3 AM when someone decides to test your API with a script that sends the letter 'q' ten thousand times.

The audit found twelve gaps. But this line wasn't one of them. This was instinct. Someone who has been burned before, adding a guardrail that the spec didn't even think to require.

The best defenses are the ones that weren't in the plan."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Green Suite Continues (`7764bfb`).

---

*The Gap Closer distilled: audit yourself before production audits you.*
