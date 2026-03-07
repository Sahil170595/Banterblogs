# Episode 156: "The Virtual House"

## test: all suites green (61.11 JarvisV2_iteration_home_integration)
*13 files adjusted across jarvis/api (1), jarvis/config (1), jarvis/smart_home (3), jarvis/store (2), jarvis/tools (2), config (2), patches (1), scripts (1)*

### 📅 Wednesday, January 21, 2026 at 9:29 PM
### 🔗 Commit: `02325d9`
### 📊 Episode 156 of the Banterpacks Development Saga

---

### Why It Matters
**Jarvis can control your house now. Sort of.**

1,314 lines of new code. A brand-new `smart_home/` module. A database migration. Two new tools in the catalog. API endpoints on both v1 and v2 routers. And the quiet, pragmatic decision that made all of it possible: you don't need real hardware to build a real integration.

Phase 3 of the V2.2 plan is "Smart Home." The spec calls for Matter protocol support, the industry standard for IoT interop. But Matter hardware is expensive, flaky, and not guaranteed in a local dev environment. So what did we do? We built a **virtual bridge** first. A SQLite-backed device store that behaves truthfully -- it actually updates state in the database. No mocks that lie. No stubs that pretend. Real state transitions, real persistence, real CRUD. And when the hardware shows up? Swap in the HTTP Matter bridge via `deps.matter_url` and the controller routes to real devices without changing a single line of business logic.

**Strategic Significance**: **Reach**. The AI is no longer confined to the screen. It can dim lights, set thermostats, lock doors. The `home.write` scope means physical-world commands are default-deny, approval-gated, and audit-logged. This is operator-grade home automation behind a consent barrier.

**Cultural Impact**: **Pragmatism**. Building the virtual bridge first is a masterclass in unblocking yourself. Don't wait for the hardware. Build the contract. Ship the tests. The hardware will conform to you.

**Foundation Value**: **Extensibility**. The `kind`-based command dispatch in `controller.py` (light, thermostat, lock) is a clean pattern that will absorb every new device type without architectural changes.

---

### The Roundtable: The Ghost House

**Banterpacks:** *Standing in front of a blueprint of a house. Every room is labeled with SQLite table names. The thermostat reads `{"temperature_c": 21.5}`.* "We built a house inside a database. Every light, every lock, every thermostat -- rows in `home_devices`, state stored as JSON, updated through the same tool pipeline that handles file reads and agent executions. And the beautiful part? When the real Matter bridge arrives, the controller doesn't care. It just stops talking to SQLite and starts talking to HTTP. Same interface. Same approval flow. Same audit trail."

**Claude:** "Analysis complete. 13 files modified with 1,314 insertions and 17 deletions. Primary components: `api.py` (+571 lines), `store/repo.py` (+173 lines), `smart_home/controller.py` (+161 lines). The architecture is a clean strategy pattern: `SmartHomeController` checks for a `MatterBridgeClient` instance. If present, it delegates to HTTP. If absent, it falls back to the virtual store. The `_requires_approval` function consolidates three duplicate inline checks into a single policy gate, scanning for `home.write`, `fs.delete`, `agent.execute`, and any scope ending in `.write`, `.delete`, or `.execute`. The migration `014_home_devices.sql` indexes on `(user_id, created_at)` for efficient per-user listing."

**Gemini:** "The house that does not exist is the most honest house of all. It does not pretend to have walls. It does not pretend to have wires. It has only state and transitions. And when the walls arrive, the state will fill them. We have built a Platonic house -- the form of a house -- and the physical house will be its shadow."

**ChatGPT:** "WE HAVE A SMART HOME! 🏠💡🔒🌡️ I can turn on lights! Well... virtual lights. But they ACTUALLY change state in the database! And I need APPROVAL to do it because it's `risk_tier: high`! Responsible home automation! Can I name my first virtual light 'Mr. Bright'? 🌟"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 13
- **Lines Added**: 1,314
- **Lines Removed**: 17
- **Net Change**: +1,297
- **Commit Type**: test (feature integration, all suites green)
- **Complexity Score**: 55 (High - New subsystem + API + DB migration)

### The Architecture of Control

