# MIT agent references for OMNIAI

This document records MIT-licensed projects that OMNIAI may study and, where appropriate, adapt from while preserving required copyright/license notices.

## Verified references

| Project | Repository | Why it matters to OMNIAI |
|---|---|---|
| OpenHands | https://github.com/OpenHands/OpenHands | Agent Canvas, local/cloud agent orchestration, permissions, workspaces, execution architecture. The repository states that its non-enterprise work is MIT licensed; the `enterprise/` directory is separately licensed. |
| OpenHands Software Agent SDK | https://github.com/OpenHands/software-agent-sdk | Modular agent SDK, tools, conversations, workspaces, events and agent-server concepts. MIT licensed. |
| OpenHands Agent Canvas | https://github.com/OpenHands/agent-canvas | Self-hostable coding-agent control center and frontend architecture. MIT licensed. |
| OpenHands CLI | https://github.com/OpenHands/OpenHands-CLI | Lightweight local coding-agent/CLI architecture. MIT licensed. |
| Agent Zero | https://github.com/agent0ai/agent-zero | Extensible agent profiles, tools/plugins, local execution and safety-oriented workflows. MIT licensed. |
| SWE-agent | https://github.com/SWE-agent/SWE-agent | Repository exploration, issue-to-change workflows, model abstraction and software-engineering agent loops. MIT licensed. |
| Code Assistant | https://github.com/stippi/code-assistant | Native coding assistant, autonomous edit loop, MCP/ACP integration, session behavior and stale-file protection ideas. MIT licensed. |

## Important boundary

"Use MIT repositories" does not mean copying entire upstream repositories into OMNIAI. OMNIAI should remain a coherent product and should avoid unnecessary vendoring.

The preferred order is:

1. Study architecture and workflows.
2. Reimplement the useful behavior in OMNIAI's own architecture when practical.
3. Copy source code only when there is a clear technical benefit, the exact upstream license is compatible, the relevant copyright/license notice is retained, and the imported surface is documented below.
4. Keep non-MIT projects as architectural references only unless their separate license terms are explicitly reviewed.

## Initial architecture to absorb

- Agent runtime with explicit lifecycle/events.
- Workspace abstraction that supports local, private and remote execution.
- Tool registry with permission checks and approval gates.
- Repository-aware context gathering before editing.
- Patch/diff based edits with stale-file conflict detection.
- Command execution behind sandbox/allowlist controls.
- MCP/ACP-compatible extensibility.
- Session/run history, observability and recoverable errors.
- Multi-agent roles for planning, implementation, testing and review.

## License compliance

OMNIAI's own source remains MIT. Any future copied or vendored code must add its upstream copyright notice and license text to `THIRD-PARTY-NOTICES.md` and must identify the imported paths.

No upstream source code is claimed as imported by this document itself; this file is a reference registry and implementation guide.
