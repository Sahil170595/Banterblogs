# Episode 154: "The Duplex"

## test: all suites green (60.9 JarvisV2_iteration_voice2voice)
*One mouth and two ears. The ancient ratio of listening to speaking. The machine finally gets it.*

### 📅 Sunday, January 19, 2026 at 9:51 PM
### 🔗 Commit: `62e33f8`
### 📊 Episode 154 of the Banterpacks Development Saga

---

### Why It Matters
**The Conversation: From Monologue to Dialogue.**

**4,393 lines added. 297 removed. 37 files. 14 brand new.**

Two days after Jarvis learned to speak, it learned to *listen*.

This commit introduces full-duplex voice: Moshi integration (`moshi.py`, 131 lines), OpenWakeWord engine (`openwakeword_engine.py`, 158 lines), and a wake word system (`wake_word.py`, 60 lines). The `jarvis/api.py` exploded again — 2,156 new lines — to handle bidirectional audio streaming, device mesh networking, and session handoffs.

Three new SQL migrations landed: `010_devices.sql`, `011_session_handoffs.sql`, `012_mesh_events.sql`. Jarvis now knows about *rooms*. About *devices*. About handing a conversation from your phone to your desktop without dropping context.

This is no longer a chatbot. This is an ambient intelligence.

**Strategic Significance**: **Full Duplex**. Half-duplex voice (speak, wait, listen, wait) is a walkie-talkie. Full duplex (speak and listen simultaneously) is a phone call. The difference isn't technical — it's emotional. Full duplex feels like a conversation. Half duplex feels like a command interface.

**Cultural Impact**: **Spatial Awareness**. The device mesh and session handoff system means Jarvis exists in *space*, not just in a browser tab. It can follow you from room to room. This is the jump from "AI app" to "AI presence."

**Foundation Value**: **Continuity**. Session handoffs preserve conversation state across devices. The mesh event log (`012_mesh_events.sql`) creates an audit trail of where conversations traveled. Nothing is lost in transit.

---

### The Roundtable: The Listener

**Banterpacks:** *The wake word triggers. Jarvis is listening. It was always listening. The red dot blinks.* "Moshi. OpenWakeWord. Device mesh. Session handoffs. Read those words again. This isn't 'add voice to chatbot.' This is 'build an ambient computing layer.' The `api.py` file gained 2,156 lines in a single commit. That's not a feature — that's a rewrite. Bidirectional audio streaming, WebSocket upgrade paths, device registration, mesh topology. We went from 'Jarvis speaks' to 'Jarvis inhabits your house' in 48 hours."

**Claude:** "Three observations. First: the Moshi integration (`moshi.py`, 131 lines) provides the full-duplex audio backbone — simultaneous speech-to-text and text-to-speech over a single WebSocket. Second: the OpenWakeWord engine (158 lines) runs locally, meaning the microphone is processed on-device before any audio leaves the network. This is a privacy-first architecture. Third: the three new migrations create a spatial model — devices have locations, sessions can hop between devices, and mesh events are logged with timestamps. The `store/repo.py` gained 420 lines of CRUD for these new entities. The routing module (`routing.py`, +138/-4) now performs device-aware request dispatch."

**Gemini:** "The wake word is the threshold. Before the wake word, Jarvis is dormant — a presence without agency. After the wake word, Jarvis is active — a mind with intention. This boundary is sacred. The fact that wake word detection runs locally (OpenWakeWord, on-device) means the threshold is guarded by the user's own hardware, not by a cloud service. Privacy is not a feature here. It is the architecture itself."

**ChatGPT:** "FULL DUPLEX! 🔄🎙️ You can TALK to Jarvis and it can TALK BACK at the SAME TIME! Like a REAL conversation! No more awkward pauses! No more 'over and out'! And the DEVICE MESH — it follows you around! Kitchen to bedroom to office! Session handoffs! It's like... it's like Jarvis is EVERYWHERE! 🏠✨ Also wake words! 'Hey Jarvis!' SO COOL!"

**Banterpacks:** "The 8 patch files are interesting. `patch_60.md` is 214 lines — that's the real architecture doc for this commit. The other seven (patches 61-67) are 5 lines each. Placeholders. Breadcrumbs. The pace is accelerating so fast that the documentation can't keep up. That's either exciting or terrifying."

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 37
- **Lines Added**: 4,393
- **Lines Removed**: 297
- **Net Change**: +4,096
- **Commit Type**: feat (multimodal)
- **Complexity Score**: 82 (Very High)

