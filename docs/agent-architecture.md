# OmniAI Agent architecture

OmniAI keeps the existing Local-First/BYOK chat product and adds an agent control plane under `/agent`.

## Reference architecture

```text
User
  ↓
Agent Workspace
  ↓
Agent Orchestrator
  ├── Architect
  ├── Coder
  ├── Tester
  ├── Reviewer
  └── Security
  ↓
Tool Runtime + Permission Gate
  ↓
AI Gateway / Model Router
  ├── OpenAI
  ├── Anthropic
  ├── Google
  ├── Ollama
  └── OpenAI-compatible endpoints
```

## MIT reference projects

The architecture is inspired by publicly documented patterns from MIT-licensed projects such as OpenHands (agentic software development), Open Agent SDK (runtime, sessions, tools and permission controls), and VoltAgent (TypeScript agent framework and observability). No third-party source code is copied into OmniAI.

Before importing or vendoring any dependency, verify its current license and preserve required notices. Third-party provider APIs and model weights retain their own terms.

## Execution boundary

The web app owns planning, UI state, conversations and provider configuration. Filesystem mutation, terminal execution, Git writes and deployment should be implemented behind explicit adapters with permission checks and an isolated runtime. This allows the same Agent Core to power a browser app, local desktop app and self-hosted server.

## Modes

- `cloud`: use configured hosted providers.
- `private`: use organization-controlled endpoints.
- `local`: use local/self-hosted model endpoints.

The provider abstraction is deliberately model-agnostic so adding another provider does not require rewriting agents.
