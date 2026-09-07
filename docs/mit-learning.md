# OmniAI open-source learning notes

This document records architectural patterns intentionally reimplemented in OmniAI rather than copied from other repositories.

## OpenHands — MIT
OpenHands separates the user-facing Agent Canvas from an Agent Server/SDK boundary and uses workspace-oriented agents, tools, events and an API between the UI and execution layer. OmniAI adopts the same architectural principle: the browser controls runs while execution stays behind adapters. The OpenHands repository is MIT licensed, but specific enterprise material can have different terms, so OmniAI must only use MIT-licensed material when reusing code. See the project documentation and repository license before vendoring anything.

## Agent Zero — MIT
Agent Zero demonstrates a powerful environment with explicit warnings around Docker isolation, credentials, remote code execution and project workspaces. OmniAI therefore treats terminal, browser, network and filesystem operations as privileged capabilities and keeps sandboxing behind an adapter rather than executing arbitrary commands in the web process.

## VoltAgent — MIT
VoltAgent provides a TypeScript-native agent framework with structured agents and observability. OmniAI borrows the concept of provider-agnostic agent definitions, event streams and a separate orchestration layer while keeping its own implementation.

## Aider — Apache-2.0
Aider is not MIT, so it is not a source to copy into an MIT-only codebase. Its documented product ideas are still useful for product research: repository mapping, Git-aware edits, multi-model support and terminal workflows. OmniAI should independently implement those concepts without copying source code.

## Continue / Roo Code — Apache-2.0
Continue and Roo Code also use Apache-2.0 rather than MIT. They remain useful product references for editor workflows, modes and developer experience, but their source should not be vendored into an MIT-only portion of OmniAI without a deliberate license strategy.

## bolt.diy — MIT source, dependency caveat
bolt.diy's source is MIT, but its README explicitly notes that WebContainers API usage may require a commercial license for production use. OmniAI should therefore keep browser execution optional and use a replaceable runtime adapter (Docker, local process, or another licensed runtime) instead of assuming every execution dependency is MIT.

## OmniAI rule

1. Learn architecture and UX patterns from public projects.
2. Prefer MIT-compatible code when the intention is to reuse code.
3. Preserve copyright and license notices whenever required.
4. Track third-party licenses in a credits/SBOM document.
5. Never describe a third-party model or API as MIT merely because OmniAI itself is MIT.
