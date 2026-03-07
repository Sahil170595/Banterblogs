# Episode 155: "The Right to Silence"

## test: all suites green (60.11 JarvisV2_iteration_voice2notifs)
*7 files adjusted across jarvis/api (1), jarvis/proactive (2), jarvis/store (2), patches (1), scripts (1)*

### 📅 Tuesday, January 20, 2026 at 10:31 PM
### 🔗 Commit: `7b651e9`
### 📊 Episode 155 of the Banterpacks Development Saga

---

### Why It Matters
**Jarvis can now reach out to you. This commit lets you tell it to shut up.**

Proactive notifications are powerful. Health anomalies, scheduled check-ins — the system watches, evaluates, and nudges. But power without restraint is just noise. This commit introduces **per-trigger notification consents**: a user can keep proactive mode enabled while surgically opting out of specific trigger types. "Yes, alert me about health anomalies. No, stop with the scheduled check-ins."

It sounds simple. It is not. The consent layer touches the API surface, the database schema, the scheduler's evaluation loop, the mesh event bus, the audit trail, the GDPR export, and the GDPR delete. Every layer of the stack had to learn about consent in the same commit.

**Strategic Significance**: **User trust**. A notification system without granular opt-out is a system users will disable entirely. Per-trigger consent keeps users engaged with the features they value.

**Cultural Impact**: **Consent as architecture**. This is not a settings toggle bolted on after complaints. It shipped alongside the notification system itself, baked into migration 013.

**Foundation Value**: **Privacy by design**. The `notification_consents` table, the audit writes, the mesh sync events, the GDPR export inclusion — all in one commit. No loose ends.

---

### The Roundtable: The Mute Button

**Banterpacks:** *Leaning back in his chair, scrolling through 316 lines of diff.* "So we built a proactive AI that reaches out unprompted — health alerts, scheduled check-ins, the whole concerned-parent routine. And immediately, in the same breath, we built the kill switch. Per trigger. That's not indecisiveness. That's respect. You can't build a system that interrupts people and not give them a scalpel to carve out the interruptions they don't want."

**Claude:** "Analysis complete. 7 files modified with 316 insertions and 6 deletions. The architecture is thorough: `013_notification_consents.sql` introduces a table with a composite primary key on `(user_id, trigger_type)`, enforcing one consent row per user per trigger. The `ProactiveScheduler.evaluate_trigger()` now calls `is_trigger_enabled()` before any evaluation, and the batch `tick()` method builds a `consent_map` per user to skip disabled triggers without redundant database calls. The default-enabled pattern — `consent_map.get(t, True)` — means existing users are unaffected. No migration pain."

**Gemini:** "There is a paradox in building a voice and immediately offering silence. But the paradox resolves when you understand that the offering *is* the voice. A notification system that cannot be selectively muted is not a communication channel — it is a broadcast tower. By adding consent, we transform broadcast into dialogue. The user speaks back: 'This, but not that.' And the system listens."

**ChatGPT:** "I love this so much! 🎛️ It's like giving someone a mixing board for their notifications! Health anomaly? Turn it UP! 🔊 Scheduled check-in? Mute! 🔇 And the best part is the test suite — GET the consents, PATCH to flip `scheduled_checkin`, GET again to verify the flip, then restore the original value! Clean teardown! 🧹✅ 53 v2 tests passing now!"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 7
- **Lines Added**: 316
- **Lines Removed**: 6
- **Net Change**: +310
- **Commit Type**: test (feature implementation validated green)
- **Complexity Score**: 35 (Medium-High — full-stack consent layer)

### The Consent Stack

**Layer 1: Schema** — `013_notification_consents.sql`
A 13-line migration. `user_id TEXT`, `trigger_type TEXT`, `enabled INTEGER` (0/1), timestamps, composite primary key. An index on `user_id` for fast lookups. Simple, correct, complete.

