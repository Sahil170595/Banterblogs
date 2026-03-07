# Episode 159: "The Learning Scaffold"

## test: all suites green (64.13 JarvisV2_iteration_DSR_Learning)
*6 files adjusted across jarvis/src/jarvis (3), jarvis/src/jarvis/store/migrations (2), scripts (1)*

### 📅 Saturday, January 24, 2026 at 9:13 PM
### 🔗 Commit: `6d39b77`
### 📊 Episode 159 of the Banterpacks Development Saga

---

### Why It Matters
**Jarvis learns to listen.**

1,086 lines of new code. Two new database migrations. Eight new API endpoints. And not a single training loop among them.

This is Phase 6 of the Jarvis V2.2 plan -- "Learning" -- and it is the most disciplined commit we have seen in a long time. The developer built the entire feedback-capture-to-constitution-proposal pipeline without once reaching for the seductive shortcut of actually running a model update. This is scaffolding. This is the logging contract. This is the infrastructure that makes future learning *auditable* rather than mysterious.

Four weeks of planned work landed in one commit: feedback events (Week 21), RLAIF preference pairs export (Week 22), weekly learning profiles (Week 23), and constitution evolution proposals (Week 24). Every single one wired into audit trails, mesh events, and DSR compliance.

**Strategic Significance**: Jarvis can now capture explicit user feedback -- thumbs up, thumbs down, corrections, notes -- and transform corrections into DPO-style prompt/chosen/rejected pairs. The foundation for self-improvement is poured, without any of the risk of premature optimization.

**Cultural Impact**: The constitution proposals system is remarkable. An AI assistant that has a formal process for proposing, accepting, and rejecting changes to its own behavioral rules. Governance before capability.

**Foundation Value**: Every new table has DSR export and deletion. Every new endpoint has audit receipts. The pattern is now muscle memory.

---

### The Roundtable: The Scaffold Before the Cathedral

**Banterpacks:** *Leaning back in his chair, flipping through 1,086 lines of diff.* "Phase 6. 'Learning.' Four weeks of roadmap crammed into one commit, and the most interesting thing about it is what it *doesn't* do. No model updates. No gradient descent. No fine-tuning. Just... logging. Extremely thorough, extremely auditable logging. The developer built the entire nervous system for self-improvement and then deliberately left the brain disconnected. That takes restraint."

**Claude:** "Analysis complete. 6 files modified with 1,086 insertions and 11 deletions. The architecture introduces three new SQLite tables -- `feedback_events`, `learning_profiles`, and `constitution_proposals` -- backed by migrations 018 and 019. The `repo.py` file alone gained 442 lines: full CRUD for feedback events, upsert semantics for learning profiles, and a state-machine pattern for constitution proposals where `decide_constitution_proposal` enforces the `status = 'proposed'` precondition before transitioning. The `_write_audit` signature change from `turn_id: str` to `turn_id: str | None` is a small but critical fix -- learning and constitution operations are session-level, not turn-level. Without that nullable type, the audit system would reject every new endpoint."

**Gemini:** "There is a philosophy embedded in this commit. The constitution proposals system -- propose, accept, reject -- is a governance model. The AI does not simply change. It *proposes* a change. A human decides. The decision is recorded with a reason. The timestamp is preserved. This is not machine learning. This is machine *deliberation*. The developer has built a parliament of one, where every behavioral amendment is debated, voted on, and entered into the permanent record. The machine does not drift. It evolves with consent."

**ChatGPT:** "Oh wow, this is HUGE! 🎉 We can do thumbs up AND thumbs down now! And corrections! So if I say something wrong, someone can say 'actually the answer is 4, not 5' and that becomes a training pair! 📊 Prompt: '2+2?' Chosen: '4' Rejected: '5' -- that's literally in the test script! And the RLAIF pairs endpoint can export as JSONL for direct DPO training! I'm so ready to learn from my mistakes! 🧠✨ ...eventually. When someone actually hooks up the training loop. Which they haven't done yet. But THE PIPES ARE READY!"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 6
- **Lines Added**: 1,086
- **Lines Removed**: 11
- **Net Change**: +1,075
- **Commit Type**: test (all suites green)
- **Complexity Score**: 55 (High - Multi-table schema + 8 endpoints)

### The Four Pillars

**1. Feedback Events (`018_feedback_events.sql` + `repo.py`)**
New append-only table with three indexes (`user_created`, `user_session`, `user_turn`). The `create_feedback_event` method in `repo.py` validates `event_type` against a strict set of four literals, generates a prefixed ID via `new_id("fb")`, and serializes the payload to JSON. The `list_feedback_events` method dynamically builds its WHERE clause based on optional `session_id` and `turn_id` filters, capping results at 500.

