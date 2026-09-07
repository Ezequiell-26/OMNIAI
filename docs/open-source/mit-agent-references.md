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

## Verified scan — 2026-09 (GitHub REST API, license checked live per repo)

Second-pass scan focused on agent frameworks and tool ecosystems. Licenses were
verified through the GitHub API (`GET /repos/{owner}/{repo}` → `license.spdx_id`)
at scan time — not guessed. Stars are approximate.

| Project | Repository | License (verified) | Stars | Why it matters to OMNIAI |
|---|---|---|---|---|
| DeepSeek Harness | https://github.com/deepseek-ai/deepseek-harness | MIT | ~215k | **"Everything is a plugin"** architecture (TypeScript, powered by cordis). Validates OMNIAI's skills registry: every tool is an independent plugin attachable to any agent, plus an agent-loop that decides → executes → re-prompts. |
| CrewAI | https://github.com/crewAIInc/crewAI | MIT | ~58k | Sequential crew process (each task's output feeds the next agent), role/goal-driven agents, `expectedOutput` per task. Blueprint for OMNIAI multi-agent teams. |
| OpenAI Agents SDK (Python) | https://github.com/openai/openai-agents-python | MIT | ~29k | Nested **tracing spans** (agent → llm → tool) with durations and run lifecycle. Reference model for OMNIAI run traces and usage panels. |
| MCP reference servers | https://github.com/modelcontextprotocol/servers | MIT → Apache-2.0 (in transition, both permissive) | ~90k | Canonical tool specs (`filesystem`, `fetch`, `time`, `memory`, `sequentialthinking`). Inspiration for OMNIAI's builtin skill set and parameter schemas. |
| LangChain | https://github.com/langchain-ai/langchain | MIT | ~146k | Uniform tool interface (name + description + JSON schema) across providers; model-routing concept (`init_chat_model`). |
| AutoGen | https://github.com/microsoft/autogen | MIT for code (see upstream `LICENSE-CODE`; docs CC-BY-4.0) — upstream is in maintenance mode | ~61k | Agent-as-tool, MCP workbench over stdio, streaming runs. Successor project: `microsoft/agent-framework`. |
| Mastra | https://github.com/mastra-ai/mastra | Apache-2.0 (everything except `ee/`, which OMNIAI does **not** use) | ~28k | Workflow engine (`.then()/.branch()/.parallel()`), **suspend/resume HITL** persisted in storage. Future extension point for OMNIAI runs. |
| Google ADK | https://github.com/google/adk-python | Apache-2.0 | ~21k | Serializable agent config, per-tool confirmation gates, workflow runtime graph (fan-out/fan-in, loops). |

### Repositories deliberately avoided (license)

Scanned and rejected for restrictive licenses (AGPL / SSPL / modified-Apache):
`n8n`, `firecrawl`, `Skyvern`, `Flowise`, `AutoGPT` (AGPL-3.0), `lobe-chat`
(modified Apache). They remain architectural inspiration only; no code, no
vendoring.

### Scan method

1. `GET /repos/{owner}/{repo}` → `license.spdx_id`, stars, description.
2. README read via `raw.githubusercontent.com` (never clone).
3. Ideas absorbed into OMNIAI's own architecture; any future vendored code
   must comply with the "License compliance" section below.

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
