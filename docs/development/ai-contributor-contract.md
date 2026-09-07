# Contract for AI contributors

OMNIAI is designed to be improved by multiple AI coding assistants without losing functionality between iterations.

## Non-negotiable rules

1. `main` is the canonical integration branch for the product core.
2. Read `AGENTS.md` first in every new AI session.
3. Then read `docs/ai/PROJECT-CONTEXT.md`, `docs/ai/PROJECT-STATE.json`, `docs/ai/DECISIONS.md` and `docs/ai/HANDOFF.md` before changing architecture.
4. Read `docs/architecture/unified-core.md` before changing agent/runtime architecture.
5. Put shared behavior in `src/lib/core` or existing shared layers; do not duplicate it in web or Windows UI code.
6. Preserve existing public behavior unless the task explicitly requests a breaking change.
7. File writes, deletes, Git writes, deployments, secret handling and production actions require explicit approval gates.
8. Never remove an existing feature just because a new implementation is easier.
9. Do not change unrelated dependency versions while editing `package.json`.
10. Dependency changes must be synchronized with `bun.lock` before enabling frozen-lockfile CI again.
11. Add or update a regression test/guard for every important architectural invariant.
12. Every intentional change to `main` must have a clear commit message.
13. At the end of a meaningful session, synchronize the persistent AI memory documents with reality.

## Persistent AI memory

The repository is the durable memory shared by different AI sessions. The required memory set is:

- `AGENTS.md` — mandatory entrypoint and continuation rules.
- `docs/ai/PROJECT-CONTEXT.md` — product and architecture context.
- `docs/ai/PROJECT-STATE.json` — machine-readable implementation state and priorities.
- `docs/ai/DECISIONS.md` — durable architecture decisions.
- `docs/ai/HANDOFF.md` — exact continuation point between sessions.
- `docs/architecture/audit.md` — architectural gaps, risks and priorities.

These files are not a substitute for inspecting source code. Executable source and tests are authoritative; stale memory must be corrected when discovered.

## Safe improvement loop

```text
read persistent memory
   -> verify main HEAD
   -> inspect relevant source
   -> identify reusable capability
   -> compare MIT references
   -> implement in Core
   -> adapt Web/Windows surface
   -> add tests/guards
   -> run architecture/typecheck/lint/build checks
   -> inspect diff for regressions
   -> update persistent memory
   -> commit to main
```

## Multi-AI collaboration

Different AI tools may work on separate features, but they must converge on the same Core contracts and event model. When two agents propose competing implementations, keep one canonical implementation and make the other a thin adapter or remove the duplication.

A useful AI handoff should include: current Core version, exact main HEAD, files changed, behavior changed, tests/guards added, known limitations, security notes, blockers, and the next safe extension point.

## Recovery

Before large refactors, create a dated backup branch. Never force-push `main` and never delete another branch as part of normal feature work. A rollback must be possible by moving back to a known-good commit or using the backup branch.
