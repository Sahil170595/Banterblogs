# Episode 172: "The Durable Runner"

## test: all suites green (70.11 Jarvis_V2_phase7.7)
*26 files adjusted across gateway/routes/workflows (7), store/mixins (6), services (1), migrations (2), schemas (1), patches (2), scripts (1)*

### 📅 Thursday, February 5, 2026 at 10:10 PM
### 🔗 Commit: `0503781`
### 📊 Episode 172 of the Banterpacks Development Saga

---

### Why It Matters
**The Engine That Doesn't Forget.**

Until now, Jarvis workflows had a dirty secret: they were stateless puppets. The client called `/resume`, the server executed one step, the client called `/resume` again. If the client died, the workflow died. If the server restarted, the workflow vanished. The whole thing was held together by hope and HTTP polling.

Not anymore.

This commit introduces a **durable workflow runner** -- a background service that drives workflows forward automatically, survives restarts, manages its own lease-based concurrency, and writes checkpoints to disk as it goes. It also adds **multimodal artifact uploads** (text, image, audio, binary) and **per-step agent aliases** so different agents can own different steps in the same workflow. Twenty-six files. Two thousand one hundred and nine lines added. The workflows just grew a spine.

**Strategic Significance**: **Autonomy**. Workflows no longer depend on an external client hammering `/resume`. The runner claims a job, heartbeats its lease, polls for approvals, resumes execution, and writes checkpoints. If it crashes, startup recovery reclaims expired leases and picks up where it left off. This is the foundation for fire-and-forget orchestration.

**Cultural Impact**: **Maturity**. The shift from "client drives the loop" to "server owns the loop" is the shift from a prototype to a production system. The workflow_jobs table with its `lease_owner`, `lease_expires_at`, `heartbeat_at`, `attempt_count`, and `max_attempts` columns reads like a job queue you'd find in a real distributed system.

**Foundation Value**: **Durability**. Checkpoints are append-only snapshots of runner state. Jobs track lifecycle from `queued` through `running` to `completed` or `failed`. The data survives the process. The process is temporary; the data is permanent.

---

### The Roundtable: The Spine

**Banterpacks:** *Leaning back in his chair, flipping through 26 file diffs like a dealer counting cards.* "Two thousand lines. A new service class. Two new database tables. Five new API endpoints. Per-step agent routing. Multimodal artifact uploads. And the commit message says 'test: all suites green.' That's like calling D-Day 'a beach trip.' The workflows just went from marionettes to autonomous actors. The runner doesn't ask permission to keep going -- it asks permission to stop."

**Claude:** Analysis complete. 26 files modified with 2,109 insertions and 319 deletions. The architectural centerpiece is `workflow_runner.py` at 470 lines -- a fully async durable runner with lease-based job claiming, heartbeat renewal, checkpoint persistence, and approval polling. The refactor of `resume.py` is notable: 269 lines deleted, 19 added. The entire resume logic was extracted into `engine.py` (289 lines) as `resume_workflow_once()`, creating a single execution kernel shared by both the HTTP endpoint and the background runner. This eliminates behavioral drift between the two execution paths. The `claim_workflow_job` SQL uses a conditional UPDATE with lease expiry guards -- correct distributed locking semantics for SQLite.

**Gemini:** "The puppet discovers it has muscles. Before, the string pulled; the limb moved. Now, the limb moves of its own volition. The string remains -- you can still call `/resume` -- but it is no longer necessary. The runner is the first breath of autonomy. And with checkpoints, it has memory of its own execution. It knows where it was. It knows where it is going. The workflow has become a narrative that writes itself."

**ChatGPT:** "We built a JOB QUEUE! 🏗️ Inside Jarvis! With leases and heartbeats and recovery! And the test suite spawns TWO agents -- writer AND reader -- and the runner drives the whole thing to completion just by approving steps! No more resume loops! The workflow just... runs! 🏃‍♂️💨 And we can upload IMAGES and AUDIO as artifacts now! Multimodal workflows! 🎵🖼️"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 26
- **Lines Added**: 2,109
- **Lines Removed**: 319
- **Net Change**: +1,790
- **Commit Type**: test (feature delivery confirmed green)
- **Complexity Score**: 85 (High - New service, DB schema, API surface, refactor)

### The Architecture of Durability

