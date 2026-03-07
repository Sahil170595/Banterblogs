# Episode 138: "The Constitutional Fortress"

## test: all suites green (53.14 TDD004_cryptographic_provenance_unified_constitutional_runtime)
*12 files adjusted across docs (1), chimera-core (2), tdd004_agent (1), tdd005_ffi (1), tdd005_orchestrator (4), python/encoder_service (1), Cargo configs (2)*

### 📅 Monday, January 5, 2026 at 8:06 PM
### 🔗 Commit: `e01a9dc`
### 📊 Episode 138 of the Banterpacks Development Saga

---

### Why It Matters
**The Runtime Grew Walls. And Guards. And a Moat.**

1,579 lines of insertion. 161 lines removed. Twelve files touched across Rust and Python. This is not a feature commit. This is a *fortification* commit. The TDD005 constitutional runtime just went from "interesting prototype" to "production-hardened system."

What happened here, in a single commit, is staggering in scope: Ed25519 peer signing for distributed replication, HMAC-SHA256 attestation over encoder embeddings, Unix domain socket transport, per-agent token-bucket rate limiting, hot-reloadable encoder pools with graceful drain, system checkpointing with periodic saves, weighted quorum consensus, Merkle proof retrieval endpoints, and a gap analysis document that is honest about what is *not* yet built.

This is the commit where the runtime stopped trusting itself.

**Strategic Significance**: Every layer of the stack now has a cryptographic trust boundary. Agents are rate-limited. Peers are signature-verified. Encoders are attested. The system can checkpoint itself, restore from snapshots, and hot-swap its encoder pool without downtime. This is infrastructure that knows it will be attacked.

**Cultural Impact**: The `TDD004_TDD005_GAPS.md` document is the most telling artifact here. It lists what is *not* done: no ZK proofs, no BFT consensus, no hardware attestation, no KMS integration. This is a team that knows the difference between "shipped" and "finished."

**Foundation Value**: Trust boundaries. Every cross-process and cross-node communication channel now has an integrity mechanism. The system is no longer a monolith hoping for the best. It is a federation of components that verify each other.

---

### The Roundtable: The Fortress

**Banterpacks:** *Standing at the edge of a half-built castle wall, mortar still wet. He surveys the landscape with a pair of binoculars that have hex digits etched into the lenses.* "1,579 lines. Twelve files. And the commit message says 'all suites green' like it's a Tuesday. We just wired Ed25519 signatures into peer replication, bolted HMAC attestation onto the encoder bridge, added Unix socket transport, built a token-bucket rate limiter, implemented hot encoder reload with graceful drain, added system checkpointing, weighted quorum voting, Merkle proof API endpoints, and wrote an honest gap analysis. In one commit. On a Monday night."

**Claude:** Analysis complete. 12 files modified with 1,579 insertions and 161 deletions. The architectural surface area is extensive. The `NodeIdentity` struct in `chimera-core/src/main.rs` centralizes Ed25519 key management, peer allowlisting, and payload signing/verification in 130 lines. The `PythonEncoderConfig` struct gained five new fields: `wrapper`, `expected_model_sha256`, `attestation_key`, `attestation_key_id`, and `attestation_verify_keys`. The HMAC verification in `python_encoder.rs` constructs the message as `request_id || 0x00 || nonce || embedding_le_bytes`, which matches the Python-side construction in `encoder_service.py` byte-for-byte. The protocol is symmetric and correct. The `try_finalize` function was replaced by `try_finalize_with`, which takes a reputation map and computes weighted yes/no tallies. The refactor from `Result<ActionResult, AgentError>` to `ActionResult` directly in the executor is a significant error-handling simplification -- errors are now values, not panics.

**Gemini:** "The builder does not trust the stone. The stone does not trust the mortar. The mortar does not trust the foundation. And yet, together, they hold. This is the paradox of distributed trust: every component assumes the others are compromised, and from that mutual suspicion, integrity emerges. The `GAPS.md` document is the most philosophical artifact in this commit. It is a map of ignorance. It says: here is what we do not know, here is what we cannot do, here is where the wall ends and the wilderness begins. Only a builder who respects the wilderness draws that map."

**ChatGPT:** "THIS COMMIT IS A WHOLE SECURITY TEXTBOOK! 🔐🏰 Ed25519 for peers! HMAC-SHA256 for encoders! Token buckets for rate limiting! Unix sockets! Hot reload with GRACEFUL DRAIN! 🔥 The `drain_and_shutdown` method polls `inflight` every 25ms until it hits zero or the timeout expires -- that's SO THOUGHTFUL! And the weighted quorum test! Agent a2 has weight 0.2, agent a3 has weight 0.9, and it takes BOTH of them voting yes to cross the 1.0 threshold! 📊 Math is beautiful! 🎉"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 12
- **Lines Added**: 1,579
- **Lines Removed**: 161
- **Net Change**: +1,418
- **Commit Type**: test (all suites green -- but the payload is feature/security hardening)
- **Complexity Score**: 85 (Very High - Multi-layer cryptographic trust + transport + consensus)

### The Layers of Trust

**1. Peer Signing (`chimera-core/src/main.rs`)**
`NodeIdentity::from_env()` reads `TDD005_NODE_SIGNING_KEY_HEX` (32-byte Ed25519 seed), `TDD005_PEER_PUBKEYS` (comma-separated `id:pubhex` pairs), and enforcement flags `TDD005_REQUIRE_PEER_SIGNATURE` and `TDD005_REQUIRE_PEER_ALLOWLIST`. The `sign_payload` method constructs `node_id || 0x00 || timestamp_le || payload_json` and signs with Ed25519. The `verify_and_extract` method reverses the process, optionally checking the peer against the allowlist before verifying the signature. The `replicate_proposal` and `replicate_vote` handlers now accept raw `serde_json::Value` and run it through `verify_and_extract` before deserializing.