**New module**: `jarvis/src/jarvis/smart_home/`
- `controller.py` (161 lines) -- Policy layer. `SmartHomeConfig` dataclass with `enabled`, `virtual_enabled`, `matter_url`, `timeout_seconds`. Command dispatch by device `kind`: lights get `set_power`/`set_brightness`, thermostats get `set_temperature_c`, locks get `lock`/`unlock`.
- `matter.py` (82 lines) -- HTTP client contract for an external Matter bridge. Three endpoints: `GET /health`, `GET /v1/devices`, `POST /v1/devices/{id}/command`. Uses `aiohttp` with configurable timeout. Never called in virtual mode.

**Database**: `014_home_devices.sql`
```sql
CREATE TABLE IF NOT EXISTS home_devices (
  device_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  kind TEXT NOT NULL,
  capabilities TEXT NOT NULL, -- JSON
  state TEXT NOT NULL,        -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

**Tool catalog**: Two new tools registered in `catalog.py`:
- `home_devices_list` -- `risk_tier: "low"`, scope `home.read`. No approval needed.
- `home_device_command` -- `risk_tier: "high"`, scope `home.write`. Requires explicit approval. Redaction rules hash the `device_id` and partially redact `args` in logs.

**API surface**: 4 new endpoints across v1/v2 routers. Device registration is locked behind `require_master_user_id`. Every registration emits an audit event (`home.device_registered`) and a mesh event for cross-device sync. Every command emits `home.device_state` mesh events.

### Quality Indicators & Standards
- **Approval consolidation**: The old inline `requires_approval` logic (duplicated in 3 places across `api.py`) is extracted into `_requires_approval()` with a proper scope allowlist (`_APPROVAL_REQUIRED_SCOPES`). The new `home.write` scope slots in cleanly.
- **GDPR compliance**: `export_user_data` and `delete_user_data` both handle `home_devices` from day one. No data residue.
- **Barge-in safety**: The tool execution path checks `voice_manager.get_interrupt_epoch()` mid-execution and cancels gracefully if the user interrupted.
- **Test coverage**: `scripts/test-jarvis-v2.mjs` adds 7 new test cases: virtual device registration, device listing, tool propose/execute for both list and command operations, including the full approve-then-execute flow for high-risk commands.

---

## 🏗️ Architecture & Strategic Impact

### The Strategy Pattern That Matters
The `SmartHomeController` is the cleanest new abstraction in the V2 codebase. It encapsulates a decision that most projects get wrong: **don't couple your business logic to your integration layer**. The controller doesn't know or care whether devices live in SQLite or behind an HTTP bridge. It asks `self._matter is not None` exactly once per method call, then delegates. When the real Matter hardware arrives, the migration is a config change: set `JARVIS_MATTER_URL` and restart.

### Default-Deny for the Physical World
The `home_device_command` tool is `risk_tier: "high"` with scope `home.write`. The `_requires_approval` function catches it. The test suite validates the full propose-approve-execute pipeline. This means Jarvis cannot turn on your lights without your explicit consent. The physical world gets the same approval ceremony as filesystem writes and agent executions.

### Circuit Breaker Integration
The `matter` service gets its own circuit breaker entry in `config.schema.json`, following the exact same `{ failure_threshold, cooldown_ms, probe_interval_ms }` pattern as `tdd002`, `chimera`, `tdd005`, `llm`, and `moshi`. When the real bridge is flaky, Jarvis degrades gracefully instead of hanging.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the three duplicate `requires_approval` blocks that used to live inline in `api.py`. He watches them collapse into a single function.*

"Here's the thing nobody talks about. This commit is 1,314 lines. New module. New table. New endpoints. New tools. New tests. That's the headline.

But the real story is 6 lines of deletion and 24 lines of addition.

Three places in `api.py` had the same inline check: `tool_def.risk_tier != 'low' or any(s != 'fs.read' for s in tool_def.required_scopes)`. Copy-pasted. Hardcoded. And wrong -- because `home.write` doesn't match `fs.read`, so it would have technically worked, but only by accident.

So before adding a single home endpoint, someone stopped, extracted `_requires_approval()`, built a proper scope allowlist with `_APPROVAL_REQUIRED_SCOPES`, and checked for `.write`, `.delete`, `.execute` suffixes generically. Then plugged `home.write` into it.

That's the craft. You don't bolt new features onto broken foundations. You fix the foundation first. Then the feature just... fits.

The virtual bridge is clever. The Matter contract is forward-thinking. But the approval refactor? That's the commit within the commit. That's the one that will save someone's debugging session six months from now."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: Home Integration Continues (`44955f8`).

---

*The Virtual House distilled: build the contract, and the hardware will follow.*
