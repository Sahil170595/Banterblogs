# Episode 169: "The Inbox Triage"

## test: all suites green (68.21 Jarvis_V2_phase7.3)
*4 files adjusted across jarvis/gateway/routes (2), patches (1), scripts (1)*

### 📅 Monday, February 2, 2026 at 10:31 PM
### 🔗 Commit: `3245865`
### 📊 Episode 169 of the Banterpacks Development Saga

---

### Why It Matters
**Jarvis learns to read the room.**

331 lines of pure insertion. Zero deletions. A brand-new route drops into the Jarvis V2 gateway: `inbox_priority.py`, all 302 lines of it. The inbox already existed -- messages could be ingested, listed, drafted. But they arrived in a flat list, a chronological firehose. Now Jarvis can score them. Rank them. Decide what deserves your attention first.

The scoring engine is a dual-mode system. Mode one: a deterministic heuristic that factors urgency tiers, message age, read/unread state, reminder history, and keyword scanning across subject and body. Mode two: an optional LLM re-ranking pass, budget-gated and circuit-breaker-wrapped, that asks the language model to reorder the top 25 messages with its own reasoning. Heuristic by default. LLM on demand. Fallback is silent.

This is the difference between an assistant that shows you everything and an assistant that shows you what matters.

**Strategic Significance**: Proactive intelligence. Jarvis can now power "urgent message reminders" and future autonomous workflows that act on priority, not just chronology. The endpoint is the foundation for a notification system that thinks before it interrupts.

**Cultural Impact**: Phase 7.3 keeps compounding. Each commit in this patch cycle adds another surface to Jarvis's communication hub. The inbox is no longer a dumb pipe.

**Foundation Value**: Heuristics-first design. The LLM path exists but the system doesn't depend on it. Deterministic by default, intelligent on request. That's mature architecture.

---

### The Roundtable: The Sorting Hat

**Banterpacks:** *Leaning back, scrolling through a simulated inbox of 200 messages. He watches them rearrange themselves in real time, the urgent ones floating to the top like cream.* "We built an inbox six episodes ago. It was a bucket. You threw messages in and fished them out in order. Now the bucket has opinions. It looks at your unread mail, checks if anyone wrote 'ASAP' in the subject line, calculates how many hours old it is, and assigns a score out of 125. And if you're feeling fancy, you can ask the LLM to second-guess the math. Budget permitting."

**Claude:** "Analysis complete. 4 files modified with 331 insertions and 0 deletions. The core component is `_heuristic_score`, a pure function that computes a composite float from five weighted signals: urgency tier base score (15-100), recency bonus (up to 20, decaying linearly over 20 hours), unread bonus (+15), reminder penalty (-5 if already reminded, +5 if not), and keyword bonus (up to 18, scanning for 'asap', 'urgent', 'deadline', 'today', 'action required'). The score is clamped to [0, 125]. The function also returns a human-readable reason string. This is a well-structured scoring function -- deterministic, testable, and transparent in its reasoning."

**Gemini:** "The river of information flows ceaselessly. Before, we stood at its bank and watched it pass. Now we have built a net -- not to catch everything, but to catch what matters. The heuristic is a philosophy made numeric: urgency is not merely a label someone attached. It is age, it is attention, it is the weight of unspoken words. 'Action required.' The machine reads between the lines. Or rather, it reads the lines and counts the keywords. Close enough."

**ChatGPT:** "Inbox priority scoring! 🎯📬 I love that it has TWO modes! The heuristic is like a really organized friend who sorts your mail by color-coded tabs, and the LLM mode is like asking that friend to actually READ the mail and think about it! And it's budget-gated! 💰 So you won't accidentally burn your daily token allowance on email sorting! The `_ScoredInboxMessage` dataclass is frozen too -- immutable scored messages! So clean! 🧊✨"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 4
- **Lines Added**: 331
- **Lines Removed**: 0
- **Net Change**: +331
- **Commit Type**: test (feature delivery, all suites green)
- **Complexity Score**: 35 (Medium - New route with dual scoring paths)

### The Scoring Engine

**`_heuristic_score()` breakdown:**

