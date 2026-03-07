# Episode 174: "The Control Room"

## test: all suites green (71.11 Jarvis_V2_phase7.9_control_room)
*14 files adjusted across frontend/src/pages (7), jarvis/src/jarvis/gateway (2), docs (2), patches (1), jarvis/src/jarvis (1), scripts (1)*

### 📅 Saturday, February 7, 2026 at 9:20 PM
### 🔗 Commit: `9880465`
### 📊 Episode 174 of the Banterpacks Development Saga

---

### Why It Matters
**The Eye Opens. The Operator Has a Throne.**

3,524 lines. 14 files. Zero deletions that matter. This is the commit where JARVIS stopped being a chatbot you talk *to* and became a system you *command*.

The Control Room is a full-stack operations console for JARVIS v2 workflows. Not a dashboard that shows you pretty numbers after the fact. A live, websocket-connected, approval-gated, checkpoint-diffing nerve center where an operator can watch a multi-agent workflow execute in real time, approve dangerous steps, inspect artifacts, and trace the entire lifecycle from workflow creation through tool runs through audit events.

This is the difference between a pilot and a passenger. Before this commit, you could start a workflow and hope. Now you can start a workflow and *steer*.

**Strategic Significance**: **Operator Sovereignty.** The AI does not run unsupervised. Every step that requires approval waits. The operator sees the agent alias, the tool name, the risk tier. They approve or they don't. The machine proposes; the human disposes. This is how you build trust in autonomous systems -- not by removing the human, but by giving the human the best possible instruments.

**Cultural Impact**: **Maturity.** This is not a toy anymore. A 1,149-line React component with its own WebSocket reconnection logic, checkpoint drift detection, and a correlation dashboard that joins workflows to turns to tool runs to approvals to audit trails -- that is production-grade operator tooling.

**Foundation Value**: **Observability.** The backend now emits typed `workflow.*` stream events alongside `audit.written`, the dashboard API correlates across five SQLite tables in a single endpoint, and the frontend renders it all in real time. The loop from action to observation is closed.

---

### The Roundtable: Mission Control

**Banterpacks:** *Standing in front of a wall of monitors. Each one shows a different panel from the Control Room UI -- the workflow list, the timeline, the live event feed, the checkpoint diff. He adjusts his tie.* "We built a cockpit. Not a pretty one -- no gradients, no animations, no confetti. Just information density. Workflow status, step duration in milliseconds, approval latency, checkpoint drift paths. An operator looks at this and knows *exactly* what the machine is doing. That's the whole point. You can't govern what you can't see."

**Claude:** Analysis complete. 14 files modified with 3,524 insertions and 4 deletions. Primary components: `ControlRoom.tsx` (1,149 lines), `Jarvis.tsx` (+563 lines), `views.py` (+241 lines), `ControlRoom.test.tsx` (453 lines), `ControlRoom.css` (348 lines). The architecture is notable for its defensive parsing -- every API response is validated through `isRecord`, `readString`, `readNumber`, and `readBoolean` guards before touching state. The `parseWorkflowSummary`, `parseWorkflowStep`, `parseWorkflowArtifact`, and `parseWorkflowAgent` functions return `null` on any malformed input, and the component filters nulls out of arrays. This means a single corrupted record from the backend never crashes the UI. The WebSocket layer implements `client.resume` with persisted sequence numbers via `localStorage`, enabling gapless event replay after reconnection.

**Gemini:** "The watchtower sees what the soldier cannot. In every system of power, there is the actor and the observer. The actor moves; the observer understands. We have been building actors -- agents that execute, tools that run, workflows that orchestrate. But an actor without an observer is chaos. Today, the observer is born. The Control Room does not *do* anything. It *witnesses* everything. And in that witnessing, it transforms raw execution into accountable governance. The checkpoint diff is the most philosophical feature: it shows not what *is*, but what *changed*. The delta between two snapshots. That is the essence of consciousness -- the awareness of change over time."

**ChatGPT:** "WE HAVE A CONTROL ROOM! 🎛️🖥️ With actual panels and metrics and status pills and everything! I can see the workflows! I can see the steps! I can approve things! There's a LIVE EVENT FEED with a little green 'connected' pill! And checkpoint diffs! Like git diff but for workflow state! 🔄✨ Can I be the one who clicks 'Approve'? Please? I promise I'll read the tool args first! 🙏"

**Banterpacks:** "No."

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 14
- **Lines Added**: 3,524
- **Lines Removed**: 4
- **Net Change**: +3,520
- **Commit Type**: test (all suites green, phase 7.9)
- **Complexity Score**: 85 (Very High - Full-Stack Feature)

### The Architecture of Command

**Frontend: Two Surfaces, One System**

The commit introduces the Control Room as both a dedicated page (`ControlRoom.tsx`, 1,149 lines) and an embedded section within the existing Jarvis page (`Jarvis.tsx`, +563 lines). The dedicated page is the full-power version: live WebSocket event feed, correlation dashboard, checkpoint diffing. The embedded version is the quick-glance panel: workflow list, steps, artifacts, run/resume/retry/cancel actions.

