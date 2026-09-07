/**
 * POST /api/chat — Enrutador multi-proveedor de OmniAI Studio (v2).
 *
 * Novedades de la fase 2:
 * - **Skills**: herramientas ejecutables en servidor (búsqueda web, lector,
 *   imagen, reloj, calculadora) expuestas como tool-calling nativo del
 *   Vercel AI SDK para proveedores BYOK, y como protocolo JSON para el demo.
 * - **MCP**: herramientas de servidores MCP del usuario se despachan vía
 *   `lib/mcp/client` (JSON-RPC 2.0) y se integran como herramientas dinámicas.
 * - **Parámetros**: temperature / topP / maxTokens desde los ajustes.
 * - **Personas**: prompt de sistema personalizado o de la biblioteca.
 *
 * BYOK: la clave viaja en la cabecera `x-omni-config` y se descarta tras la
 * petición. Las conexiones MCP (headers incluidos) viajan en el cuerpo y
 * nunca se persisten.
 */

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  dynamicTool,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
  type UIMessage,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { z } from 'zod';
import type { ChatConfig, ProviderId } from '@/lib/types';
import { BUILTIN_SKILLS, demoToolProtocolSection, renderToolManifest, type BuiltinSkillId } from '@/lib/skills/registry';
import { executeBuiltinSkill, executeMcpTool } from '@/lib/tools/executor';

export const runtime = 'nodejs';

/** Prompt de sistema por defecto (Markdown + idioma del usuario). */
const BASE_SYSTEM_PROMPT = [
  'Eres OmniAI Studio, un asistente de IA experto, directo y útil.',
  'Responde SIEMPRE en Markdown bien estructurado.',
  'Usa bloques de código cercados indicando el lenguaje (```ts, ```python…).',
  'Responde en el mismo idioma en el que te escriba el usuario.',
].join(' ');

/* ── Validación del cuerpo (mensajes + features) ────────────────────────── */

const featureSchema = z
  .object({
    builtinSkills: z.array(z.string()).max(10).optional().default([]),
    customSkills: z
      .array(
        z.object({
          id: z.string().max(64),
          name: z.string().max(120),
          instructions: z.string().max(8000),
        }),
      )
      .max(20)
      .optional()
      .default([]),
    mcpServers: z
      .array(
        z.object({
          id: z.string().max(64),
          name: z.string().max(120),
          transport: z.enum(['http', 'sse']),
          url: z.string().max(2000),
          headersJson: z.string().max(4000).default(''),
        }),
      )
      .max(10)
      .optional()
      .default([]),
    mcpTools: z
      .array(
        z.object({
          serverId: z.string().max(64),
          serverName: z.string().max(120).default('MCP'),
          toolName: z.string().max(200),
          description: z.string().max(2000).default(''),
          inputSchema: z.unknown().optional(),
        }),
      )
      .max(50)
      .optional()
      .default([]),
    params: z
      .object({
        temperature: z.number().min(0).max(2).optional().default(0.7),
        topP: z.number().min(0).max(1).optional().default(1),
        maxTokens: z.number().min(0).max(200_000).optional().default(0),
      })
      .optional()
      .default({ temperature: 0.7, topP: 1, maxTokens: 0 }),
    persona: z
      .object({ name: z.string().max(120), prompt: z.string().max(8000) })
      .nullable()
      .optional()
      .default(null),
    customSystemPrompt: z.string().max(8000).optional().default(''),
  });

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  features: featureSchema.optional(),
});

type Features = z.infer<typeof featureSchema>;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Decodifica y valida la cabecera `x-omni-config`. */
function parseConfig(headerValue: string | null): ChatConfig {
  if (!headerValue) {
    throw new ApiError(400, 'Falta la cabecera x-omni-config (configuración BYOK).');
  }
  try {
    const json = new TextDecoder().decode(Buffer.from(headerValue, 'base64'));
    const parsed = z
      .object({
        provider: z.enum(['openai', 'anthropic', 'google', 'ollama', 'custom', 'demo']),
        model: z.string().min(1),
        key: z.string().optional().default(''),
        ollamaUrl: z.string().optional().default(''),
        customBaseUrl: z.string().optional().default(''),
      })
      .parse(JSON.parse(json));
    return parsed satisfies ChatConfig;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'La cabecera x-omni-config no es válida.');
  }
}

/* ── Prompt de sistema ──────────────────────────────────────────────────── */

