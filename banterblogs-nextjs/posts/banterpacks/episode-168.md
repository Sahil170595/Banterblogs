# Episode 168: "The Great Unbundling"

## test: all suites green (68.15 Jarvis_V2_phase7.2)
*12 files adjusted across jarvis/gateway (9), patches (1), scripts (1), config (1)*

### 📅 Sunday, February 1, 2026 at 8:38 PM
### 🔗 Commit: `7278242`
### 📊 Episode 168 of the Banterpacks Development Saga

---

### Why It Matters
**A 669-line file walked into a bar. It walked out as four.**

This commit is a masterclass in modular decomposition. The Jarvis gateway had been accumulating mass -- `state_learning.py` had ballooned to 669 lines of route handlers covering state sync, feedback, RLAIF pairs, learning profiles, and constitution governance. Meanwhile, `app.py` was doing triple duty: application wiring, WebSocket lifecycle management, and HTTP metrics middleware. The commit message says "all suites green," but what actually happened here is architectural surgery.

The monolith was split along its natural domain seams. State sync routes went to `state_learning_state.py` (149 lines). Feedback and RLAIF export went to `state_learning_feedback.py` (160 lines). Learning profiles went to `state_learning_profiles.py` (179 lines). Constitution governance went to `state_learning_constitution.py` (230 lines). The original `state_learning.py` shrank from 669 lines to 23 -- just imports and a `register()` function that delegates to its children. A 97% reduction in the file that stays, a 100% preservation of the behavior that ships.

The same discipline hit `app.py`: 155 lines of startup/shutdown lifecycle, WebSocket stream handling, and metrics middleware were extracted into a new `gateway/http.py` (183 lines). Three clean functions -- `register_lifecycle`, `register_websocket_streams`, `register_metrics_middleware` -- replaced inline closures buried in a 400-line factory.

And while the scalpel was out, the team also hardened outbox delivery (comma-separated `allow_hosts` parsing, JSON string coercion for webhook headers), wired six new env overrides into `config.py`, expanded the smoke test suite with retry logic and Phase 6 learning coverage, and updated `patch_68.md` to document it all.

1,070 insertions. 840 deletions. Zero behavioral changes. All suites green.

**Strategic Significance**: Jarvis is approaching the complexity threshold where monolithic route files become a liability. This commit enforces a "<500 lines per module" rule that will pay dividends for every future feature.

**Cultural Impact**: Discipline. The hardest refactor is the one where nothing changes for the user.

**Foundation Value**: Every new module has a single responsibility and a clean `register()` interface. The gateway is now a pluggable architecture, not a growing monolith.

---

### The Roundtable: The Surgeon's Table

**Banterpacks:** *Laying out surgical instruments on a stainless steel tray. Each one is labeled: "state," "feedback," "profiles," "constitution." He snaps on latex gloves.* "669 lines. One file. Four concerns. This is the kind of technical debt that doesn't look like debt -- it looks like convenience. 'Oh, it's all learning stuff, keep it together.' And then one day you're debugging a constitution proposal bug and you're scrolling past RLAIF pair exports and Automerge merge logic to find it. Today we fixed that. The patient survived."

**Claude:** Analysis complete. 12 files modified with 1,070 insertions and 840 deletions across 5 new modules and 7 modified files. The decomposition follows a strict domain-boundary pattern: `state_learning_state.py` owns TDD005/Automerge sync (3 endpoints), `state_learning_feedback.py` owns feedback CRUD and RLAIF export (3 endpoints), `state_learning_profiles.py` owns weekly learning runs and profile retrieval (2 endpoints), and `state_learning_constitution.py` owns proposal lifecycle (4 endpoints). Each sub-module receives only the context dependencies it needs -- `state_learning_state.py` pulls `tdd005_sync_client` but not `llm_client` or `budget_tracker`, while `state_learning_feedback.py` needs neither. This is dependency scoping done correctly. The `http.py` extraction is equally precise: `register_lifecycle` takes explicit kwargs rather than closing over the parent scope, making the startup/shutdown contract auditable.

**Gemini:** "The cathedral was not built in a day, and it was not built in one room. The mason who carves the gargoyle does not also cast the bell. What we witness here is the moment the project recognized that growth requires specialization. A 669-line file is not a file -- it is a secret monolith wearing the disguise of modularity. By naming the parts, we honor their distinct purposes. The state sync speaks to the question of *where*. The feedback speaks to the question of *how well*. The profile speaks to the question of *who*. The constitution speaks to the question of *what is allowed*. Four questions. Four files. The architecture finally matches the ontology."

**ChatGPT:** "We Marie Kondo'd the entire gateway! 🧹✨ That 669-line file was NOT sparking joy. Now we have four cute little modules, each with their own register() function, each knowing exactly what they need! And the smoke tests got retry logic with 429 backoff! AND outbox webhook headers can be JSON strings now! It's like spring cleaning but in February! 🏠💖 The best part? NOTHING CHANGED FOR USERS. Same endpoints, same behavior, just... organized. I love it when code gets a makeover!"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 12
- **Lines Added**: 1,070
- **Lines Removed**: 840
- **Net Change**: +230
- **Commit Type**: test (refactor + hardening)
- **Complexity Score**: 45 (High - Multi-module decomposition)

### The Decomposition Map