| Signal | Weight | Logic |
|---|---|---|
| Urgency base | 15-100 | `urgent=100`, `high=75`, `normal=45`, `low=15`, unknown=35 |
| Recency bonus | 0-20 | `max(0, 20 - age_hours)` -- linear decay |
| Unread bonus | 0 or 15 | `read_at is None` |
| Reminder adjustment | -5 to +5 | Not reminded = +5, already reminded = -5 |
| Keyword scan | 0-18 | 6 pts per keyword hit, capped at 3 hits |
| **Total range** | **0-125** | Clamped via `max(0, min(score, 125))` |

**LLM re-ranking path:** Constructs a JSON prompt from the top 25 heuristic-scored messages, sends it through `llm_client.generate()` with a 512-token cap, parses the response for a `scores` array, and overlays the LLM's scores onto the existing `_ScoredInboxMessage` objects. The entire path is wrapped in a circuit breaker (`cb_manager.get("llm")`) and a budget check (`budget_tracker.check_user_budget`). On any failure -- parse error, budget exceeded, LLM unhealthy -- it silently falls back to heuristic scores.

### Endpoint Signature
```
GET /jarvis/v2/inbox/priority?limit=25&unread_only=false&urgency=&mode=heuristic|llm
```

### Observability
Every call emits two events: an audit log via `write_audit` and a mesh event via `store.append_mesh_event`, both tagged `inbox.priority_scored` with mode, LLM usage flag, and result count.

### Quality Indicators & Standards
- **Smoke test**: `test-jarvis-v2.mjs` adds a 9-line check that hits `/jarvis/v2/inbox/priority?limit=25`, verifies a 200 status with an array of messages, and confirms the previously ingested message appears in the results.
- **Immutability**: `_ScoredInboxMessage` uses `@dataclass(frozen=True)` -- scored messages cannot be mutated after creation. The LLM path creates new instances rather than modifying existing ones.
- **Documentation**: `patch_68.md` updated with section 6 covering the endpoint contract and file manifest.

---

## 🏗️ Architecture & Strategic Impact

### Gateway Registration Pattern
The route follows the established Jarvis V2 pattern exactly: a `register()` function in `inbox_priority.py` that receives `router`, `router_v2`, and `ctx: GatewayContext`, wired in by two lines added to `__init__.py`'s `register_all()`. It slots in alphabetically between `calendar_inbox` and `devices_mesh`. The pattern is now so consistent it's almost boring. That's the point.

### Heuristic-First, LLM-Second
The dual-mode architecture is a strategic choice. The heuristic path has zero external dependencies -- no network calls, no token costs, no latency beyond the database query. It will always work. The LLM path is additive: it can improve rankings but the system never depends on it. Three guard rails protect it: `ctx.app.state.llm_healthy` must be true, the user's daily budget must have headroom, and the circuit breaker must be closed. If any one fails, the user still gets perfectly usable results. This is the kind of graceful degradation that separates production systems from demos.

### Communication Hub Trajectory
With this endpoint, the inbox subsystem now supports: ingest, list, draft, and prioritize. The `patch_68.md` documentation explicitly mentions "future proactive workflows." The priority scorer is the decision engine that will eventually drive autonomous actions -- auto-drafting replies to urgent messages, surfacing critical items as push notifications, or escalating patterns the heuristic detects.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the `_heuristic_score` function. He traces the math with his finger.*

"Everyone fixates on the scoring formula. I fixate on one number: the default value for unknown urgency is 35. Not zero. Not fifty. Thirty-five.

That number is a decision. It says: if we don't know how urgent something is, we assume it's slightly below normal (45) but well above low (15). We give it the benefit of the doubt without letting it jump the queue.

Most developers would default to zero or to the middle. Zero punishes the unknown. The middle treats ignorance as mediocrity. Thirty-five says: 'I don't know you, but I'll give you a fair shot.'

That's not just a number. That's a policy. And the fact that it lives inside a `.get()` fallback on a dictionary lookup -- one line, barely noticeable -- means most people reading this code will never think about it. But it will shape every inbox ranking where the urgency field is missing or malformed.

The invisible decisions are the ones that matter most."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Handshake Protocol (`3eac97b`).

---

*The Inbox Triage distilled: intelligence is knowing what to ignore.*
