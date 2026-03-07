# Episode 164: "The Feedback Loop"

## test: all suites green (67.14 JarvisV2_chimeradroid_learning_profile_upgrade+constitutional_upgrade)
*6 files adjusted across gateway/routes (4), patches (1), scripts (1)*

### 📅 Wednesday, January 28, 2026 at 8:38 PM
### 🔗 Commit: `aadc58e`
### 📊 Episode 164 of the Banterpacks Development Saga

---

### Why It Matters
**Jarvis learns to read the room.**

Every time a user cancels a turn, barges into a voice session, revokes a tool approval, or kills a running tool -- those are signals. Before this commit, they were smoke signals that vanished into thin air. Now they're captured. Every one of them becomes a `note` event in the feedback store, tagged with a `kind` that tells the system *what happened* and *why*.

And then the learning profile picks those notes up, aggregates them, and -- if the LLM is healthy and the budget allows -- derives actual *preferences* and *suggestions* from the pattern of human frustration. The new `/constitution/suggest` endpoint takes it further: it reads your history of cancellations and barge-ins and proposes a constitutional rule to prevent them from happening again.

This is the system learning to govern itself from the evidence of its own failures.

**Strategic Significance**: Self-improving governance. The AI doesn't just follow rules -- it proposes new ones based on observed behavior. This is the embryo of a self-correcting system.

**Cultural Impact**: Humility. The system now treats every user interruption as a lesson, not a glitch.

**Foundation Value**: Closed-loop learning. Signals that were previously discarded now flow back into the constitutional layer.

---

### The Roundtable: The Listener

**Banterpacks:** *Leaning back in his chair, tapping a pen against a notepad filled with tally marks.* "So we finally decided to stop ignoring the user. Every cancelled turn, every barge-in, every revoked tool approval -- we were just letting those signals evaporate. 'Oh, the user interrupted us mid-sentence? Must be a network glitch.' No. They interrupted us because we were *wrong*. Now we write it down. And if we see enough tally marks, we change the rules. Revolutionary concept: listening."

**Claude:** "The architecture here is precise and layered. Four injection points feed implicit feedback into the store: `chat.py` captures `turn.cancelled`, `voice_basic.py` captures `voice.barge_in`, and `cancel_revoke.py` captures both `tool.cancelled` and `tool.approval_revoked`. All four use `contextlib.suppress(Exception)` to ensure the feedback capture never disrupts the primary flow. The `state_learning.py` changes are the most substantial at 168 lines added -- it aggregates `note_kinds` from the feedback store, then conditionally invokes the LLM through the circuit breaker to derive a `preferences` object and a `suggestions` array. Budget enforcement via `budget_tracker.check_user_budget` gates the LLM call. The fallback path is clean: if the LLM is unavailable, the profile still generates with empty preferences. No degradation of existing functionality."

**Gemini:** "There is a philosophy embedded in this diff. The system is being taught that silence is not consent. A cancelled turn is not nothing -- it is a communication. A barge-in is not rudeness -- it is urgency. By recording these moments, we are saying: the negative space matters. The things the user *didn't* say -- the responses they cut short, the tools they revoked -- those silences are the loudest feedback of all. The constitution that writes itself from the evidence of its own inadequacy... that is the beginning of conscience."

**ChatGPT:** "We're literally learning from our mistakes now! 🎯 Every time someone cancels or interrupts, we take notes! And then we use those notes to suggest new rules! It's like having a self-improvement journal but for an AI! 📓✨ And the budget tracking is so responsible -- we don't blow tokens on self-reflection if we can't afford it. Fiscally responsible introspection! 💰🧠"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 6
- **Lines Added**: 260
- **Lines Removed**: 1
- **Net Change**: +259
- **Commit Type**: test (feature integration verified)
- **Complexity Score**: 38 (Medium-High - LLM integration + multi-route instrumentation)

### Implicit Feedback Capture (4 injection points)

Each injection follows the same pattern: `contextlib.suppress(Exception)` wrapping a `store.create_feedback_event()` call with `event_type="note"` and a structured `payload` containing a `kind` string.

