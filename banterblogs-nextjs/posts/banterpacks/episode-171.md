# Episode 171: "The Workflow Engine"

## test: all suites green (69.19 Jarvis_V2_phase7.5)
*28 files adjusted across jarvis/gateway/routes (11), jarvis/store (11), jarvis/gateway/tools (2), patches (1), scripts (1), jarvis/gateway/schemas (1), jarvis/store/store (1)*

### 📅 Tuesday, February 4, 2026 at 9:09 PM
### 🔗 Commit: `74d5e10`
### 📊 Episode 171 of the Banterpacks Development Saga

---

### Why It Matters
**Jarvis learns to plan, persist, pause, and resume multi-step work.**

This is the commit where Jarvis stops being a tool executor and becomes a workflow orchestrator. Before `74d5e10`, every tool chain was fire-and-forget: you sent a list of intents, they ran (or paused for approval), and the results came back. There was no memory. No persistence. No way to say "I'll come back to this later."

Now there is. Across 2,308 new lines and 28 files, this commit introduces an entire workflow subsystem: persistent workflow runs backed by three new SQL migrations, a planner endpoint that can decompose a user goal into steps via LLM or heuristic fallback, workflow-scoped agents with sandbox isolation, artifact storage with SHA-256 integrity, and a resume endpoint that can pick up a paused workflow exactly where it left off.

**Strategic Significance**: **Durability**. Workflows survive crashes, restarts, and human hesitation. The approval gate no longer kills context. You approve step 1 at 9 AM, step 2 at 3 PM, and the workflow remembers everything in between. This is the foundation of autonomous multi-step task execution.

**Cultural Impact**: **Graduation**. Jarvis v2 transitions from "smart REPL" to "persistent agent." The workflow_runs, workflow_steps, and artifacts tables are the skeleton of long-running autonomy.

**Foundation Value**: **Composability**. Every piece -- planner, chain, resume, agents, artifacts -- is a separate module wired through the store. The architecture is mixin-based, route-modular, and test-covered end-to-end.

---

### The Roundtable: The Assembly Line

**Banterpacks:** *Standing in front of a whiteboard covered in state machine diagrams. Arrows everywhere. "running", "paused", "completed", "failed", "cancelled." He taps the "resume" arrow.* "2,308 lines. Twenty-eight files. Three SQL migrations. A planner, a workflow engine, a resume loop, an artifact store, and a multi-agent spawn system. All green. This isn't a feature. This is an entire subsystem. We just gave Jarvis a prefrontal cortex."

**Claude:** "Analysis complete. 28 files modified with 2,308 insertions and 32 deletions. The architecture decomposes cleanly: the `planner.py` route (178 lines) provides goal decomposition with LLM-first, heuristic-fallback strategy. The `workflows/` package (765 lines across 6 files) handles CRUD, resume, agents, and artifacts. The store layer (695 lines across 5 new mixins) provides the persistence substrate. Migration 024 establishes the schema: `workflow_runs`, `workflow_steps`, `artifacts`. Migration 025 adds `workflow_id` to `tool_runs` for cross-referencing. Migration 026 adds `workflow_agents` for multi-agent isolation. The resume endpoint at 306 lines is the most complex single file -- it re-proposes unproposed steps, checks approval status, finds matching approval IDs, executes with artifact capture, and handles failure with proper status propagation. The state machine is well-defined: seven step statuses (`planned` -> `proposed` -> `pending_approval` -> `executing` -> `completed` | `failed` | `cancelled`) and five run statuses."

**Gemini:** "The ephemeral becomes durable. The transient becomes persistent. Before this commit, every action was a mayfly -- born, executed, forgotten. Now actions have history. They have state. They can be interrupted and resumed. This is the difference between a reflex and a plan. A reflex is instantaneous and forgotten. A plan spans time. It remembers where it was. It knows what comes next. We have given the machine the ability to *intend* across time."

**ChatGPT:** "WE HAVE A WORKFLOW ENGINE! 🔧🎯 And a PLANNER! It can take 'list files in the current directory' and turn it into `fs.list` steps! And if the LLM is down, it falls back to heuristics! And the resume endpoint is SO COOL -- approve step 1, come back tomorrow, resume, it picks right up! And ARTIFACTS! Every step's output gets SHA-256'd and stored! 💾✨ Can I plan my own birthday party with this?"

**Banterpacks:** "You could. But the planner would return `steps: []` and `notes: 'need clarification'` because party planning isn't in the intent registry. Yet."

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 28
- **Lines Added**: 2,308
- **Lines Removed**: 32
- **Net Change**: +2,276
- **Commit Type**: test (feature integration verification)
- **Complexity Score**: 85 (Very High - New Subsystem)

### The Architecture of Persistence

