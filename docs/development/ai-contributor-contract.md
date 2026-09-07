# Contract for AI contributors

OMNIAI is designed to be improved by multiple AI coding assistants without losing functionality between iterations.

## Non-negotiable rules

1. `main` is the canonical integration branch for the product core.
2. Read `docs/architecture/unified-core.md` before changing agent/runtime architecture.
3. Put shared behavior in `src/lib/core` or existing shared layers; do not duplicate it in web or Windows UI code.
4. Preserve existing public behavior unless the task explicitly requests a breaking change.
5. File writes, deletes, Git writes, deployments, secret handling and production actions require explicit approval gates.
6. Never remove an existing feature just because a new implementation is easier.
7. Do not change unrelated dependency versions while editing `package.json`.
8. Dependency changes must be synchronized with `bun.lock` before enabling frozen-lockfile CI again.
9. Add or update a regression test/guard for every important architectural invariant.
10. Every intentional change to `main` must have a clear commit message.

## Safe improvement loop

```text
inspect main
   -> identify reusable capability
   -> compare MIT references
   -> implement in Core
   -> adapt Web/Windows surface
   -> run architecture/lint/build checks
   -> inspect diff for regressions
   -> commit to main
```

## Multi-AI collaboration

Different AI tools may work on separate features, but they must converge on the same Core contracts and event model. When two agents propose competing implementations, keep one canonical implementation and make the other a thin adapter or remove the duplication.

A useful AI handoff should include: current Core version, files changed, known limitations, tests/guards added, and the next safe extension point.

## Recovery

Before large refactors, create a dated backup branch. Never force-push `main` and never delete another branch as part of normal feature work. A rollback must be possible by moving back to a known-good commit or using the backup branch.