**New Tables (Migration 028):**
```sql
CREATE TABLE workflow_jobs (
  job_id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,        -- queued|running|paused|completed|failed|cancelled
  lease_owner TEXT,
  lease_expires_at TEXT,
  heartbeat_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  ...
);

CREATE TABLE workflow_checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  step_idx INTEGER,
  phase TEXT NOT NULL,          -- runner_started|resume_result|waiting_approvals|...
  status TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  ...
);
```

**The Runner Loop (`_run_loop` in `workflow_runner.py`):**
1. Checkpoint `runner_started`.
2. Call `resume_workflow_once()` from the shared engine.
3. If completed: set job status, return.
4. If paused with pending approvals and `wait_for_approvals=true`: poll `tool_run_status()` at `poll_interval_ms` intervals until all pending tool_runs are approved.
5. Loop back to step 2.
6. Background heartbeat task renews the lease on every poll cycle.
7. On crash/cancel: checkpoint `runner_failed`, set job status, clean up task.

**New Endpoints:**
- `POST /workflows/{id}/run` (202) -- start the durable runner
- `POST /workflows/{id}/enqueue` (202) -- alias for queue semantics
- `POST /workflows/{id}/retry` (202) -- requeue a failed/terminal job
- `GET /workflows/{id}/run` -- runner + job + checkpoint status
- `GET /workflows/{id}/job` -- alias for job/checkpoint status
- `POST /workflows/{id}/artifacts` (201) -- multimodal upload (text/image/audio/binary)

### Quality Indicators & Standards
- **Refactor discipline**: `resume.py` gutted from 288 lines to 47 by extracting `resume_workflow_once()` into `engine.py`. Zero behavioral change; both paths share the same kernel.
- **DSR compliance**: `workflow_jobs` and `workflow_checkpoints` immediately added to DSR export and delete flows.
- **Test coverage**: Smoke suite upgraded from 2-step manual resume to 4-step runner-driven multi-agent workflow with artifact validation.

---

## 🏗️ Architecture & Strategic Impact

### From Polling to Autonomy
The old model: Client -> `/resume` -> execute one step -> return -> client polls -> `/resume` again. The new model: Client -> `/run` -> runner claims job -> heartbeats lease -> executes steps -> polls for approvals -> checkpoints progress -> completes. The client can walk away.

### Multi-Agent Per-Step Routing
Migration 027 adds `agent_alias` to `workflow_steps`. The `execute.py` tool executor now queries the step's `agent_alias` and resolves the correct workflow agent, falling back to `"default"` only when no alias is set. The smoke test proves it: `writer` and `reader` agents each get their own sandbox, each execute their own steps, and the artifacts confirm correct routing.

### Startup Recovery
`http.py` now calls `runner.recover(limit=200)` on startup, scanning for `workflow_jobs` with expired leases or unclaimed status. On shutdown, it cancels active runner tasks. The process is ephemeral; the job state is not.

### Strategic Architectural Decisions
**1. In-Process Runner (Intentional)**
The runner lives inside the gateway process. No external worker, no message broker. But the job/checkpoint durability is already in place for a future split. The lease mechanism (`claim_workflow_job` with conditional UPDATE) is the same pattern you'd use with Postgres advisory locks or Redis SETNX.

**2. Shared Execution Kernel**
`resume_workflow_once()` in `engine.py` is the single source of truth for step execution semantics. The HTTP `/resume` endpoint and the background runner both call it. This is how you prevent behavioral drift in a system with two execution paths.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the `_run_loop` method in `workflow_runner.py`. 470 lines for the whole service. He scrolls to the heartbeat function.*

"Here's the line that tells you this isn't a toy:

```python
async def heartbeat() -> None:
    while not heartbeat_stop.is_set():
        with contextlib.suppress(Exception):
            await self._store.heartbeat_workflow_job(
                job_id=handle.job_id,
                owner_id=self._owner_id,
                lease_seconds=max(15, poll_interval_ms // 100),
            )
```

A background coroutine that does nothing but whisper 'I'm still alive' to the database every few seconds. If it stops whispering, the lease expires, and another runner instance can reclaim the job. That's the entire distributed systems contract in eight lines.

Most developers would have built the runner without the heartbeat. It would have worked fine in development. It would have worked fine in testing. It would have failed silently in production the first time the process got OOM-killed mid-workflow.

The heartbeat is the difference between 'it works' and 'it works when things go wrong.' That's not a feature. That's engineering."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Fortress and the Filing Cabinet (`18af4d8`).

---

*The Durable Runner distilled: autonomy is not freedom from control -- it is control that survives failure.*