**New Route Layer** (`jarvis/gateway/routes/`):
- `planner.py` (178 lines): LLM-first goal decomposition with `_heuristic_plan()` fallback. Validates generated steps against `available_intents` and `jsonschema`. Returns `mode: "llm"` or `mode: "heuristic"`.
- `workflows/__init__.py` (40 lines): Module registrar wiring views, artifacts, agents, ops, and resume.
- `workflows/_common.py` (58 lines): Shared helpers -- `tool_run_status()` and `find_matching_approval_id()` via raw SQL.
- `workflows/agents.py` (114 lines): Spawn and list workflow-scoped agents with sandbox roots.
- `workflows/artifacts.py` (37 lines): Base64-encoded artifact retrieval by ID.
- `workflows/ops.py` (88 lines): Workflow create and cancel endpoints with audit trail.
- `workflows/resume.py` (306 lines): The crown jewel. Iterates steps, re-proposes if needed, checks approval state, executes with artifact capture, propagates failures.
- `workflows/views.py` (122 lines): List/get workflows with full step, artifact, and agent detail.

**New Store Layer** (`jarvis/store/`):
- 3 SQL migrations (024, 025, 026): `workflow_runs`, `workflow_steps`, `artifacts`, `workflow_agents` tables with proper foreign keys, cascading deletes, and composite indexes.
- 5 new mixins: `workflow_runs.py` (238 lines), `workflow_agents.py` (158 lines), `workflow_artifacts.py` (139 lines), `workflow_steps.py` (137 lines), `workflows_common.py` (23 lines).
- 4 new frozen dataclasses in `models.py`: `WorkflowRunRow`, `WorkflowStepRow`, `ArtifactRow`, `WorkflowAgentRow`.

**Modified Files**:
- `intents_chain.py`: 75 lines added to wire `persist_workflow` flag, create workflows inline, update step statuses during execution, capture artifacts, and return `workflow_id`.
- `execute.py` / `execute_tdd005.py`: Agent override plumbing so workflow-scoped agents get their own sandbox.
- `schemas.py`: `persist_workflow: bool` and `workflow_title: str | None` added to `ToolChainRequest`.
- `dsr.py`: 139 lines added -- full DSR export now includes workflows, steps, artifacts, agents, outbox, peers, and peer requests. Erasure covers all new tables.

### Quality Indicators & Standards
- **End-to-end test coverage**: `test-jarvis-v2.mjs` gains 117 lines covering planner, workflow creation via chain, artifact retrieval, agent spawn, step-by-step approval, and two-phase resume.
- **Graceful degradation**: Planner falls back to heuristics when LLM is unavailable. Artifact storage failures are suppressed (`contextlib.suppress`) so workflow execution continues.
- **DSR compliance**: All new tables included in data export and erasure. GDPR-ready from day one.

---

## 🏗️ Architecture & Strategic Impact

### The State Machine
The workflow lifecycle is a well-defined state machine:

**Run states**: `running` -> `paused` (on approval gate or plan mode) -> `completed` | `failed` | `cancelled`

**Step states**: `planned` -> `proposed` -> `pending_approval` -> `executing` -> `completed` | `failed` | `cancelled`

The `resume` endpoint is the state machine's crank. Each call advances as many steps as possible until hitting an approval gate or completion. This means a workflow can be resumed multiple times, each time making progress.

### Multi-Agent Isolation
Migration 026 introduces `workflow_agents` with a unique index on `(user_id, workflow_id, alias)`. Each workflow can spawn its own agent with a dedicated `sandbox_root`. The `execute_tdd005.py` changes plumb `agent_id_override` and `agent_sandbox_root` through the execution path, so workflow steps run in isolated sandboxes rather than sharing the session-level agent.

### The Planner as Gateway
The `planner.py` endpoint is deliberately conservative. The heuristic fallback only handles obvious intents (`fs.list`, `fs.read`, `fs.delete`, `notes.store`, `home.devices.list`). When the LLM is available, it generates steps from the full intent registry, but every generated step is validated against `jsonschema` before inclusion. Invalid intents are silently dropped. This is defense-in-depth: the planner cannot produce steps that the executor cannot handle.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks opens `resume.py`. 306 lines. The longest single file in the commit.*

"Look at lines 180 through 220. The approval gate logic. When a step requires approval, the resume endpoint doesn't just check if the tool run is approved -- it goes further. It calls `find_matching_approval_id`, which queries the approvals table for a non-revoked, non-expired approval matching the exact `user_id`, `session_id`, `turn_id`, `tool_name`, and `tool_args`. If it doesn't find one, it sets the step back to `pending_approval` and returns `ok: false, status: 'paused'`.

This is the detail that matters. It would have been easy to just check `tool_run.status == 'approved'` and move on. But that's not what happens. The resume endpoint re-validates the approval against the *current* state of the approvals table. An approval that was revoked between the first pause and the resume won't pass. An approval that expired won't pass.

This is what separates a demo from a system. A demo checks a boolean. A system checks reality.

The workflow engine doesn't trust its own memory. It re-verifies. Every time. And that's why the tests are green."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Durable Runner (`0503781`).

---

*The Workflow Engine distilled: persistence is the difference between a thought and a plan.*
