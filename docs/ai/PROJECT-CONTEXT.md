# OMNIAI — PROJECT CONTEXT

This document is the durable high-level context for future AI sessions. It should answer: what is OMNIAI, how is it structured, what must never be duplicated, and how should the project evolve.

## 1. Product identity

OMNIAI is an AI-first software development platform combining:

- normal multi-model chat;
- BYOK cloud providers;
- local/private models;
- autonomous software-engineering agents;
- repository/project understanding;
- file inspection and editing;
- diffs and approvals;
- terminal/test execution;
- Git operations;
- MCP/tools/skills;
- multi-agent orchestration;
- runs, traces, persistence, recovery and cost visibility;
- Web and Windows surfaces using one shared brain.

The long-term product goal is an AI operating system for software work: the user gives a complex goal and OMNIAI can understand, plan, inspect, reason, act, edit, test, recover, review and complete it safely.

## 2. Non-negotiable architecture

There is exactly one logical brain: `src/lib/core`.

Layers:

`Core → Agent implementations → platform adapters → Web/Windows surfaces`

Core must remain portable and must not depend on React, browser UI, Electron or Tauri concepts.

The canonical contracts are exported by `src/lib/core/index.ts`.

Web and Windows may render different experiences, but they must consume the same runtime decisions, permissions, events, models, tools and run state.

## 3. Current Core state

As of the current `main` state, Core version is `1.1.0`.

Implemented foundations include:

- formal agent state machine;
- run record and RunManager abstraction;
- typed AgentEvent model covering runs, agents, tools, approvals, files, Git, terminal, tests and reviews;
- permission/risk model and approval decisions;
- provider-independent AI Gateway contracts;
- model-routing contracts/policies;
- project manifest/context ranking;
- portable Git/terminal/test adapter interfaces;
- agent ToolRegistry with input validation and permission checks;
- `AgentExecutionEngine` loop capable of model → tool → result iteration with bounded turns and error recording.

## 4. What is intentionally NOT considered finished

These are gaps, not hidden implementations:

- production provider adapters and full provider fallback wiring;
- streaming event delivery into all surfaces;
- application database persistence for runs/events/approvals/tool calls;
- real local filesystem/Git/terminal/test adapters connected end-to-end;
- incremental project indexing;
- multi-file transactional ChangeSet with stale-hash conflict handling and rollback;
- complete self-healing loop;
- full multi-agent runtime scheduling (sequential/parallel/conditional);
- Web and Windows fully consuming the same Core execution pipeline;
- MCP lifecycle, Knowledge/RAG and persistent Memory integration;
- advanced traces/observability and cost accounting UI.

Never describe one of these as complete merely because contracts or UI exist.

## 5. Existing important source areas

### Core

- `src/lib/core/contracts.ts` — canonical types/version/events/run model.
- `src/lib/core/runtime.ts` — Core singleton/factory and capabilities.
- `src/lib/core/state-machine.ts` — legal agent lifecycle transitions.
- `src/lib/core/run-manager.ts` — run lifecycle + persistence port.
- `src/lib/core/permissions.ts` — risk/approval policy primitives.
- `src/lib/core/ai-gateway.ts` — provider-neutral AI boundary.
- `src/lib/core/project-context.ts` — manifest/context ranking.
- `src/lib/core/adapters.ts` — portable Git/terminal/test interfaces.

### Agent

- `src/lib/agent/orchestrator.ts` — built-in roles and starter planning.
- `src/lib/agent/runtime.ts` — agent run snapshot/orchestration compatibility layer.
- `src/lib/agent/executor.ts` — real bounded model/tool execution loop.
- `src/lib/agent/tool-registry.ts` — tool registration, validation and permission gate.
- `src/lib/agent/tools/` — concrete agent tools.
- `src/lib/agent/model-router.ts` — model candidate filtering/scoring.

### Workspace/diffs

- `src/lib/fs/` — workspace/file-system behavior and persistence of pending edits.
- `src/lib/diff/` — line diff and file change presentation.
- `src/components/agent/` — agent UI, diff cards and workspace UI.

### Surfaces

- `src/app/` and related components — current Web application.
- `windows-app` branch — valuable Windows/UI/streaming implementation history; do not merge blindly.
- `web` branch — valuable web implementation history; do not merge blindly.

## 6. Existing branch strategy

`main` is canonical and must receive final changes.

`web` and `windows-app` are divergent histories. Preserve their useful behavior by extracting functionality into Core/adapters rather than replacing `main` wholesale.

Do not force-push or delete branches. Existing backup branches are deliberate recovery points.

## 7. Safety model

Read-only inspection should be frictionless. Writes, deletes, terminal commands, Git writes, network operations and production-affecting actions must pass the appropriate permission policy. Secrets must never be exposed to an agent as ordinary workspace data.

The agent must not silently overwrite external file changes. Future ChangeSet implementations must use content hashes/conflict detection before applying edits.

Git push, deployment and production actions require explicit approval.

## 8. Open-source strategy

OMNIAI studies permissively licensed agent projects for architecture and workflow ideas. Current reference registry lives in `docs/open-source/mit-agent-references.md`.

Preferred behavior:

1. study;
2. reimplement within OMNIAI's architecture;
3. import source only when technically justified and license-compatible;
4. retain attribution/license and record imported paths in `THIRD-PARTY-NOTICES.md`.

## 9. Engineering philosophy

`MEJORAR > REEMPLAZAR`

`INTEGRAR > DUPLICAR`

`PROBAR > SUPONER`

`PRESERVAR > BORRAR`

`CORE ÚNICO > IMPLEMENTACIONES PARALELAS`

`SEGURIDAD > VELOCIDAD`

A new solution must first inspect existing behavior and reuse it whenever practical.

## 10. Preferred next sequence

The current continuation order is:

1. real persistence + event store;
2. streaming + cancellation;
3. real workspace/Git/terminal/test adapters;
4. ChangeSet transaction/conflicts/rollback;
5. incremental ProjectIndexer;
6. production provider adapters + fallback;
7. self-healing/replan loop;
8. multi-agent scheduling;
9. Web + Windows end-to-end Core integration;
10. observability/traces/cost;
11. MCP/Memory/Knowledge/Workflow;
12. broad regression/security/CI hardening.

A later AI may reorder this only after inspecting dependencies and recording the decision.