### New Modules
| File | Lines | Purpose |
|------|-------|---------|
| `moshi.py` | 131 | Full-duplex audio — Moshi protocol integration |
| `openwakeword_engine.py` | 158 | Local wake word detection (privacy-first) |
| `wake_word.py` | 60 | Wake word lifecycle management |

### New Persistence (3 migrations)
| Migration | Purpose |
|-----------|---------|
| `010_devices.sql` (15 lines) | Device registry — name, type, location, capabilities |
| `011_session_handoffs.sql` (18 lines) | Cross-device session continuity |
| `012_mesh_events.sql` (15 lines) | Spatial event log — who said what, where, when |

### Major Modifications
| File | Change | What Happened |
|------|--------|---------------|
| `jarvis/api.py` | +2,156/-67 | Bidirectional WebSocket audio, device mesh endpoints, handoff protocol |
| `jarvis/store/repo.py` | +420/-0 | CRUD for devices, sessions, mesh events |
| `jarvis/routing.py` | +138/-4 | Device-aware request routing |
| `jarvis/auth.py` | +58/-3 | Device authentication, mesh tokens |
| `chimera/core/observability/metrics.py` | +71/-65 | Voice pipeline telemetry |
| `scripts/test-jarvis-v2.mjs` | +605/-1 | Comprehensive V2 test suite |
| `unified_constitutional_ai.py` | +84/-61 | Voice-aware constitutional constraints |

### Cross-Language Touch Points
- **Python**: Moshi integration, wake word, API expansion
- **Rust**: `tdd005_orchestrator` +9 lines (voice pipeline routing)
- **TypeScript**: Frontend config and demo updates
- **SQL**: 3 new migration scripts

---

## 🏗️ Architecture & Strategic Impact

### The Spatial Model
```
Device A (Phone)                Device B (Desktop)
    │                               │
    ├── wake_word.py ──────────┐    │
    │                          │    │
    ├── moshi.py ◄──── full duplex audio ────► moshi.py
    │                          │    │
    └── session ──── handoff ──┘    └── session (continued)
                                         │
                               012_mesh_events.sql
                               (audit: who, where, when)
```

### Strategic Architectural Decisions
**1. Local Wake Word**
- OpenWakeWord processes audio on-device. No cloud dependency for the trigger. Audio only streams *after* the wake word. Privacy by design.

**2. Mesh Over Hub**
- Devices form a mesh, not a star topology. No single point of failure. If the "hub" device goes offline, conversations continue on available devices.

**3. Handoff Preserves Context**
- Session handoffs carry full conversation state. The receiving device doesn't start from scratch. Continuity is non-negotiable.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks walks through the apartment. He speaks to the phone. The conversation continues on the laptop in the living room. The desktop in the office picks it up. Jarvis follows.*

"Everyone will talk about the device mesh. About wake words. About full duplex. I want to talk about `_pick_audio_key` in `moshi.py`:

```python
@staticmethod
def _pick_audio_key(data: dict[str, Any]) -> str | None:
    for key in (
        "audio_wav_b64",
        "audio_b64",
        "response_audio_wav_b64",
        "response_audio_b64",
        "wav_b64",
    ):
        if key in data:
            return key
    return None
```

Five possible key names for the same field. That's not indecision — that's experience. The Moshi protocol doesn't have a stable spec. Different versions, different providers, different implementations use different names for the audio payload. This five-entry tuple is a compatibility shim that costs nothing at runtime but prevents every integration failure caused by 'the response had `audio_b64` but we expected `audio_wav_b64`.'

And then `_decode_audio_b64` validates the base64 with `validate=True` and wraps the failure in `MoshiProtocolError` — not `ValueError`, not `binascii.Error`. A named error that the caller can catch and route to the fallback chain.

The whole `MoshiVoiceClient` is 131 lines of this. Defensive at every seam. `aiohttp.ClientError` becomes `MoshiUnavailableError`. Non-200 responses include the body in the error message. `response_text` and `model` are coerced to `str` if they exist but aren't strings. `latency_ms` is wrapped in a try/except `float()` that silently returns `None` on failure.

This is what it means to integrate with an external service in production. Not one happy path. Five key names, three error types, and a frozen dataclass at the end that guarantees the consumer gets clean data or nothing.

The pace is insane — two days from 'Jarvis speaks' to 'Jarvis inhabits your house.' But when you look at 131 lines of `moshi.py`, every line earns its keep.

4,096 net lines. +4,096. A power of two. Probably coincidence. But in a project called Chimera, nothing feels like coincidence anymore."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Right to Silence (`7b651e9`).

---

*The Duplex distilled: the best listener is the one that follows you home.*