function composeSystemPrompt(features: Features, withToolProtocol?: string): string {
  const parts: string[] = [];

  if (features.persona?.prompt) {
    parts.push(features.persona.prompt);
    parts.push(`(Estás actuando como la persona "${features.persona.name}".)`);
  } else if (features.customSystemPrompt.trim()) {
    parts.push(features.customSystemPrompt.trim());
  } else {
    parts.push(BASE_SYSTEM_PROMPT);
  }

  for (const skill of features.customSkills) {
    parts.push(`\n## Skill personalizada: ${skill.name}\n${skill.instructions}`);
  }

  if (withToolProtocol) {
    parts.push(withToolProtocol);
  }

  return parts.join('\n');
}

/* ── Resolución del modelo según proveedor ─────────────────────────────── */

function resolveLanguageModel(config: ChatConfig): LanguageModel {
  const { provider, model, key } = config;
  switch (provider) {
    case 'openai': {
      if (!key) throw new ApiError(401, 'Configura tu API Key de OpenAI en Ajustes.');
      return createOpenAI({ apiKey: key })(model);
    }
    case 'anthropic': {
      if (!key) throw new ApiError(401, 'Configura tu API Key de Anthropic en Ajustes.');
      return createAnthropic({ apiKey: key })(model);
    }
    case 'google': {
      if (!key) throw new ApiError(401, 'Configura tu API Key de Google AI Studio en Ajustes.');
      return createGoogle({ apiKey: key })(model);
    }
    case 'ollama': {
      if (!config.ollamaUrl) throw new ApiError(400, 'Configura la URL de tu servidor Ollama.');
      // Ollama expone una API compatible con OpenAI en `${base}/v1`.
      // Se usa `.chat()` (chat/completions) porque Ollama no implementa
      // la API de Responses que @ai-sdk/openai v4 usa por defecto.
      const baseURL = `${config.ollamaUrl.replace(/\/+$/, '')}/v1`;
      return createOpenAI({ baseURL, apiKey: 'ollama' }).chat(model);
    }
    case 'custom': {
      if (!config.customBaseUrl) throw new ApiError(400, 'Configura la URL de tu endpoint OpenAI-compatible.');
      // `.chat()` por compatibilidad máxima (vLLM, LM Studio, OpenRouter…).
      return createOpenAI({
        baseURL: config.customBaseUrl.replace(/\/+$/, ''),
        apiKey: key || 'not-required',
      }).chat(model);
    }
    default:
      throw new ApiError(400, 'Proveedor no soportado.');
  }
}

/* ── Construcción del set de herramientas (BYOK) ────────────────────────── */

/**
 * Nota: los inputSchema se declaran con `jsonSchema()` (JSON Schema puro
 * reutilizando `BUILTIN_SKILLS.parameters`) en lugar de zod: evita problemas
 * de inferencia entre zod v3/v4 y simplifica el mantenimiento.
 */
type JsonSchemaInput = Parameters<typeof jsonSchema>[0];

function buildToolSet(features: Features): ToolSet {
  const tools: ToolSet = {};

  const addBuiltin = (id: BuiltinSkillId) => {
    const def = BUILTIN_SKILLS.find((s) => s.id === id);
    if (!def || tools[id]) return;
    tools[id] = tool({
      description: def.description,
      inputSchema: jsonSchema<Record<string, unknown>>(
        def.parameters as unknown as JsonSchemaInput,
      ),
      execute: async (input) => {
        const r = await executeBuiltinSkill(id, input ?? {});
        if (id === 'image_gen' && r.ok) {
          return `Imagen generada: ${r.content}. Incrústala en la respuesta con Markdown: ![](URL)`;
        }
        return r.ok ? r.content : `Error: ${r.error}`;
      },
    });
  };

  for (const id of features.builtinSkills) addBuiltin(id as BuiltinSkillId);

  // Herramientas MCP como dynamic tools (schema JSON genérico).
  for (const t of features.mcpTools) {
    if (tools[t.toolName]) continue; // colisión: gana la skill integrada
    const server = features.mcpServers.find((s) => s.id === t.serverId);
    if (!server) continue;
    const schema = (t.inputSchema ?? {
      type: 'object',
      properties: {},
      required: [],
    }) as unknown as JsonSchemaInput;
    tools[t.toolName] = dynamicTool({
      description: `[MCP · ${t.serverName}] ${t.description}`,
      inputSchema: jsonSchema(schema),
      execute: async (input) => {
        const args = (input ?? {}) as Record<string, unknown>;
        const r = await executeMcpTool(server, t.toolName, args);
        return r.ok ? r.content : `Error: ${r.error ?? 'fallo MCP'}`;
      },
    });
  }

  return tools;
}