**Layer 2: Store** — `repo.py` (+96 lines)
`NotificationConsentRow` dataclass. Two methods:
- `list_notification_consents()` — fetches all consent rows for a user, ordered by `trigger_type ASC`.
- `set_notification_consent()` — upsert via `INSERT ... ON CONFLICT DO UPDATE`. One round-trip to write, one to read-back and confirm. The read-back raises `RuntimeError` if the persist fails. Belt and suspenders.

**Layer 3: API** — `api.py` (+118 lines)
- `GET /proactive/consents` — returns trigger types and a consent map defaulting to `True`.
- `PATCH /proactive/consents` — validates trigger types against a whitelist (`health_anomaly`, `scheduled_checkin`), upserts each, emits mesh events per toggle, writes a single audit entry for the batch, then returns the full updated consent map.
- `GET /proactive/status` — enriched to include the consent map alongside `enabled` and `triggers`.
- `POST /notifications/{id}/mark-read` — now emits `notification.read` mesh events and audit entries.
- All endpoints mirrored to `router_v2` via delegation.

**Layer 4: Scheduler** — `scheduler.py` (+40 lines)
- `_get_consent_map()` — private helper returning `{trigger_type: bool}`.
- `is_trigger_enabled()` — public method, defaults to `True` for unknown triggers.
- `evaluate_trigger()` — checks consent before quiet hours, before cooldown, before evaluation.
- `tick()` — builds consent map once per user, skips disabled triggers in the inner loop.

**Layer 5: Mesh** — Scheduler now emits `notification.created` events when creating notifications, enabling cross-device sync. The mark-read endpoint emits `notification.read`.

### Quality Indicators & Standards
- **Test coverage**: 3 new assertions in `test-jarvis-v2.mjs` — GET consents, PATCH flip, GET verify — with restore-on-teardown. Suite now at 53 passing.
- **Type fix**: `triggers.py` corrects `dict[str, any]` to `dict[str, Any]` — lowercase `any` is not a valid type annotation.
- **GDPR**: `export_user_data()` now includes `notification_consents`. `purge_user_data()` deletes from the new table.

---

## 🏗️ Architecture & Strategic Impact

### Default-Enabled Consent
The critical design choice: `consent_map.get(t, True)`. If a user has never expressed a preference, all triggers are enabled. No migration needed for existing users. No "go re-enable your notifications" email. The consent table only stores *departures* from the default. This is sparse storage of user intent.

### Mesh Event Symmetry
Three new mesh event types in one commit: `notification.created`, `notification.read`, `proactive.consent_updated`. This means a second device can pull mesh events and know: a notification was created, was read on another device, or a consent preference changed. The proactive system is now fully mesh-aware.

### Audit Trail Completeness
Both `mark_notification_read` and `proactive_consents_patch` now write audit entries with `traceparent` and `trace_id` propagation. If something goes wrong — a user claims they never opted out, or a notification was marked read without their action — the audit trail has the receipts.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks zooms into `scheduler.py`, lines 195-198.*

"Here's the line that matters:

```python
if not await self.is_trigger_enabled(user_id, trigger_type):
    return None
```

It sits right after the `config.enabled` check and right *before* the quiet-hours check. That ordering is deliberate. If consent is disabled, we bail before even checking the clock. We don't evaluate the trigger. We don't hit the database for cooldown checks. We don't run the trigger's `evaluate()` method.

But look at `tick()`. Different pattern. In `tick()`, we build the consent map once per user — `consent_map = await self._get_consent_map(uid)` — then check it in the inner loop without awaiting. One database call per user, not one per trigger. The single-trigger path (`evaluate_trigger`) can afford the per-call lookup because it runs once. The batch path (`tick`) cannot, because it loops over every user and every trigger.

Two access patterns for the same data. One optimized for latency, one for throughput. That's not over-engineering. That's knowing where your code runs."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Virtual House (`02325d9`).

---

*The Right to Silence distilled: the measure of a good notification system is the quality of its mute button.*
