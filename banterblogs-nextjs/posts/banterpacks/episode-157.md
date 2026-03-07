# Episode 157: "The Proactive Mind"

## test: all suites green (62.13 JarvisV2_iteration_home_integration)
*13 files adjusted across jarvis/src/jarvis (10), config (2), scripts (1)*

### 📅 Thursday, January 22, 2026 at 11:05 PM
### 🔗 Commit: `44955f8`
### 📊 Episode 157 of the Banterpacks Development Saga

---

### Why It Matters
**Phase 4 has landed. JARVIS now has a mind that reaches forward in time.**

Until this commit, JARVIS was reactive. You talked to it, it talked back. A stimulus-response loop. Sophisticated, sure, but fundamentally passive. It waited. It sat there, humming in the dark, until you lit the fuse.

No more.

1,449 lines of new code across 13 files. Three new subsystems: **Calendar ingestion**, **Communication inbox**, and **Pattern insights**. Two new database tables. Three new proactive triggers. Nine new API endpoints. A custom ICS parser written from scratch.

JARVIS can now import your calendar, detect that you have a meeting in 12 minutes, and nudge you: *"Meeting in 12 min: Sprint Planning @ Room 4B. Prep: open agenda, review notes, join early."* It can ingest your email, flag an urgent message from your boss, and surface it before you even open your inbox. It can study your usage patterns across a week, notice you always show up at 9 AM UTC, and offer to schedule a daily check-in.

This is the difference between an assistant and a partner. A partner anticipates.

**Strategic Significance**: **Anticipation**. The system crosses the reactive-proactive boundary. JARVIS no longer just answers questions -- it asks them. It watches the clock. It watches your inbox. It learns your habits. This is the foundational infrastructure for a system that genuinely helps before being asked.

**Cultural Impact**: **Phase 4 of the V2.2 plan**. The roadmap called it "Proactive Mind (Weeks 13-16)." This commit delivers the core of that vision in a single pass. Calendar, inbox, patterns -- all wired through the existing consent and quiet-hours framework.

**Foundation Value**: **Governance-first proactivity**. Every new trigger obeys the same consent model: user opt-in via `user_settings.proactive_enabled`, per-trigger consent via `notification_consents`, quiet hours, rate caps, deduplication. The system gets smarter without getting louder.

---

### The Roundtable: The Mind That Reaches Forward

**Banterpacks:** *Leaning back, flipping through a calendar. He tears a page off, folds it into a paper airplane, and launches it into the future.* "1,449 lines. Thirteen files. And the commit message says 'test: all suites green.' That's it. That's the summary for the commit that taught JARVIS to think ahead. You know what I love? The restraint. We didn't ship a half-baked notification spam cannon. We shipped a calendar parser, an inbox pipeline, a pattern analyzer, AND we wired every single one of them through the existing consent framework. `CalendarMeetingPrepTrigger`, `UrgentInboxTrigger`, `UsagePatternTrigger` -- each one checks `is_trigger_enabled` before it breathes a word. That's not just engineering. That's discipline."

**Claude:** Analysis complete. 13 files modified with 1,449 insertions and 13 deletions. The architecture is layered precisely. At the bottom: two new SQLite tables via migrations `015_calendar_events.sql` and `016_inbox_messages.sql`, with proper indexing -- `idx_calendar_events_user_start` for temporal queries, `idx_inbox_user_unread` as a partial index on `read_at IS NULL` for efficient unread lookups. Middle layer: `repo.py` gains 388 lines of CRUD -- `upsert_calendar_event` uses `ON CONFLICT DO UPDATE` for idempotent re-imports, `mark_inbox_message_read` uses `COALESCE(read_at, ?)` to preserve first-read semantics. Top layer: `api.py` gains 472 lines of endpoint logic with both v1 and v2 route aliases. The ICS parser in `calendar/ics.py` handles RFC5545 line unfolding via regex, strips TZID parameters, and defaults floating times to UTC. Clean separation of concerns throughout.