/* ── Proveedor demo (sin clave, usa el backend Z.ai del sandbox) ───────── */

/** Convierte el contenido de un ModelMessage en texto plano. */
function contentToText(content: ModelMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
}

/** Divide un texto en deltas pequeños para simular streaming fluido. */
function chunkText(text: string): string[] {
  const words = text.match(/\S+\s*/g) ?? [text];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 3) {
    chunks.push(words.slice(i, i + 3).join(''));
  }
  return chunks;
}

interface DemoTool {
  name: string;
  description: string;
  run: (args: Record<string, unknown>) => Promise<{ ok: boolean; content: string; error?: string }>;
}

/** Herramientas disponibles para el demo (skills + MCP). */
async function buildDemoTools(features: Features): Promise<DemoTool[]> {
  const list: DemoTool[] = [];
  for (const id of features.builtinSkills as BuiltinSkillId[]) {
    if (!BUILTIN_SKILLS.some((s) => s.id === id)) continue;
    const def = BUILTIN_SKILLS.find((s) => s.id === id)!;
    list.push({
      name: id,
      description: def.description,
      run: (args) => executeBuiltinSkill(id, args),
    });
  }
  for (const t of features.mcpTools) {
    const server = features.mcpServers.find((s) => s.id === t.serverId);
    if (!server) continue;
    list.push({
      name: t.toolName,
      description: `[MCP · ${t.serverName}] ${t.description}`,
      run: (args) => executeMcpTool(server, t.toolName, args),
    });
  }
  return list;
}

/** Extrae el primer objeto JSON balanceado de un texto. */
function extractJsonObject(text: string): { tool: string; args: Record<string, unknown> } | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1)) as {
            tool?: unknown;
            args?: unknown;
          };
          if (typeof parsed.tool === 'string') {
            return {
              tool: parsed.tool,
              args: (parsed.args ?? {}) as Record<string, unknown>,
            };
          }
          return null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Rama demo: llama al LLM de Z.ai (sin clave del usuario) y emite el
 * resultado como UI Message Stream manual. Si hay herramientas, aplica el
 * protocolo JSON con un bucle de máx. 3 iteraciones y emite partes
 * `dynamic-tool` para que la UI las renderice como tarjetas plegables.
 */