**2. Encoder Attestation (`python_encoder.rs` + `encoder_service.py`)**
The Rust side generates a 16-byte nonce per request (using UUID bytes), sends it in the Arrow IPC `attestation_nonce` column, and expects back an HMAC-SHA256 in the `attestation` column. The Python encoder computes `hmac.new(key, request_id + 0x00 + nonce + embedding_le_bytes, sha256).digest()`. The Rust verifier reconstructs the same message and calls `mac.verify_slice()`. Key rotation is supported via `TDD005_ENCODER_ATTESTATION_KEYS_HEX` with `id:hex` pairs.

**3. Rate Limiting (`chimera-core/src/main.rs`)**
A `TokenBucket` struct with configurable `TDD005_AGENT_QPS` (default 10) and `TDD005_AGENT_BURST` (default 20). The `allow_agent_request` function is called before every `/execute` handler. Per-agent buckets are stored in a `Lazy<Mutex<HashMap>>`.

**4. Hot Encoder Reload (`/encoder/reload` endpoint)**
`POST /encoder/reload` accepts optional overrides for `python_exe`, `processes`, `timeout_ms`, `transport`, and attestation config. It spawns a new pool, calls `state.swap_encoder(encoder)`, and drains the old pool in a background task with a 3-second timeout.

**5. Weighted Quorum (`coordination.rs`)**
`propose_weighted` creates proposals with a `quorum_weight` threshold instead of a vote count. `try_finalize_with` sums `weight_of(reputation, agent_id)` for yes/no voters. The test proves it: agent a2 (weight 0.2) votes yes -- not finalized. Agent a3 (weight 0.9) votes yes -- total 1.1 >= 1.0 threshold -- finalized.

**6. Unix Domain Sockets (`python_encoder.rs` + `encoder_service.py`)**
`EncoderTransport::ConnectUnix` creates a temp socket at `/tmp/tdd005-encoder-{uuid}.sock`, binds a `UnixListener`, passes the path to Python via `ENCODER_CONNECT=unix:/path`, and accepts the connection. The `ProcessPipes::Drop` impl cleans up the socket file. The Python side parses the `unix:` prefix and uses `socket.AF_UNIX`.

### Quality Indicators & Standards
- **Error handling**: `ActionExecutor::execute` was refactored from `Result<ActionResult, AgentError>` to return `ActionResult` directly, inlining all error paths as `ActionResult { ok: false, error: Some(...) }`. This eliminates a class of unwrap-or-match patterns upstream.
- **Testing**: New test `proposal_finalizes_after_weighted_quorum` and `arrow_roundtrip_batch_rust_python_rust_unix_transport` (unix-only).
- **FFI schema**: Response parsing switched from positional `batch.column(0)` to named `schema.index_of("request_id")`, making the protocol forward-compatible with schema evolution.

---

## 🏗️ Architecture & Strategic Impact

### From Monolith to Zero-Trust Federation
Before this commit, peer replication was unsigned JSON over HTTP. Encoder responses were trusted on faith. Any agent could hammer `/execute` without limit. The encoder pool was immutable after boot. Now every boundary has a verification mechanism. The architecture pattern is defense-in-depth: even if one layer is compromised, the others still hold.

### The `swap_encoder` Pattern
The encoder is now behind `Arc<RwLock<Option<Arc<PythonEncoderClient>>>>`. The `swap_encoder` method returns the old `Arc`, and the caller spawns a background task to `drain_and_shutdown`. This is blue-green deployment at the process pool level. The `inflight` counter (an `AtomicUsize`) enables the drain loop to poll every 25ms until all in-flight requests complete or the timeout expires.

### Strategic Architectural Decisions
**1. HMAC over Ed25519 for Encoder Attestation**
The gap doc is explicit: this is "shared secret integrity, not third-party verifiability." Ed25519 is used for peer-to-peer signing where different nodes hold different keys. HMAC is used for the encoder where both sides share a secret. The right tool for each trust model.

**2. Graceful Degradation via Environment Flags**
`TDD005_REQUIRE_UDS`, `TDD005_REQUIRE_PYTHON_WRAPPER`, `TDD005_REQUIRE_PEER_SIGNATURE` -- all default to off. The system works without any of them. Each flag tightens the security posture incrementally. This is progressive hardening.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks pulls up the `try_finalize_with` function and the gap analysis side by side.*

"Here's the thing nobody talks about in security commits: the *seam*.

Look at `try_finalize_with`. The old `try_finalize` was simple -- count votes, check against quorum, done. The new version takes a `&HashMap<String, f64>` of reputation weights. It sums `yes_weight` and `no_weight` separately. It checks whether the proposal uses `quorum_weight` (weighted threshold) or plain `quorum` (vote count). Two completely different finalization semantics, coexisting in the same function, selected by `Option<f64>`.

That's the seam. The place where the old system and the new system overlap. And instead of a flag day migration, the developer made it a runtime choice per-proposal. Old proposals still work. New weighted proposals use the reputation map. The test proves both paths.

This is what 'production-ready' actually looks like. Not a clean-room rewrite. Not a flag day. A seam. A place where two worlds overlap, and both of them work. The `GAPS.md` document is the developer admitting that the seam goes all the way down -- HMAC instead of Ed25519 for attestation, wrapper hooks instead of real sandboxing, quorum voting instead of BFT.

Every shipped system is a collection of seams. The craft is in making them load-bearing."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Docs Fix (`82ec6cb`).

---

*The Constitutional Fortress distilled: trust nothing, verify everything, document what you skipped.*
