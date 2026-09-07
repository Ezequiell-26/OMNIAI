# Repos que potencian OMNIAI

OMNIAI se construye leyendo los mejores repos de licencia permisiva (MIT / Apache-2.0)
**vía GitHub API — sin clonarlos** — y extrayendo sus patrones más sólidos para
integrarlos a este proyecto. Este documento registra qué se leyó, su licencia y qué aportó.

> Última actualización: Fase 3 adelantada (Skills & Tools).

## Leídos en esta sesión

| Repo | Licencia | Stars | Qué aportó a OMNIAI |
|---|---|---|---|
| [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | **MIT** | ~215k | Filosofía **everything-is-a-plugin**: registro de skills independiente del core, cada herramienta es un plugin conectable a cualquier agente. Base del agent-loop con tool-calls. |
| [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) | **MIT** | ~58k | Crews secuenciales (salida de una tarea → contexto de la siguiente), roles/goals por agente, tasks con `expectedOutput`. |
| [openai/openai-agents-python](https://github.com/openai/openai-agents-python) | **MIT** | ~29k | **Tracing de spans** anidados (agent → llm → tool) con duración; modelo de trazas usado en mensajes y ejecuciones. |
| [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | MIT→Apache-2.0 | ~90k | Catálogo de tools de referencia: `fetch` (page_reader), `time` (clock), `everything` (calculator). Spec de parámetros por tool. |
| [langchain-ai/langchain](https://github.com/langchain-ai/langchain) | **MIT** | ~146k | Interfaz estándar de tools (name + description + schema) uniforme para todos los agentes. |
| [microsoft/autogen](https://github.com/microsoft/autogen) | MIT (código, `LICENSE-CODE`) | ~61k | Multi-agente por eventos y streaming de runs (agentes-as-tools, próximo paso). |
| [mastra-ai/mastra](https://github.com/mastra-ai/mastra) | **Apache-2.0** (salvo `ee/`, que no se usa) | ~28k | Mapa de módulos: workflows + observability + memory; referencia para suspend/resume HITL futuro. |
| [google/adk-python](https://github.com/google/adk-python) | **Apache-2.0** | ~21k | Agent Config serializable (import/export de agentes), Tool Confirmation (HITL por herramienta). |

## Verificados en sesiones anteriores (~50 repos)

Entre otros: `vercel/ai` (Apache-2.0), `vitest-dev/vitest`, `colinhacks/zod`,
`honojs/hono`, `pmndrs/zustand`, `TanStack/query`, `steven-tey/dub`,
`calcom/cal.com`, `danny-avila/LibreChat` (MIT), `open-webui/open-webui`,
`ollama/ollama` (MIT), `ggerganov/llama.cpp` (MIT), `LlamaIndex` (MIT), `mem0ai/mem0` (Apache-2.0),
`browser-use/browser-use` (MIT), `All-Hands-AI/OpenHands` (MIT).
(lista viva; se amplía en cada sesión).

**Evitados por licencia restrictiva** (AGPL / SSPL / Apache modificada):
n8n, Firecrawl, Skyvern, Flowise, AutoGPT (AGPL-3.0), lobe-chat (Apache modificada).

## Regla de oro

1. Verificar licencia vía GitHub API **antes** de leer/copiar.
2. Nunca clonar: se lee README + estructura + docs vía API.
3. Todo el código de OMNIAI es propio (MIT); de los repos solo se toman
   **patrones e ideas** (y en su caso fragmentos MIT con atribución en este archivo).
