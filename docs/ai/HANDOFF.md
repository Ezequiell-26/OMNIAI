# OMNIAI — AI HANDOFF

This is the first document to update at the end of every meaningful AI coding session and the first handoff document to read at the beginning of the next one.

## Current continuation point

**Date:** 2026-09-08

**Canonical branch:** `main`

**Core version:** `1.1.0`

**Current main HEAD when this handoff was created:** `6fb5aa6f040aa5b7a6ac77563fbb5ba69e03bef7`

**What was just established:** permanent multi-AI engineering policy covering main-only integration, professional open-source research, MIT preference for equivalent source reuse, current upstream verification, license discipline, evidence-based completion and persistent project memory. The AI context guard now validates these policies.

## What the next AI should do first

1. Read `AGENTS.md`.
2. Read `docs/ai/PROJECT-CONTEXT.md`.
3. Read `docs/ai/PROJECT-STATE.json`.
4. Read `docs/ai/DECISIONS.md`.
5. Read `docs/ai/AI-ENGINEERING-STANDARD.md`.
6. Read this file.
7. Verify current `main` HEAD because this handoff may be stale if another AI has already committed.
8. Inspect the requested feature's actual source and tests.
9. Continue from the highest unfinished priority instead of restarting architecture.

## Permanent rules

- Final product work ends in `main`.
- `web` and `windows-app` are historical/experimental source material, not product sources of truth.
- One logical brain: `src/lib/core`.
- Prefer production-grade, actively maintained, well-tested and well-documented open-source references.
- Prefer MIT when an equivalent source implementation is suitable for reuse.
- Verify current upstream API/license data for changing dependencies.
- Prefer reimplementation over indiscriminate vendoring.
- Record any real third-party source incorporation in `THIRD-PARTY-NOTICES.md`.
- Never call a feature DONE without implementation evidence appropriate to the capability.

## Exact engineering continuation point

The immediate next extension point is:

**durable run/event persistence + live event streaming + concrete execution adapters**, while keeping the existing provider-neutral Core boundary.

After that, continue with transactional ChangeSets, incremental indexing, production provider adapters/fallback, self-healing, multi-agent scheduling, and full Web/Windows Core integration.

## Current reality check

The repository has real Core foundations but not every final product capability is complete. In particular, do not confuse contracts/UI with end-to-end implementations.

The `AgentExecutionEngine` can perform a bounded model/tool/result iteration, but full provider, platform adapters, durable application persistence and live surface integration remain work items.

## Session completion checklist

At the end of each session, record:

- Core version;
- exact `main` HEAD;
- goal;
- files changed;
- behavior changed;
- tests run and results;
- security implications;
- known issues/blockers;
- open-source references used;
- license checks performed;
- next extension point;
- whether persistent docs were synchronized.

## Handoff template for future sessions

Copy this section for a new session entry instead of deleting historical information:

```md
### YYYY-MM-DD — [AI/session label]

- Core version:
- Main HEAD:
- Goal:
- Implemented:
- Files changed:
- Behavior changed:
- Tests/verification:
- Security notes:
- Open-source references:
- License checks:
- Known issues:
- Blocked:
- Next extension point:
- Docs synchronized: yes/no
```

## Historical handoff

### 2026-09-08 — permanent AI engineering brain

- Core version: 1.1.0
- Main HEAD: `6fb5aa6f040aa5b7a6ac77563fbb5ba69e03bef7`
- Goal: make independent GPT/AI sessions able to improve OMNIAI continuously from Git alone with a consistent engineering standard.
- Implemented: strengthened `AGENTS.md`, professional AI engineering standard, durable architectural decisions, machine-readable state, handoff rules, and CI enforcement for the persistent AI context policy.
- Next extension point: durable run/event persistence + live streaming + concrete execution adapters.