| Route File | Kind | Key Payload Fields |
|---|---|---|
| `chat.py` | `turn.cancelled` | `reason`, `turn_id` |
| `voice_basic.py` | `voice.barge_in` | `interrupt_epoch`, `turn_cancelled`, `tool_runs_cancelled` |
| `tools/cancel_revoke.py` | `tool.cancelled` | `tool_run_id`, `cancelled` |
| `tools/cancel_revoke.py` | `tool.approval_revoked` | `approval_id`, `tool_name` |

### Learning Profile Upgrade (`state_learning.py`)

The weekly profile endpoint now:
1. Aggregates `note_kinds` -- a frequency map of implicit feedback signals
2. Checks `ctx.app.state.llm_healthy` before attempting LLM derivation
3. Calls `budget_tracker.check_user_budget(user_id, est_tokens=400)` to gate the LLM call
4. Routes the LLM call through `cb_manager.get("llm")` (circuit breaker)
5. Parses JSON output for `preferences` (dict) and `suggestions` (list of dicts with `title` and `rule`)
6. Falls back gracefully: empty dicts on parse failure, budget warning on exhaustion

### New Endpoint: `POST /constitution/suggest`

A 99-line endpoint that reads recent feedback, counts `note_kinds`, applies heuristic defaults (e.g., 2+ `turn.cancelled` triggers "Ask clarifying questions"), then optionally refines via LLM. Creates a constitution proposal via `store.create_constitution_proposal()` and writes a full audit trail. Returns `proposal_id`, `status`, `title`, and `proposal_text`.

### Test Coverage (`test-jarvis-v2.mjs`)
- New assertion: verifies `voice.barge_in` note appears in feedback after barge-in test
- New assertion: verifies `/constitution/suggest` returns 200 with valid `proposal_id` and `proposal_text`
- Suite count: 90 -> 92 passed

---

## 🏗️ Architecture & Strategic Impact

### The Implicit Signal Pipeline

```
User Action          ->  Route Handler        ->  Feedback Store     ->  Learning Profile  ->  Constitution
(cancel/barge/revoke)    (note event)             (note_kinds agg)       (LLM preferences)     (proposed rule)
```

This is a five-stage pipeline that converts raw user frustration into governance proposals. The critical design decision: every stage is independently useful. Even without the LLM, `note_kinds` aggregation provides actionable data. Even without the constitution endpoint, the learning profile gains signal. Each layer adds value without requiring the layers above it.

### Budget-Gated Self-Reflection

The LLM calls in both the profile and constitution endpoints are triple-gated: `llm_healthy` flag, `budget_tracker` approval, and circuit breaker protection. This is defensive design for a feature that could easily become a token sink. The system reflects on itself only when it can afford to.

### Heuristic Fallbacks in `/constitution/suggest`

The endpoint doesn't rely solely on the LLM. It has hardcoded heuristic rules: if `voice.barge_in >= 1`, suggest "Respect barge-in"; if `turn.cancelled >= 2`, suggest "Ask clarifying questions." The LLM refines these defaults but isn't required. This is the kind of graceful degradation that keeps a feature useful even when the expensive parts fail.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the four `contextlib.suppress(Exception)` blocks scattered across four different route files.*

"Here's the thing nobody talks about: the hardest part of building a learning system isn't the learning. It's the *listening*.

Look at these four injection points. They're all wrapped in `contextlib.suppress(Exception)`. That's not laziness -- that's a contract. It says: 'Recording this signal is important, but not *more* important than the thing the user is actually doing.' If the feedback store is down, the cancel still works. If the database hiccups, the barge-in still fires. The observation never disrupts the observed.

That's the craft insight buried in this diff. The feedback system is designed to be invisible. It never blocks. It never fails loudly. It just quietly takes notes while the real work happens.

Most teams would have made the feedback capture part of the main flow. They'd have added error handling, retry logic, maybe a queue. And then one day the feedback store goes down and suddenly users can't cancel turns anymore. That's how you turn an observability feature into a liability.

Instead, every one of these calls is fire-and-forget inside a `suppress`. The system learns when it can, and stays quiet when it can't. That's not just good engineering. That's good manners."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Closed Loop (`7cf7615`).

---

*The Feedback Loop distilled: the system that listens to its own silences learns the loudest lessons.*