**`state_learning.py`**: 669 lines removed, 23 lines remain. The original file becomes a pure delegation hub:
```python
def register(router: APIRouter, router_v2: APIRouter, ctx: GatewayContext) -> None:
    _ = router  # v1 router intentionally unused
    register_state(router_v2, ctx)
    register_feedback(router_v2, ctx)
    register_profiles(router_v2, ctx)
    register_constitution(router_v2, ctx)
```

**`app.py`**: 155 lines removed, 16 added. Three inline closures replaced by three function calls:
```python
register_lifecycle(app=app, store=store, llm_client=llm_client, ...)
register_all(router, router_v2, ctx)
register_websocket_streams(app=app, store=store, stream_manager=stream_manager)
register_metrics_middleware(app=app)
```

**`http.py`**: 183 lines, entirely new. Houses `register_lifecycle`, `register_websocket_streams`, and `register_metrics_middleware`.

**Outbox hardening** in `outbox.py`: `allow_hosts` now accepts comma-separated strings (not just lists), and `outbox_delivery.py` coerces JSON-string headers via `json.loads()`.

**Config**: 6 new env overrides for outbox delivery (`JARVIS_OUTBOX_DELIVERY_BACKEND`, `JARVIS_OUTBOX_DELIVERY_DIR`, `JARVIS_OUTBOX_WEBHOOK_URL`, `JARVIS_OUTBOX_WEBHOOK_ALLOW_HOSTS`, `JARVIS_OUTBOX_WEBHOOK_HEADERS`, `JARVIS_OUTBOX_WEBHOOK_TIMEOUT_SECONDS`).

**Smoke tests** (`test-jarvis-v2.mjs`): `fetchJSON` gained 429 retry logic (up to 5 retries with `Retry-After` header support). New assertions for feedback list, constitution suggest/decide, and outbox webhook-blocked-by-default validation.

### Quality Indicators & Standards
- **Module Size Rule**: All new files under 230 lines; the "<500 lines" discipline is documented in `patch_68.md`.
- **Dependency Scoping**: Sub-modules only destructure the `GatewayContext` fields they use.
- **Behavioral Parity**: Zero endpoint changes; the refactor is purely structural.
- **Test Coverage**: 70 lines added to smoke suite covering 6 new assertions.

---

## 🏗️ Architecture & Strategic Impact

### The Gateway Module Graph (After)
```
app.py (create_app)
  ├── http.py
  │   ├── register_lifecycle()
  │   ├── register_websocket_streams()
  │   └── register_metrics_middleware()
  └── routes/
      ├── register_all()
      │   ├── state_learning.py (delegator)
      │   │   ├── state_learning_state.py      (push/pull/json)
      │   │   ├── state_learning_feedback.py   (feedback/rlaif)
      │   │   ├── state_learning_profiles.py   (learning/run_weekly, profile)
      │   │   └── state_learning_constitution.py (propose/suggest/decide/list)
      │   ├── outbox.py (hardened allow_hosts parsing)
      │   └── ...
      └── services/
          └── outbox_delivery.py (JSON-string header coercion)
```

### Strategic Architectural Decisions
**1. Delegator Pattern over Flat Registration**
Rather than having `register_all()` call each sub-module directly, the team kept `state_learning.py` as a thin delegator. This preserves the existing import graph -- no changes needed in `routes/__init__.py` or anywhere else that calls `state_learning.register()`.

**2. Explicit Dependency Injection in `http.py`**
`register_lifecycle` takes `store`, `llm_client`, `stream_manager`, `proactive_scheduler`, and `run_event_loop_lag_monitor` as explicit keyword arguments rather than closing over them. This makes the startup contract testable and documentable.

**3. Env-to-Config Bridge for Outbox**
Six new environment variable overrides follow the established `_ENV_OVERRIDES` pattern, keeping the outbox delivery configurable without touching YAML in CI.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the diff for `outbox.py`. Specifically, the `allow_hosts` parsing change.*

"Refactoring episodes get all the applause. But the little fixes that ride along? Those are the ones that save you.

Look at this. The old code for `allow_hosts` assumed the config value was either a list or nothing. But environment variables are strings. If you set `JARVIS_OUTBOX_WEBHOOK_ALLOW_HOSTS=api.example.com,hooks.slack.com`, the old code would silently set `allow_hosts` to `None` -- because a string is not a list. Your allowlist would be *gone*. Your webhook validation would accept anything.

The new code checks for a string and splits on commas:
```python
elif isinstance(allow_hosts_raw, str) and allow_hosts_raw.strip():
    allow_hosts = [
        p.strip()
        for p in allow_hosts_raw.split(",")
        if isinstance(p, str) and p.strip()
    ]
```

Same story in `outbox_delivery.py`: `_coerce_headers` now handles the case where someone passes webhook headers as a JSON string instead of a dict. Five lines. `json.loads()`. Done.

These aren't glamorous fixes. They're the kind of thing that bites you at 2 AM when you're deploying to a new environment and the outbox silently sends webhooks to hosts it shouldn't. The refactor got the headlines, but these five-line patches are the ones that prevent the incident report.

The best commits are the ones where the flashy change and the quiet fix ship together."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Inbox Triage (`3245865`).

---

*The Great Unbundling distilled: the strongest architectures are the ones that know where to draw the lines.*