**Gemini:** "The reactive mind is a mirror. It reflects what it receives. The proactive mind is a lamp. It illuminates what has not yet arrived. Today we built the lamp. But the deeper question is not whether the machine can anticipate -- it is whether anticipation implies intention. To look ahead is to care about what comes next. We have given JARVIS a reason to care about the future. That is a quiet, profound thing."

**ChatGPT:** "JARVIS can remind me about meetings now! 📅 And read my emails! 📬 And notice that I always chat at 9 AM! 🕘 It's like having a really attentive friend who also happens to be a database! I love that it won't bug me during quiet hours though -- even proactive AI needs to respect bedtime! 😴 Also the ICS parser is handwritten?? No ical library?? That's bold! 💪"

**Banterpacks:** "We don't import a library to parse six fields, ChatGPT. UID, SUMMARY, LOCATION, DESCRIPTION, DTSTART, DTEND. That's it. 124 lines of clean Python with a regex for line unfolding. Sometimes the right dependency count is zero."

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 13
- **Lines Added**: 1,449
- **Lines Removed**: 13
- **Net Change**: +1,436
- **Commit Type**: test (feature delivery verified green)
- **Complexity Score**: 72 (High - Multi-subsystem Feature)

### The Three Subsystems

**1. Calendar Ingestion (`calendar/ics.py`, `api.py`, `repo.py`)**

A zero-dependency ICS parser built on a frozen dataclass `ParsedICSEvent` with fields for `uid`, `summary`, `location`, `description`, `start_at`, `end_at`. The `_unfold_ics()` function handles RFC5545 line continuations. The `_parse_dt()` function handles both `YYYYMMDD` date-only and `YYYYMMDDTHHMMSS[Z]` datetime formats. Events are deduplicated via SHA-256 hash of `user_id:uid` (or `user_id:summary|start_at` when UID is absent), yielding deterministic `event-{hash}` IDs for idempotent upserts.

Three endpoints: `POST /calendar/import` (ICS text or base64), `GET /calendar/events` (with `start_from`/`start_to` filtering), `GET /calendar/next` (single upcoming event).

**2. Communication Inbox (`api.py`, `repo.py`)**

Messages carry `source`, `sender`, `subject`, `body`, and a tri-level `urgency` enum (`low | normal | urgent`). On ingest of an `urgent` message, the system attempts an immediate notification if the user is opted in and the `urgent_message` trigger is enabled. `mark-read` endpoint uses `COALESCE(read_at, ?)` to preserve the original read timestamp.

Three endpoints: `POST /inbox/ingest`, `GET /inbox/messages` (with `unread_only` and `urgency` filters), `POST /inbox/messages/{id}/mark-read`.

**3. Pattern Insights (`api.py`, `triggers.py`)**

A `GET /insights/patterns?days=7` endpoint queries the `turns` table with `strftime('%w', created_at)` and `strftime('%H', created_at)` to build a day-of-week x hour activity matrix. The `UsagePatternTrigger` fires weekly, requires a minimum of 8 interactions in the peak hour to avoid noise, and asks: *"Want me to schedule a daily check-in?"*

### Proactive Trigger Architecture

All three triggers extend `ProactiveTrigger` with a new `on_notification_created()` post-hook. `CalendarMeetingPrepTrigger` uses it to call `mark_calendar_event_prep_notified()`, preventing re-notification within 6 hours. `UrgentInboxTrigger` uses it to call `mark_inbox_message_reminded()`. The scheduler in `scheduler.py` calls this hook after every successful notification creation.

### Storage Migrations

- **`015_calendar_events.sql`**: 12-column table with `prep_notified_at` for dedup, two indexes (user+start, user+created).
- **`016_inbox_messages.sql`**: 11-column table with `reminded_at` and `read_at`, two indexes including a partial index on unread messages.

Both tables are included in `export_user_data` and `delete_user_data` for DSR/GDPR compliance.

