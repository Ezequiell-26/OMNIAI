# OmniAI Studio

> Cliente web de IA **BYOK** (Bring Your Own Key) y **Local-First**. Tus claves y tu historial nunca salen de tu navegador, salvo que decidas crear una cuenta para sincronizar.

## 🌿 Ramas (dónde trabajar)

| Rama | Proyecto | IA trabaja aquí en |
|---|---|---|
| [`web`](https://github.com/Ezequiell-26/OMNIAI/tree/web) | **OmniAI Studio** — web Next.js | features de la web |
| [`windows-app`](https://github.com/Ezequiell-26/OMNIAI/tree/windows-app) | **App de Windows** | features de la app de escritorio |
| `main` | README + integración | solo merges/documentación |

**Regla para IAs/contribuidores:** los cambios de la web van a `web`, los de la app de escritorio a `windows-app`. `main` recibe merges estables.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Características

- **💬 Chat en streaming** — respuestas en tiempo real vía Vercel AI SDK, con renderizado Markdown completo (GFM), resaltado de sintaxis y copia de bloques de código con un clic.
- **🔑 BYOK real** — soporte para OpenAI, Anthropic (Claude), Google Gemini, Ollama local y endpoints personalizados. Las claves se cifran con **AES-GCM-256** usando una clave maestra no extraíble guardada en IndexedDB: nunca se envían en claro ni se persisten en el servidor.
- **🔀 Split-View multi-modelo** — envía el mismo prompt a 2 proveedores en paralelo y compara respuestas lado a lado.
- **🧮 Tokens y costes** — estimación de tokens por mensaje (tokenizador o200k_base) y coste en USD calculado con el pricing por proveedor/modelo.
- **🧠 Personas** — instrucciones de sistema reutilizables (crea, edita, activa y borra tus propios asistentes).
- **🧩 Skills** — habilidades integradas (búsqueda web, imagen, hora, calculadora) y skills personalizadas por inyección de prompt, con ejecutor de herramientas en el backend.
- **🔌 MCP (Model Context Protocol)** — agrega servidores MCP (Streamable HTTP / SSE), lista sus herramientas y úsalas desde el chat. Incluye servidor integrado de demostración.
- **👤 Cuenta opcional + sincronización** — registro/login con sesión httpOnly y sincronización bidireccional del historial entre dispositivos. Sin cuenta, todo queda 100% local.
- **📊 Estadísticas de uso** — tokens, costes y gráficos de consumo de los últimos 14 días desglosados por modelo.
- **🗂️ Historial local** — conversaciones persistidas en IndexedDB con auto-guardado, búsqueda, biblioteca de prompts y paleta de comandos.
- **🎨 Super personalizable** — tema claro/oscuro, preferencias de chat, y exportación/importación de todos tus datos en JSON.

## 🏗️ Arquitectura

```
Navegador (Local-First)
├── IndexedDB "omniai-studio"     → conversaciones + claves cifradas (AES-GCM)
├── Zustand (persist selectivo)   → preferencias + estado de sesión
└── Cifrado                        → clave maestra no extraíble (WebCrypto)

Servidor (stateless respecto a claves)
├── POST /api/chat    → recibe configuración por cabecera x-omni-config (por request),
│                       resuelve proveedor (OpenAI/Anthropic/Google/Ollama/custom) y streamea
├── POST /api/mcp     → proxy JSON-RPC 2.0 hacia servidores MCP configurados
├── /api/auth/*       → registro, login, logout, sesión (cookie httpOnly)
├── /api/sync         → sincronización bidireccional de historial (opcional)
├── /api/title        → generación automática de títulos
└── /api/tts          → texto a voz
```

**Flujo de claves (BYOK):** la clave se cifra en el navegador → se adjunta (ya descifrada en memoria) a la cabecera `x-omni-config` solo durante el request → la API route la usa y descarta. **El servidor no almacena claves.**

## 🚀 Puesta en marcha

```bash
# 1. Instalar dependencias (Bun recomendado)
bun install

# 2. Configurar la base de datos (Prisma + SQLite, solo para auth/sync opcional)
bun run db:push

# 3. Arrancar en desarrollo
bun run dev
```

Abre la app, entra en **Ajustes → Proveedores** y pega tu API key (OpenAI / Anthropic / Google) o la URL de tu Ollama local. También puedes probar todo sin claves con el proveedor **Demo** incluido.

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript 5 |
| UI | Tailwind CSS v4 · shadcn/ui · Framer Motion · Lucide |
| IA | Vercel AI SDK v7 (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) |
| Datos | IndexedDB (`idb`) · Zustand · Prisma + SQLite (auth/sync) |
| Extras | gpt-tokenizer · react-markdown · prism-react-renderer · recharts · socket.io |

## 📄 Licencia

[MIT](./LICENSE) — úsalo, modifícalo y compártelo libremente.