async function handleDemoStream(
  messages: ModelMessage[],
  features: Features,
  signal: AbortSignal,
): Promise<Response> {
  const writeError = (message: string) =>
    createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: async ({ writer }) => {
          writer.write({ type: 'start' });
          writer.write({ type: 'error', errorText: message });
          writer.write({ type: 'finish' });
        },
      }),
    });

  try {
    const { default: ZAI } = await import('z-ai-web-dev-sdk');
    const zai = await ZAI.create();

    const demoTools = await buildDemoTools(features);
    const systemPrompt = composeSystemPrompt(
      features,
      demoTools.length > 0
        ? demoToolProtocolSection(renderToolManifest(demoTools))
        : undefined,
    );

    const baseMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: contentToText(m.content) }))
      .filter((m) => m.content.trim().length > 0);

    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: 'start' });

        /** Historial vivo de la conversación del LLM (incluye resultados tool). */
        const thread: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        for (const m of baseMessages) thread.push({ role: m.role, content: m.content });

        let toolCalls = 0;
        const MAX_TOOL_CALLS = 3;

        while (true) {
          if (signal.aborted) break;

          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant' as const, content: systemPrompt },
              ...thread,
            ],
            thinking: { type: 'disabled' },
            temperature: features.params.temperature,
          });
          const text = completion.choices[0]?.message?.content ?? '';

          const call = demoTools.length > 0 && toolCalls < MAX_TOOL_CALLS ? extractJsonObject(text) : null;

          if (call && demoTools.some((t) => t.name === call.tool)) {
            toolCalls += 1;
            const toolCallId = `demo-${Date.now()}-${toolCalls}`;
            const impl = demoTools.find((t) => t.name === call.tool)!;

            // Resiliencia: si el modelo no rellenó el query de búsqueda,
            // usa el último mensaje del usuario (lo que pidió buscar).
            if (call.tool === 'web_search') {
              const q = typeof call.args.query === 'string' ? call.args.query.trim() : '';
              if (!q) {
                const lastUser = [...thread].reverse().find((m) => m.role === 'user');
                call.args.query = (lastUser?.content ?? '')
                  .replace(/\[RESULTADO DE LA HERRAMIENTA[\s\S]*$/, '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 200);
              }
            }

            // Parte de herramienta en la UI (plegable, dynamic-tool).
            writer.write({
              type: 'tool-input-available',
              toolCallId,
              toolName: call.tool,
              input: call.args,
              dynamic: true,
              title: impl.description,
            });

            const result = await impl.run(call.args);
            writer.write({
              type: 'tool-output-available',
              toolCallId,
              output: result.ok
                ? { content: result.content.slice(0, 4000) }
                : { error: result.error ?? 'fallo' },
              dynamic: true,
            });

            // Registrar en el hilo y volver a llamar al modelo.
            thread.push({
              role: 'assistant',
              content: JSON.stringify({ tool: call.tool, args: call.args }),
            });
            thread.push({
              role: 'user',
              content: `[RESULTADO DE LA HERRAMIENTA ${call.tool}]\n${result.ok ? result.content.slice(0, 4000) : `ERROR: ${result.error}`}\n\nContinúa: responde al usuario en Markdown (sin JSON).`,
            });
            continue;
          }

          // Respuesta final: stream de texto.
          writer.write({ type: 'start-step' });
          writer.write({ type: 'text-start', id: 'demo-text' });
          for (const delta of chunkText(text)) {
            if (signal.aborted) break;
            writer.write({ type: 'text-delta', id: 'demo-text', delta });
            await new Promise((resolve) => setTimeout(resolve, 12));
          }
          writer.write({ type: 'text-end', id: 'demo-text' });
          writer.write({ type: 'finish-step' });
          break;
        }

        writer.write({ type: 'finish' });
      },
      onError: (error) => (error instanceof Error ? error.message : String(error)),
    });
    return createUIMessageStreamResponse({ stream: uiStream });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error del proveedor demo.';
    return writeError(`Demo no disponible: ${message}`);
  }
}

/* ── Handler principal ─────────────────────────────────────────────────── */

export async function POST(req: Request) {
  // 1) Mensajes UI + features del cliente.
  let uiMessages: UIMessage[];
  let features: Features;
  try {
    const body = bodySchema.parse(await req.json());
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new ApiError(400, 'El cuerpo debe incluir `messages`.');
    }
    uiMessages = body.messages as UIMessage[];
    features = body.features ?? featureSchema.parse({});
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Cuerpo inválido.' }, { status: 400 });
    }
    const message = error instanceof ApiError ? error.message : 'JSON inválido.';
    return Response.json({ error: message }, { status: 400 });
  }

  // 2) Configuración BYOK desde cabeceras.
  let config: ChatConfig;
  try {
    config = parseConfig(req.headers.get('x-omni-config'));
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'Configuración inválida.';
    return Response.json({ error: message }, { status });
  }

  // 3) Conversión UI → ModelMessages.
  let modelMessages: ModelMessage[];
  try {
    modelMessages = await convertToModelMessages(uiMessages);
  } catch {
    return Response.json({ error: 'Los mensajes recibidos no son válidos.' }, { status: 400 });
  }

  // 4) Demo sin clave (con soporte de herramientas vía protocolo JSON).
  if (config.provider === 'demo') {
    return handleDemoStream(modelMessages, features, req.signal);
  }

  // 5) Proveedor real con la clave del usuario.
  let model: LanguageModel;
  try {
    model = resolveLanguageModel(config);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'No se pudo resolver el modelo.';
    return Response.json({ error: message }, { status });
  }

  const tools = buildToolSet(features);
  const hasAnyTool = Object.keys(tools).length > 0;

  const result = streamText({
    model,
    messages: modelMessages,
    system: composeSystemPrompt(features),
    tools: hasAnyTool ? tools : undefined,
    // Bucle de herramientas: hasta 5 pasos antes de rendirse.
    stopWhen: hasAnyTool ? stepCountIs(5) : undefined,
    temperature: features.params.temperature,
    topP: features.params.topP,
    maxOutputTokens: features.params.maxTokens > 0 ? features.params.maxTokens : undefined,
    abortSignal: req.signal,
  });

  // `onError` expone el mensaje real del proveedor (p. ej. 401 invalid_api_key)
  // para que la UI pueda mostrarlo en lugar de un genérico.
  return result.toUIMessageStreamResponse({
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}