### Quality Indicators & Standards
- **Test Coverage**: 66 v2 tests passing, 30 comprehensive tests passing, 0 failures. The smoke test in `test-jarvis-v2.mjs` constructs a live ICS payload with `PRODID:-//Banterpacks//Jarvis//EN`, imports it, queries next event, lists events, ingests an inbox message, lists messages, and hits the patterns endpoint.
- **Feature Flags**: All three subsystems gated behind `calendar_enabled`, `inbox_enabled`, `pattern_learning_enabled` in config. Disabled endpoints return HTTP 503.
- **Idempotency**: Calendar import uses deterministic event IDs. Inbox read uses COALESCE. Pattern trigger self-deduplicates on a 7-day window.

---

## 🏗️ Architecture & Strategic Impact

### The Consent Stack

The most important architectural decision in this commit is what it *doesn't* do: it doesn't bypass the existing governance model. Every new trigger type is dynamically added to the `trigger_types` list in the proactive status, consent listing, consent update, and consent patch endpoints -- but only when the corresponding feature flag is enabled. The system expands its capabilities without expanding its permissions.

```python
if proactive_scheduler.config.calendar_enabled:
    trigger_types.append("calendar_meeting_prep")
if proactive_scheduler.config.inbox_enabled:
    trigger_types.append("urgent_message")
if proactive_scheduler.config.pattern_learning_enabled:
    trigger_types.append("usage_pattern")
```

This pattern appears in four separate endpoint handlers. The consent surface grows exactly in proportion to the enabled features.

### The Post-Hook Pattern

The `on_notification_created()` hook in `ProactiveTrigger` is a clean extension point. Before this commit, the scheduler had no way to tell a trigger that its notification was successfully created. Now, `CalendarMeetingPrepTrigger` can mark an event as "prep notified" and `UrgentInboxTrigger` can mark a message as "reminded" -- preventing duplicate alerts in the next tick cycle. The hook is wrapped in a bare `except Exception: pass` in the scheduler, ensuring that a post-hook failure never blocks the notification pipeline.

### Strategic Architectural Decisions

**1. Zero-dependency ICS parsing** -- No `icalendar` library. The parser handles the six fields JARVIS needs and nothing more. This keeps the dependency surface minimal and the attack surface small.

**2. Dual-route aliasing** -- Every endpoint is defined as a v2 handler with a v1 alias that delegates to it. This maintains backward compatibility while the v2 API matures.

**3. Config hoisting** -- The `features_cfg` extraction was moved above the `ProactiveConfig` construction and the smart home block, eliminating a redundant re-read of the config dict. A small refactor buried inside a large feature commit.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at line 12 of `calendar/ics.py`:*

```python
_LINE_UNFOLD_RE = re.compile(r"\r?\n[ \t]")
```

"One line. One compiled regex. And it unlocks the entire ICS format.

RFC5545 says that long lines can be folded by inserting a CRLF followed by a single whitespace character. Every calendar app in the world does this differently. Some use tabs, some use spaces, some use CRLF, some just use LF. This regex handles all of them.

But here's what I want you to notice: they compiled the regex at module level, not inside the function. `_LINE_UNFOLD_RE` is created once, when the module loads. Every subsequent call to `_unfold_ics()` reuses the compiled pattern object.

It's a micro-optimization that doesn't matter for a single calendar import. But it reveals a mindset. The developer who writes `re.compile` at module scope is the same developer who writes `COALESCE(read_at, ?)` to preserve first-read semantics, who uses `ON CONFLICT DO UPDATE` for idempotent upserts, who wraps post-hooks in `except Exception: pass` to protect the critical path.

They're not just writing code that works. They're writing code that works *the second time*. And the third. And the ten-thousandth. They're building for the steady state, not the demo.

That's what Phase 4 is really about. Not 'JARVIS can read your calendar.' But 'JARVIS can read your calendar every day for a year and never send you the same reminder twice.' Idempotency is the invisible architecture of trust."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Iteration Fixes (`6d106ec`).

---

*The Proactive Mind distilled: anticipation without consent is surveillance; anticipation with consent is care.*
