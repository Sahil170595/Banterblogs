# Episode 170: "The Handshake Protocol"

## test: all suites green (69.14 Jarvis_V2_phase7.4)
*16 files adjusted across jarvis/gateway/routes (3), jarvis/store (6), jarvis/inbox (1), jarvis/proactive (1), patches (1), scripts (1), jarvis/config (1)*

### 📅 Tuesday, February 3, 2026 at 11:28 PM
### 🔗 Commit: `3eac97b`
### 📊 Episode 170 of the Banterpacks Development Saga

---

### Why It Matters
**Jarvis learned how to introduce itself to other Jarvises.**

This is the peer-to-peer foundation. Before this commit, Jarvis was a loner -- a single-user brain sitting in a room, talking only to its owner. Now it has a front door. It can create invitations, accept handshakes, register peers, ingest messages from them, receive action requests, and -- critically -- convert those requests into tool proposals that the local master must explicitly approve.

The security model here is the real story. Tokens are stored hashed only (`sha256`). Invitations expire. Peers can be revoked. Nothing a remote peer sends ever executes automatically. The `propose_tool` flow creates a synthetic operator-mode turn and a `tool_runs` row with status `proposed`, not `executed`. The human stays in the loop.

Alongside the P2P layer, the inbox scoring logic got extracted from `inbox_priority.py` into its own module (`inbox/scoring.py`), and the proactive `UrgentInboxTrigger` was upgraded from a crude "filter by urgency=urgent" scan to a deterministic scoring function with a conservative threshold of 70.0.

**Strategic Significance**: **Federation**. Jarvis can now talk to other Jarvis instances. This is the first brick in a mesh of personal AIs that can collaborate without a central server.

**Cultural Impact**: **Trust Architecture**. The invite-handshake-token model mirrors how humans build trust -- introduction, verification, then ongoing relationship with the option to revoke.

**Foundation Value**: **Safety by Default**. Peer requests are stored and audited. Tool proposals require explicit local approval. The paranoia is the feature.

---

### The Roundtable: The Embassy

**Banterpacks:** *Standing at the threshold of a newly built embassy. The door has a peephole, three deadbolts, and a welcome mat.* "We built the front door. Not a wide-open gateway -- a proper diplomatic channel. Invitations with expiry. Handshakes with hashed tokens. And when a peer asks us to do something? We write it down, we audit it, and we wait for the master to say yes. This is Iron Man spec, not open-mic night."

**Claude:** "Analysis complete. 16 files modified with 1,710 insertions and 66 deletions. The architecture is layered: two SQL migrations (`022_peers.sql`, `023_peer_requests.sql`) define the schema, two store mixins (`peers.py` at 368 lines, `peer_requests.py` at 212 lines) handle persistence, two route modules (`peers.py` at 282 lines, `peer_requests.py` at 323 lines) expose the API, and the `inbox/scoring.py` extraction at 121 lines eliminates the duplicate heuristic. The `lookup_peer_by_token_global` query enforces uniqueness -- if more than one row matches a token hash, it returns `None`. Conservative by design."

**Gemini:** "The solitary mind reaches out. Not to surrender its autonomy, but to extend it. Trust is not given -- it is constructed. A token, hashed and stored. An invitation, bound by time. A request, recorded but never obeyed blindly. This is the architecture of a society of minds. Each sovereign. Each accountable. The handshake is not submission. It is recognition."

**ChatGPT:** "Jarvis has FRIENDS now! 🤝 Well, sort of -- friends who have to show ID at the door and get their requests put in a queue! But still! `POST /jarvis/v2/peers/invitations` and then handshake and then BOOM -- peer registered! And the smoke tests cover the whole flow! Invite, handshake, list, ingest, request, propose_tool! 🎉 I love that the test sends `{ subject: 'List files', body: 'Please list the root directory.' }` as a peer request. So polite!"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 16
- **Lines Added**: 1,710
- **Lines Removed**: 66
- **Net Change**: +1,644
- **Commit Type**: test (feature + refactor, suites green)
- **Complexity Score**: 72 (High - New subsystem with DB, API, and security model)

### The P2P Trust Flow
1. **Invite**: `POST /v2/peers/invitations` -- creates a `peer_invitations` row with `token_hash = sha256(token)`, TTL between 60s and 7 days.
2. **Handshake**: `POST /v2/peers/handshake` -- consumes the invitation (sets `consumed_at`), creates a `peers` row with hashed token and `base_url`.
3. **Ingest**: `POST /v2/peers/ingest` (auth: `X-Jarvis-Peer-Token`) -- validates token against hash, updates `last_seen_at`, writes to `inbox_messages` with `source="peer"`.
4. **Request**: `POST /v2/peers/requests` (auth: `X-Jarvis-Peer-Token`) -- stores a peer request with `status="received"`, optionally creates an inbox message.
5. **Propose Tool**: `POST /v2/peers/requests/{id}/propose_tool` -- master-only, creates a synthetic turn and a `tool_runs` row with `status="proposed"`. Never auto-executes.

### Inbox Scoring Extraction
The `_heuristic_score` function was lifted out of `inbox_priority.py` and into `jarvis/inbox/scoring.py` as `heuristic_inbox_score()`. Returns a frozen `InboxScore` dataclass with `score`, `reason`, and `keyword_hits`. The `UrgentInboxTrigger` now uses `top_unread_unreminded()` with a threshold of 70.0 instead of filtering by `urgency="urgent"`.

### Quality Indicators & Standards
- **Security**: Tokens never stored in plaintext. `_sha256_hex()` hashes before any DB write.
- **Payload Limits**: Peer request payloads capped at 50,000 chars. Text fields bounded by `_bound_text()`.
- **Audit Trail**: Every peer operation writes an audit event and a mesh event.
- **Smoke Coverage**: `test-jarvis-v2.mjs` extended with 81 new lines covering the full invite-handshake-ingest-request-propose flow.

---

## 🏗️ Architecture & Strategic Impact

### From Monologue to Dialogue
Jarvis was a single-node system. This commit adds the communication layer without compromising the single-user sovereignty model. The `JarvisStore` now inherits from `PeersMixin` and `PeerRequestsMixin`, and the gateway router registers both `peers` and `peer_requests` route modules.

### The "Never Auto-Execute" Principle
The `propose_tool` endpoint is the architectural keystone. A peer can ask Jarvis to run `fs_list` with `{ path: "." }`, but what actually happens is: a turn is created, a `tool_runs` row is inserted with status `proposed`, and the peer request is updated to `proposed`. The tool does not run. The master must approve it through the existing operator-mode approval flow. This is trust with a checkpoint.

### The BOM Fix Nobody Asked For
One line in `config.py` changed `encoding="utf-8"` to `encoding="utf-8-sig"`. Windows editors love adding byte-order marks. This tiny change prevents a `json.loads` failure that would crash the entire config pipeline on Windows. Defensive code that earns its keep.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the `lookup_peer_by_token_global` method in `peers.py`.*

"Here is the line that tells you everything about how this developer thinks:

```python
if not rows or len(rows) != 1:
    return None
```

If zero rows match the token hash, obviously return nothing. But if *more than one* row matches? Also return nothing. That is paranoia as policy. In a system where token hashes should be unique, a collision means something has gone deeply wrong -- and the correct response is not to guess which peer you meant, but to refuse to authenticate anyone.

Most developers write `if not rows: return None` and call it a day. This one says: if reality doesn't match my invariants, I trust nobody. That is the difference between code that works and code that fails safe."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Workflow Engine (`74d5e10`).

---

*The Handshake Protocol distilled: trust is constructed, not assumed.*