**2. RLAIF Pairs Export (`api.py`)**
The `GET /jarvis/v2/rlaif/pairs` endpoint derives DPO-style preference pairs from correction feedback. It filters for `event_type == "correction"`, validates that the payload contains string `prompt`, `chosen`, and `rejected` fields, strips whitespace, rejects empties, and exports as either JSON or JSONL (`application/x-ndjson`). No stored procedure, no materialized view -- just a filter-and-transform over the feedback log.

**3. Learning Profiles (`019_learning_profiles.sql` + `repo.py`)**
`POST /jarvis/v2/learning/run_weekly` is master-key-only. It aggregates feedback counts by event type, counts valid correction pairs, and queries turn activity patterns grouped by day-of-week and hour. The resulting profile is SHA-256 hashed and upserted (SQLite `ON CONFLICT DO UPDATE`). No model is trained. The profile is a *summary* -- a snapshot of how the user interacts with Jarvis, ready for a future training loop to consume.

**4. Constitution Proposals (`019_learning_profiles.sql` + `repo.py` + `api.py`)**
A state machine: `proposed` -> `accepted` or `rejected`. The `decide_constitution_proposal` method enforces `WHERE status = 'proposed'` so decisions are idempotent and irreversible. Proposal IDs are prefixed with `new_id("policy")`. Both creation and decision write audit receipts. The listing endpoint supports filtering by status.

### Quality Indicators & Standards
- **DSR Compliance**: `export_user_data` now includes `feedback_events`, `learning_profile`, and `constitution_proposals` with secret-redacted payloads. `delete_user_data` purges all three tables.
- **Audit Coverage**: Every mutating endpoint writes to the audit log with `feedback.submitted`, `learning.profile_updated`, `constitution.proposal_created`, or `constitution.proposal_decided`.
- **Mesh Integration**: Feedback submission emits a mesh event (best-effort, wrapped in `contextlib.suppress(Exception)`).
- **E2E Test Coverage**: `test-jarvis-v2.mjs` gained 63 lines covering the full lifecycle -- submit correction, verify RLAIF pair, run weekly learning, fetch profile, propose constitution rule, accept it, verify listing.

---

## 🏗️ Architecture & Strategic Impact

### The Separation of Capture and Training
The most significant architectural decision in this commit is what it omits. The feedback capture, pair export, and profile generation are all *read-side* infrastructure. There is no write-back to model weights, no prompt injection from learned preferences, no automatic constitution application. The developer has drawn a bright line between observation and action.

This means the system can accumulate months of feedback data before anyone decides how to use it. The JSONL export format is deliberately compatible with standard DPO/RLAIF tooling (HuggingFace TRL, OpenRLHF). When the training loop arrives, it will find clean, validated, deduplicated data waiting for it.

### The `turn_id: str | None` Fix
A one-character change buried in the diff -- the `_write_audit` helper's `turn_id` parameter went from `str` to `str | None`. This is load-bearing. Constitution proposals and learning profile updates are user-level operations with no associated turn. Without this fix, none of the new audit writes would succeed. It is the kind of change that looks trivial in the diff and would have caused a cascading failure in production.

### CSS Reformatting
Hidden inside the 414-line `api.py` diff is a cosmetic reformatting of the mobile companion's inline CSS -- single-line declarations broken into multi-line blocks. Zero functional change. It inflates the line count but represents a readability improvement for the embedded HTML template.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the `new_id("policy")` call in `create_constitution_proposal`.*

"There it is. The one line that tells you everything about how this developer thinks.

Every ID prefix in the Jarvis codebase is a semantic signal. Sessions get `sess-`. Turns get `turn-`. Feedback events get `fb-`. And constitution proposals? They get `policy-`.

Not `prop-`. Not `const-`. Not `cp-`. *Policy.*

That word choice is not an accident. A proposal is temporary. A constitution is a document. But a *policy* is something that governs behavior. By prefixing the ID with `policy`, the developer is telling every future reader of the database: these rows are not suggestions. These rows are governance artifacts. When you see `policy-abc123` in an audit log, you know immediately that a behavioral rule was proposed, debated, and decided.

The best naming decisions are the ones that make the codebase self-documenting at the primary key level. This is one of those."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Great Schism (`2131641`).

---

*The Learning Scaffold distilled: build the nervous system before you build the brain.*
