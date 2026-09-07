# OMNIAI — AI CONTRIBUTOR ENTRYPOINT

This file is mandatory reading for every AI coding agent, in every new chat, before changing the repository.

## Canonical source of truth

- Repository: `Ezequiell-26/OMNIAI`
- Canonical branch: `main`
- Product brain: `src/lib/core`
- Core version is declared by `OMNIAI_CORE_VERSION` in `src/lib/core/contracts.ts`.
- Web and Windows are surfaces/adapters, not alternate brains.

## Read order for a new AI session

Read these files in this order:

1. `AGENTS.md` — this contract.
2. `docs/ai/PROJECT-CONTEXT.md` — complete architecture and product intent.
3. `docs/ai/PROJECT-STATE.json` — machine-readable current state and priorities.
4. `docs/ai/DECISIONS.md` — durable architectural decisions.
5. `docs/ai/HANDOFF.md` — exact continuation point from the previous work session.
6. `docs/architecture/unified-core.md` — Core/surface boundary.
7. `docs/architecture/audit.md` — known strengths, gaps, risks and priorities.
8. `docs/development/ai-contributor-contract.md` — collaboration and safety contract.
9. `docs/open-source/mit-agent-references.md` — approved architectural references and license rules.
10. Then inspect the actual source tree and verify that documentation still matches reality.

Documentation never outranks executable code. When docs and code disagree, inspect the code, correct the documentation, and record the decision.

## Mandatory continuation behavior

A new AI must NOT restart the project from memory or invent a new architecture.

Before coding:

- verify `main` HEAD;
- inspect the files relevant to the requested feature;
- inspect `PROJECT-STATE.json` and `HANDOFF.md`;
- identify the existing implementation that can be extended;
- preserve working behavior;
- keep shared behavior in Core;
- adapt Web/Windows through adapters;
- avoid duplicate contracts, runtimes or permission systems.

After coding:

- update `PROJECT-STATE.json` when capability/status changes;
- update `HANDOFF.md` with the exact continuation point;
- update `DECISIONS.md` for durable architectural decisions;
- add tests/guards for important behavior;
- update `docs/architecture/audit.md` when priorities or known gaps change;
- commit all final work to `main`;
- never force-push, delete branches, or overwrite unrelated work.

## Definition of done

A capability is not complete because a UI exists. For agent functionality, prefer the chain:

`UI → API/surface adapter → Core runtime → persistence/events → real adapter/tool → tests → error handling`

Do not mark a feature DONE when it is only simulated.

## Infinite improvement rule

OMNIAI is intended to be improved by many AI sessions over time. Every session must leave the repository in a more understandable state than before it started.

Every session must leave four durable artifacts up to date:

`PROJECT-CONTEXT.md` + `PROJECT-STATE.json` + `DECISIONS.md` + `HANDOFF.md`

This is the project's persistent engineering memory.
