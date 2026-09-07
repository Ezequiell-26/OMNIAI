# OMNIAI — DURABLE ARCHITECTURAL DECISIONS

This file records decisions that future AI sessions must treat as constraints unless a new decision explicitly supersedes them.

## D001 — One Core

**Decision:** `src/lib/core` is the only logical brain.

**Reason:** prevents Web and Windows from developing incompatible agent behavior.

**Consequence:** shared contracts, lifecycle, policies, routing, orchestration and run semantics belong in Core; surfaces adapt input/output only.

## D002 — Main is canonical

**Decision:** `main` is the final integration branch and the only canonical product branch.

**Reason:** multiple divergent branches exist and must not become competing product brains.

**Consequence:** every completed implementation must finish in `main`; other branches are source material or recovery points, never the final home of product functionality.

## D003 — Ports before platform implementations

**Decision:** Git, terminal, test, filesystem, browser and remote execution are exposed as interfaces/contracts before platform-specific implementations.

**Reason:** Web and Windows need the same agent semantics with different I/O capabilities.

## D004 — Explicit permission gates

**Decision:** risky actions require policy/approval; secrets are not ordinary tool input.

**Reason:** autonomous agents can execute real side effects and must be bounded.

## D005 — Runs are durable domain objects

**Decision:** execution state, events, approvals, tools, changes and test results must be persistible and inspectable.

**Reason:** a browser refresh or a new UI session must not erase agent state.

## D006 — Change through patches/ChangeSets

**Decision:** file changes should become explicit proposed changes with hashes and conflict detection before application.

**Reason:** never silently overwrite external edits and allow review/rollback.

## D007 — Provider-neutral Agent Runtime

**Decision:** Agent Runtime depends on `AIProvider`/gateway contracts, never concrete vendor SDKs.

**Reason:** OMNIAI is multi-model and must support cloud, private, local and OpenAI-compatible endpoints.

## D008 — Documentation is persistent engineering memory

**Decision:** every significant AI session updates the context, state, decisions and handoff documents.

**Reason:** model context is ephemeral; Git is the durable collaboration layer.

## D009 — Evidence over claims

**Decision:** a feature is DONE only when implementation, integration, persistence/events, tests and error handling exist as appropriate.

**Reason:** UI-only placeholders create false project state for future agents.

## D010 — Study open source, do not indiscriminately vendor

**Decision:** use permissive repositories as architectural references first; imported code requires license compatibility, attribution and registry documentation.

**Reason:** preserve OMNIAI's coherent architecture and licensing obligations.

## D011 — Professional open-source research standard

**Decision:** future AIs must prefer production-grade, actively maintained, well-tested and well-documented open-source projects when researching implementation approaches. MIT references are preferred when source reuse is contemplated; other permissive licenses require explicit compatibility review.

**Reason:** OMNIAI should learn from serious engineering work instead of unreliable snippets or stale examples.

**Consequence:** current upstream documentation/license data must be verified for rapidly changing dependencies. Architecture should usually be reimplemented within OMNIAI's own contracts rather than copied.

## D012 — Persistent multi-AI continuity

**Decision:** Git plus the persistent AI memory documents are the shared engineering memory across all GPT/AI sessions.

**Reason:** no individual chat is authoritative or permanent.

**Consequence:** every meaningful session updates state and handoff, and the next AI must verify real source/test state before trusting documentation.
