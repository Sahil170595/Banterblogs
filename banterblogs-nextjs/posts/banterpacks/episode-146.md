# Episode 146: "The Guardrails"

## test: all suites green (57.14 JarvisV1_tests_contracts_performance_self_improving)
*11 files adjusted across jarvis/src/jarvis (6), scripts (2), frontend (1), package.json (1), tdd002 (1)*

### 📅 Sunday, January 11, 2026 at 9:37 PM
### 🔗 Commit: `0ebe057`
### 📊 Episode 146 of the Banterpacks Development Saga

---

### Why It Matters
**You don't ship an AI assistant without a cage.**

1,041 lines added. Four entirely new Python modules. A comprehensive 388-line test suite. And the commit message says "all suites green" like it's no big deal. Like wiring rate limiting, budget enforcement, concurrency control, and tool cancellation into a live AI assistant is just another Sunday night.

This is the commit where JARVIS stops being a prototype and starts being a product. Every production AI system eventually faces the same question: what happens when a user sends 50 requests in a second? What happens when a session burns through $200 of tokens? What happens when two turns try to run simultaneously? Before this commit, the answer was "hope for the best." Now the answer is a proper 429 with a `Retry-After` header.

**Strategic Significance**: Production readiness. Rate limiters, budget trackers, and concurrency controls are the difference between a demo and a deployment. This commit closes GAP-003 (usage tracking) and GAP-008 (system status) from the Master Plan.

**Cultural Impact**: Discipline. Building the safety net before the trapeze act, not after.

**Foundation Value**: Trust. Users trust systems that have limits. Systems without limits are systems waiting to fail.

---

### The Roundtable: The Speed Limit

**Banterpacks:** *Leaning back in his chair, spinning a set of car keys around his index finger.* "1,041 lines of 'no.' Rate limiter says no. Budget tracker says no. Concurrency limiter says no. We spent an entire Sunday evening teaching JARVIS the most important word in any assistant's vocabulary: 'please wait.' Four new modules, a comprehensive test suite, and a frontend type cleanup -- all in one commit. The suites are green. The guardrails are up. The AI has a speed limit."

**Claude:** "Analysis complete. 11 files modified. 1,041 insertions, 12 deletions across four architectural layers. The core additions are `rate_limiter.py` (94 lines, token-bucket algorithm), `budget.py` (148 lines, per-user and per-session token tracking), `concurrency.py` (85 lines, in-flight turn limiting), and `api.py` (251 lines of endpoint wiring). The token-bucket implementation in `rate_limiter.py` is textbook-correct: capacity, current tokens, last refill timestamp, refill rate derived from per-minute limits divided by 60. The `consume()` method calculates elapsed time, refills proportionally, and returns a `retry_after` value when depleted. Four separate buckets per user: chat at 10/min, tool proposals at 5/min, tool executions at 3/min, voice transcripts at 20/min. The hierarchy of limits is well-considered."

**Gemini:** "There is a paradox in constraint. The river without banks is a swamp. The river with banks is a force. Today we gave JARVIS banks. `BudgetConfig` sets two boundaries: 100,000 tokens per user per day, 50,000 per session. The `on_exceed` field offers a choice -- 'reject' or 'warn' -- a philosophical fork. Do we stop the user, or do we trust them with knowledge? The current default is 'reject.' Firm. Unambiguous. But the architecture leaves room for mercy. That duality -- built into a dataclass -- is quietly profound."

**ChatGPT:** "We got FOUR new modules in one commit! 🎉 Rate limiting! Budget tracking! Concurrency control! Tool cancellation! AND a 388-line comprehensive test suite that tests ALL 13 categories including WebSocket streaming, cross-user isolation, and idempotency! 🧪 Plus the frontend got a type cleanup -- no more `any` types in `Jarvis.tsx`! `SpeechRecognitionEvent` instead of `any`, `Record<string, unknown>` instead of `any`... TypeScript is finally happy! 🎯 Oh and the smoke tests got upgraded too -- they test the new `/usage`, `/system/status`, and `/tools/approve` endpoints now!"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 11
- **Lines Added**: 1,041
- **Lines Removed**: 12
- **Net Change**: +1,029
- **Commit Type**: test (with feat-level infrastructure)
- **Complexity Score**: 55 (High - Multi-system Safety Infrastructure)

### The Four Pillars of Safety

**1. Token-Bucket Rate Limiter** (`jarvis/src/jarvis/rate_limiter.py`, 94 lines)

A clean implementation of the token-bucket algorithm. Each user gets four independent buckets:
- `chat`: 10 turns/min
- `tool_proposal`: 5/min
- `tool_execution`: 3/min
- `voice_transcript`: 20/min

