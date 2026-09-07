# OMNIAI — AI CONTRIBUTOR ENTRYPOINT

This file is mandatory reading for every AI coding agent, in every new chat, before changing the repository.

## CANONICAL SOURCE OF TRUTH

- Repository: `Ezequiell-26/OMNIAI`
- **Canonical development, integration, testing and release branch: `main`**
- Product brain: `src/lib/core`
- Core version: `OMNIAI_CORE_VERSION` in `src/lib/core/contracts.ts`
- Web and Windows are platform surfaces/adapters, never alternate product brains.
- Executable source and passing tests outrank documentation when they disagree.

## ABSOLUTE MAIN RULE

`main` is the only canonical OMNIAI product branch.

Every AI session MUST:

1. start by reading the current `main` state;
2. verify the current `main` HEAD before editing;
3. build on existing functionality instead of recreating it;
4. keep shared logic in Core/shared layers;
5. finish every completed implementation by committing it to `main`;
6. never leave a finished feature only on `web`, `windows-app`, or a temporary branch.

`web` and `windows-app` may contain historical/experimental work. They are source material only. If they contain useful functionality, extract/adapt that capability into the canonical Core/adapters and finish the work on `main`.

Never force-push, reset destructively, delete branches, or overwrite unrelated work.

**Target architecture: one repository → one canonical codebase → one Core → one integration branch: `main`.**

## REQUIRED READING ORDER

Read these files in order at the beginning of every new AI session:

1. `AGENTS.md`
2. `docs/ai/PROJECT-CONTEXT.md`
3. `docs/ai/PROJECT-STATE.json`
4. `docs/ai/DECISIONS.md`
5. `docs/ai/HANDOFF.md`
6. `docs/ai/AI-ENGINEERING-STANDARD.md`
7. `docs/architecture/unified-core.md`
8. `docs/architecture/audit.md`
9. `docs/development/ai-contributor-contract.md`
10. `docs/open-source/mit-agent-references.md`
11. relevant source files and tests

Do not trust the handoff blindly. Re-verify the real repository state.

## AI CONTINUATION PROTOCOL

A new AI must continue the existing project, not restart it.

Before coding:

- identify the current Core version and `main` HEAD;
- inspect existing implementation and tests for the requested area;
- inspect persistent project memory;
- compare related work in existing branches before reimplementing anything;
- identify the smallest safe extension point;
- preserve current public behavior unless a breaking change is explicitly intended;
- decide whether the feature belongs in Core, Agent, adapter, surface, or UI.

After coding:

- update `PROJECT-STATE.json` when implementation status changes;
- update `HANDOFF.md` with the exact continuation point;
- update `DECISIONS.md` for durable architectural decisions;
- update `PROJECT-CONTEXT.md` when the product/architecture changes;
- update `docs/architecture/audit.md` when gaps or priorities change;
- add regression tests/guards;
- run the strongest available verification;
- inspect the final diff for accidental changes;
- commit the finished work to `main`.

## PROFESSIONAL OPEN-SOURCE RESEARCH POLICY

OMNIAI must continuously learn from high-quality professional software projects while preserving its own architecture, security and licensing.

### Source quality priority

When researching implementation patterns, prefer:

1. production-grade and actively maintained projects;
2. widely adopted projects with strong engineering practices;
3. clear architecture, tests, documentation and security posture;
4. permissive licenses compatible with OMNIAI;
5. especially strong MIT-licensed references when source reuse is contemplated;
6. official upstream source/docs over blogs, snippets or low-quality tutorials.

Use the curated registry at `docs/open-source/mit-agent-references.md` and expand it when genuinely relevant professional references are found.

### License rules

- Research architecture and behavior first; research is not copying.
- Prefer independent reimplementation inside OMNIAI's own contracts.
- Before importing source, verify the exact repository/path license, copyright obligations, and dependency licenses.
- Prefer MIT for code incorporation when technically equivalent.
- Apache-2.0 or another permissive license may be used only after compatibility and attribution are checked.
- Do not copy AGPL/SSPL/restrictive code into the MIT codebase without an explicit license strategy.
- Every real third-party source incorporation must be recorded in `THIRD-PARTY-NOTICES.md` with upstream project, version/commit, license, copyright and imported paths.
- Never claim an API, SDK, model or dependency is MIT merely because OMNIAI is MIT.

### Currentness rule

For current or rapidly changing libraries/projects, an AI must verify current upstream documentation and license information before making critical architectural decisions. Do not rely on stale model memory for versions, APIs, licenses or security-sensitive behavior.

## FEATURE DEFINITION OF DONE

A capability is not complete because a UI exists or because an interface was declared.

Prefer this evidence chain:

`UI → surface/API adapter → Core runtime → persistence/events → real tool/adapter → tests → error handling → documentation`

A contract without implementation is partial.
A button without runtime is partial.
A mock without real integration is partial.

Never mark partial functionality as DONE in project memory.

## SAFETY

Read-only inspection should be easy. Writes, deletes, terminal commands, Git writes, network access, secret handling, deployment and production actions must pass the appropriate policy/approval system.

Secrets are never ordinary workspace data. Agents must not silently overwrite external changes, escape the workspace boundary, or execute destructive operations without explicit authorization.

## CORE ARCHITECTURE

The only logical brain is `src/lib/core`.

`Core → Agent → Adapters → Web/Windows surfaces`

Do not duplicate agent lifecycle, permissions, model routing, provider selection, run semantics, event contracts, tool contracts or shared business rules in platform surfaces.

## CONTINUOUS IMPROVEMENT

OMNIAI is intentionally designed to improve across many AI sessions.

Every meaningful session should leave the repository more capable, tested, documented, understandable and safe.

Persistent engineering memory is:

`AGENTS.md + PROJECT-CONTEXT.md + PROJECT-STATE.json + DECISIONS.md + HANDOFF.md + architecture/audit.md`

Git history is part of the durable project record.

## HANDOFF REQUIREMENT

Every meaningful session must record:

- Core version;
- exact `main` HEAD;
- objective;
- files changed;
- behavior changed;
- tests and results;
- security implications;
- known issues/blockers;
- next extension point;
- documentation synchronization status.

The next AI must be able to continue without needing this chat.