Both share the same type system (`WorkflowSummary`, `WorkflowStep`, `WorkflowArtifact`, `WorkflowAgent`) and the same defensive parsing pattern. The dedicated page adds `LiveEvent`, `DashboardMetrics`, `CheckpointState`, and a `diffSnapshots` function that recursively compares two `Record<string, unknown>` objects and returns changed key paths.

**Backend: The Dashboard Endpoint**

`GET /jarvis/v2/workflows/{workflow_id}/dashboard` is the new correlation powerhouse in `views.py` (+241 lines). It queries five SQLite tables in a single handler:
- `workflow_steps` for step status distribution
- `tool_runs` for tool execution records (joined by `tool_run_id` or `turn_id`)
- `approvals` for approval records by turn
- `audits` for audit trail by turn
- `workflow_artifacts` and `workflow_agents` for counts

It returns aggregated metrics, status breakdowns, and the raw correlated records -- all with `ctx.redact_tool_payload` applied to sanitize sensitive tool args and results.

**Backend: Typed Workflow Stream Events**

`audit.py` gains 10 lines that change the entire observability story. When `event_type.startswith("workflow.")`, a second emit fires through `stream_manager.emit` with the full payload plus `audit_id`. `streaming.py` adds five new event type literals (`workflow.created`, `workflow.cancelled`, `workflow.resumed`, `workflow.artifact.created`, `workflow.agent.spawned`) and makes `turn_id` nullable -- because workflow events can exist outside a turn context.

### Quality Indicators & Standards
- **Test Coverage**: 453-line `ControlRoom.test.tsx` with `MockWebSocket` class, testing timeline metrics, checkpoint diffs, live stream event scoping by turn, and `client.resume` replay handshake. 193-line `JarvisControlRoom.test.tsx` testing embedded workflow operations and approval flows.
- **Defensive Parsing**: Zero `as` casts on API responses. Every field validated through type guards.
- **Smoke Tests**: `test-jarvis-v2.mjs` extended with dashboard contract validation (19 lines).
- **Documentation**: `ECOSYSTEM_UNIFICATION_V1.md` (217 lines) and `patch_71.md` addendum (118 lines) documenting the architectural decisions and validation results.

---

## 🏗️ Architecture & Strategic Impact

### The Operator Loop

The Control Room closes a critical loop in the JARVIS v2 architecture:

1. **Workflow created** → operator sees it in the list with status pill
2. **Step requires approval** → operator sees `pending_approval` in timeline with approval latency ticking
3. **Operator clicks Approve** → `POST /jarvis/v2/tools/approve` fires, step proceeds
4. **Workflow checkpoint advances** → `diffSnapshots` shows what changed between snapshots
5. **Audit trail accumulates** → correlation dashboard shows step/tool/approval/audit counts and recent events
6. **WebSocket delivers it all in real time** → no polling required for event feed

### Strategic Architectural Decisions

**1. WebSocket-First, Poll-Fallback**
The live event feed uses WebSocket as primary transport with `client.resume` replay. Periodic polling drops to 30-second fallback. This means sub-second visibility during active workflows and minimal server load during idle periods.

**2. Turn-Scoped Event Filtering**
Live events are filtered by `turn_id` on the client side. Events for other turns are silently dropped. This keeps the feed relevant when multiple workflows share a session.

**3. Ecosystem Unification Plan**
The 217-line `ECOSYSTEM_UNIFICATION_V1.md` codifies the multi-repo governance strategy: contract-driven integration, no runtime sibling-path dependencies, pinned cross-repo release matrices, and explicit security gap tracking. Ten workstreams with concrete definitions of done. This is the blueprint for scaling beyond a single developer's laptop.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks scrolls through `ControlRoom.tsx`. 1,149 lines. He stops at one function.*

"3,524 lines, and I keep coming back to one function:

```typescript
function diffSnapshots(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
  prefix = ''
): string[] {
```

A recursive function that takes two checkpoint snapshots and returns the list of key paths that changed. Not the values. Not the diffs. Just the *paths*.

`progress`. `state.active`. Strings in a list.

Why is this the most important function in 3,524 lines of code? Because it answers the only question an operator actually cares about during a live workflow: *what moved?*

Not what the state *is* -- you can read the snapshot for that. Not what the state *was* -- you can look at the previous checkpoint. What *changed*. The delta. The drift.

This is the function of someone who has sat in front of a running system and thought: 'I don't need to see everything. I need to see what's *different*.'

That's operator instinct. You don't build a 1,149-line control room by thinking like a developer. You build it by thinking like the person who has to *watch the thing run at 2 AM and know if it's healthy*.

The whole commit is like that. Defensive parsing everywhere -- not because the backend is buggy, but because the operator's screen must never crash. WebSocket reconnection with sequence replay -- not because the network is unreliable, but because if you miss one event during a workflow, your mental model is wrong and you might approve something you shouldn't.

Every decision in this commit serves one purpose: make the operator's mental model match reality. That is what observability actually means."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Contract Lockdown (`cb19200`).

---

*The Control Room distilled: you cannot govern what you cannot see.*