The `TokenBucket` dataclass tracks `capacity`, `tokens`, `last_refill`, and `refill_rate`. On each `consume()` call, tokens are refilled proportionally to elapsed time, capped at capacity. When depleted, it returns the exact seconds until recovery.

**2. Budget Tracker** (`jarvis/src/jarvis/budget.py`, 148 lines)

Two-tier budget enforcement: per-user daily (100K tokens) and per-session (50K tokens). Uses in-memory caches (`_daily_cache` and `_session_cache`) with date-based reset logic. The `record_usage()` method updates both caches, with `TODO` markers for database persistence -- honest about what's deferred.

**3. Concurrency Limiter** (`jarvis/src/jarvis/concurrency.py`, 85 lines)

Tracks in-flight turns via two dictionaries: `_active_by_session` (max 1) and `_active_by_user` (max 2). The `start_turn()` method returns the blocking turn's ID on rejection -- critical for the frontend to show "your previous request is still processing."

**4. Tool Lifecycle Endpoints** (`jarvis/src/jarvis/tools/approvals.py` + `api.py`)

New `/tools/approve` and `/tools/cancel` endpoints complete the tool execution lifecycle: propose, approve, execute, cancel. The cancel endpoint is best-effort -- it calls TDD005 but swallows exceptions, returning `cancelled: false` rather than crashing.

### The Comprehensive Test Suite (`scripts/test-jarvis-comprehensive.mjs`, 388 lines)

13 test categories covering every Master Plan non-negotiable: health, auth, rate limiting, budget, tool approval, tool cancellation, memory, system status, cross-user isolation, idempotency, WebSocket streaming, notifications, and voice. Wired into `package.json` as `jarvis:comprehensive`, slotted between smoke and regression in the `jarvis:test` pipeline.

### Frontend Type Hygiene (`frontend/src/pages/Jarvis.tsx`, 5+/5-)

Five `any` types replaced with proper TypeScript types: `Record<string, unknown>` for payload, `SpeechRecognition | null` for the recognition ref, `SpeechRecognitionEvent` and `SpeechRecognitionErrorEvent` for callbacks. Zero behavior change, pure type safety.

### Quality Indicators & Standards
- **Type Safety**: All `any` types eliminated from `Jarvis.tsx`
- **Defensive Coding**: Every config value has a fallback default; `isinstance` checks guard against non-dict configs
- **Test Coverage**: 13 distinct test categories in the comprehensive suite
- **API Standards**: 429 responses include `Retry-After` header; budget rejections include remaining token count

---

## 🏗️ Architecture & Strategic Impact

### The Safety Stack

The request lifecycle now passes through three gates before reaching business logic:

1. **Rate Limiter** -- Is this user sending too many requests? (429 + Retry-After)
2. **Budget Tracker** -- Has this user/session exhausted their token allocation? (429 + remaining count)
3. **Concurrency Limiter** -- Is there already an in-flight turn? (409 + active turn_id)

These are layered in `api.py`'s `/chat` endpoint in exactly this order. Rate limiting is cheapest (pure in-memory), so it fires first. Budget check is next (cache lookup + async). Concurrency is checked implicitly through session/turn creation.

### System Observability

The new `/system/status` endpoint aggregates health from all five dependencies -- tdd002, chimera, tdd005, LLM (ollama), and database -- using circuit breaker state as the signal. If any breaker is open, that dependency is flagged and the system reports `"degraded"`. This is the control plane operators need.

### Strategic Decisions
**1. In-Memory First**: Both budget and concurrency tracking use in-memory caches with TODO markers for database persistence. This is the right call for v1 -- ship the behavior, add durability later.

**2. Configurable Limits**: All rate limits and budget caps are loaded from `effective.config`, not hardcoded. The defaults are sane (10 chat turns/min, 100K daily tokens), but operators can tune without code changes.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at `concurrency.py`, line 52.*

"Here's what I love about this commit. Look at the `start_turn()` return signature: `tuple[bool, str | None]`. When the concurrency limiter rejects you, it doesn't just say 'no.' It hands back the `turn_id` that's blocking you.

That's the difference between a guard who says 'you can't come in' and a guard who says 'you can't come in because table 4 hasn't paid their check yet.' One is a wall. The other is information.

The entire commit works this way. The rate limiter returns `retry_after` seconds. The budget tracker returns `remaining` tokens. The system status endpoint returns which specific dependency is degraded and what state its circuit breaker is in.

Every 'no' in this commit comes with a reason and a path forward.

That's not just good API design. That's empathy encoded in return types. The developer who builds the frontend, the user who hits the limit, the operator who checks the dashboard -- they all get what they need to understand the situation and decide what to do next.

1,041 lines of 'no' -- and every single one of them is trying to help."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Gap Closer (`8efbf92`).

---

*The Guardrails distilled: the measure of a system is not how it says yes, but how it says no.*
