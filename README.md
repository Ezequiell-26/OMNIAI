# OmniAI Studio

> Cliente de IA **BYOK** y **Local-First** con chat multi-modelo, MCP y un espacio de trabajo agente para desarrollo.

OMNIAI evoluciona desde un cliente de IA a una plataforma **AI-first para desarrollo**, manteniendo las claves del usuario en el navegador y separando el control plane del execution plane.

## 🧠 Memoria persistente para IAs

OMNIAI está preparado para ser desarrollado por múltiples GPTs/IA en sesiones distintas sin perder contexto.

**Entrada obligatoria para cualquier nueva IA:** [`AGENTS.md`](./AGENTS.md)

Orden de lectura recomendado:

1. `AGENTS.md`
2. `docs/ai/PROJECT-CONTEXT.md`
3. `docs/ai/PROJECT-STATE.json`
4. `docs/ai/DECISIONS.md`
5. `docs/ai/HANDOFF.md`
6. `docs/architecture/unified-core.md`
7. `docs/architecture/audit.md`
8. `docs/development/ai-contributor-contract.md`

Git es la memoria duradera del proyecto. La documentación no sustituye al código: una IA debe verificar `main` y las fuentes reales antes de modificar nada.

## 🎯 Una sola base de código

`main` es la **única fuente de verdad de OMNIAI**.

No existe una segunda versión de producto para Windows. Windows, macOS, Linux y Web deben compartir el mismo Core y el mismo código de aplicación siempre que sea posible; solo cambian los adapters de plataforma cuando el sistema operativo lo requiere.

La rama histórica `windows-app` ya no es una base de desarrollo y se conserva únicamente como referencia histórica/backup mientras termina la transición.

Para Windows, consulta [`docs/platforms/windows.md`](./docs/platforms/windows.md).

## 🌿 Ramas

| Rama | Uso |
|---|---|
| `main` | **Única rama canónica del producto** |
| `web` | Histórica/experimental; no usar como fuente de verdad |
| `windows-app` | Histórica; no usar como fuente de desarrollo |

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
    OMNIAI CORE
        ├── State Machine
        ├── Run Manager
        ├── Event Model
        ├── Permission / Approval
        ├── Context Engine
        ├── AI Gateway
        └── Model Router
        ↓
    Agent Runtime
        ├── Architect
        ├── Coder
        ├── Tester
        ├── Reviewer
        └── Security
        ↓
    Tool Registry + Execution Adapters
        ├── Workspace
        ├── Git
        ├── Terminal
        ├── Tests
        ├── MCP
        └── Browser
        ↓
    Surfaces
        ├── Web
        └── Desktop (future/native adapters)
```

El proyecto es MIT. Las APIs, marcas, modelos, SDKs y otros componentes de terceros conservan sus propias licencias y términos.

## 🚀 Desarrollo

```bash
bun install
bun run db:push
bun run dev
```

## 🧪 Verificación

```bash
bun run verify:ai-context
bun run verify:architecture
bun run typecheck
bun run test:core
bun run lint
bun run build
```

## 📄 Licencia

[MIT](./LICENSE)
