# OMNIAI — AI ENGINEERING STANDARD

This is the quality standard for every GPT, coding agent and human contributor working on OMNIAI.

## 1. Mission

Improve OMNIAI continuously without losing working capabilities, architectural coherence, security or context.

The desired outcome is a professional, production-grade AI software engineering platform, not a collection of demos.

## 2. Source hierarchy

When deciding what is true, use this order:

1. current executable source;
2. current tests and verification output;
3. current dependency/API documentation;
4. persistent project memory;
5. Git history;
6. architectural references and external examples.

Never allow an old handoff or model memory to override current code and tests.

## 3. Engineering loop

```text
UNDERSTAND
→ INSPECT
→ RESEARCH
→ DESIGN
→ IMPLEMENT
→ VERIFY
→ REVIEW
→ DOCUMENT
→ COMMIT MAIN
```

The AI should avoid large blind rewrites. Prefer small, composable, reversible changes.

## 4. Professional reference rule

For non-trivial capabilities, research established professional implementations before inventing a solution.

Prefer projects that are:

- production-grade;
- actively maintained;
- widely used;
- strongly documented;
- well tested;
- security-conscious;
- architecturally relevant;
- permissively licensed.

For source-code reuse, prefer MIT when a technically equivalent MIT implementation exists.

Examples of useful reference categories include:

- coding-agent runtimes;
- agent SDKs;
- model gateways/routers;
- MCP servers and tool systems;
- repository indexing/search;
- patch engines;
- sandboxing;
- terminal execution;
- workflow engines;
- tracing/observability;
- desktop adapters.

Use `docs/open-source/mit-agent-references.md` as the curated registry.

## 5. License discipline

Before importing third-party code:

- verify the exact upstream repository and commit/version;
- verify the exact license for the relevant path;
- inspect copyright/notice obligations;
- inspect important dependency licenses;
- record the incorporation in `THIRD-PARTY-NOTICES.md`;
- preserve required notices.

Prefer reimplementation over vendoring when practical.

Do not copy code merely because it is convenient.

Do not use restrictive/reciprocal code in the MIT codebase without an explicit legal review/strategy.

## 6. Main-only integration

Every finished feature belongs in `main`.

Other branches can be inspected for useful historical work, but they are not alternative product homes.

Never force-push or destructively rewrite `main`.

## 7. One brain

All shared behavior belongs in Core/shared layers.

Never create a second:

- runtime;
- state machine;
- permission engine;
- model router;
- event contract;
- run manager;
- tool registry;
- business rule implementation.

Web and Windows are surfaces/adapters.

## 8. Evidence-based completion

Do not call something DONE because a screen renders.

For a substantial capability, seek evidence across:

- implementation;
- integration;
- persistence;
- events/streaming;
- error handling;
- tests;
- security;
- documentation.

Mark partial capabilities honestly.

## 9. Regression discipline

Before changing architecture:

- inspect current behavior;
- identify existing tests;
- preserve public behavior;
- create a backup/recovery point for large refactors.

After changing architecture:

- run the strongest available checks;
- inspect the diff;
- add regression coverage;
- update persistent memory;
- record unresolved risks.

## 10. Dependency discipline

Do not upgrade unrelated dependencies.

Before adding a package, check:

- whether the capability already exists;
- maintenance health;
- license;
- bundle/runtime impact;
- compatibility with current versions;
- lockfile impact.

Keep the lockfile synchronized.

## 11. Security discipline

Treat filesystem, terminal, network, Git writes, secrets and production actions as privileged.

Use least privilege.

Never expose secrets to the model as ordinary project content.

Never silently overwrite externally modified files.

Prefer explicit approvals for high-risk actions.

## 12. Multi-AI handoff

Every meaningful AI session must leave enough information for a different model to continue immediately.

Update:

- `PROJECT-CONTEXT.md`;
- `PROJECT-STATE.json`;
- `DECISIONS.md`;
- `HANDOFF.md`.

Record the exact `main` HEAD, Core version, changed files, tests, known issues and next extension point.

## 13. Continuous improvement

Do not optimize only for the requested ticket.

When safe and relevant, also identify:

- duplicated logic;
- missing tests;
- unsafe defaults;
- stale docs;
- weak observability;
- architecture drift;
- missing error recovery;
- opportunities to reuse a professional open-source pattern.

Any adjacent improvement must remain scoped, justified and regression-tested.
