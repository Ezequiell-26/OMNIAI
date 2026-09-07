# OmniAI Studio

> Cliente web de IA **BYOK** y **Local-First** con chat multi-modelo, MCP y un espacio de trabajo agente para desarrollo.

OmniAI evoluciona desde un cliente de IA a una plataforma **AI-first para desarrollo**, manteniendo las claves del usuario en el navegador y separando el control plane del execution plane.

## 🌿 Ramas

| Rama | Proyecto |
|---|---|
| [`web`](https://github.com/Ezequiell-26/OMNIAI/tree/web) | Desarrollo web / experimental |
| [`windows-app`](https://github.com/Ezequiell-26/OMNIAI/tree/windows-app) | App de Windows |
| `main` | Rama estable |

## ✨ Capacidades

- Chat streaming BYOK con OpenAI, Anthropic, Google, Ollama y endpoints OpenAI-compatible.
- Split-view multi-modelo, tokens y costes.
- Personas, Skills y MCP.
- Historial Local-First y almacenamiento cifrado de claves en el navegador.
- Agent Workspace con Architect, Coder, Tester, Reviewer y Security.
- Model Router, Tool Registry, permisos y contrato de sandbox.
- Acceso local a un workspace mediante File System Access API cuando el navegador lo soporta.
- Diffs reales para propuestas de creación/edición de archivos con aprobación explícita.

## 🏗️ Arquitectura

```text
Usuario
  ↓
OmniAI Workspace
  ├── Chat
  └── Agent Workspace
        ↓
    Orchestrator
        ├── Architect
        ├── Coder
        ├── Tester
        ├── Reviewer
        └── Security
        ↓
    Tool Registry + Permission Gate
        ↓
    AI Gateway / Model Router
        ├── Cloud providers
        ├── Private endpoints
        └── Local models
        ↓
    Execution adapters / Sandbox
```

El proyecto es MIT. Las APIs, marcas, modelos, SDKs y otros componentes de terceros conservan sus propias licencias y términos.

## 🚀 Desarrollo

```bash
bun install
bun run db:push
bun run dev
```

## 📄 Licencia

[MIT](./LICENSE)
