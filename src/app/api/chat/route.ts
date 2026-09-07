/**
 * POST /api/chat — Enrutador multi-proveedor de OmniAI Studio.
 *
 * Flujo BYOK (Bring Your Own Key):
 * 1. El cliente envía los mensajes + la cabecera `x-omni-config`
 *    (JSON base64 con proveedor, modelo, API Key efímera y URLs).
 * 2. Esta ruta construye el modelo correspondiente con el proveedor oficial
 *    de Vercel AI SDK (@ai-sdk/openai | @ai-sdk/anthropic | @ai-sdk/google,
 *    o un endpoint OpenAI-compatible para Ollama / vLLM / LM Studio…).
 * 3. `streamText` ejecuta la llamada en streaming y se devuelve como UI
 *    Message Stream (`toUIMessageStreamResponse`) para `useChat`.
 *
 * ⚠️ La clave se consume aquí y se descarta: NADA se persiste en el servidor.
 */

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type UIMessage,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { z } from 'zod';
import type { ChatConfig, ProviderId } from '@/lib/types';

export const runtime = 'nodejs';

/** Prompt de sistema por defecto (Markdown + idioma del usuario). */
const SYSTEM_PROMPT = [
  'Eres OmniAI Studio, un asistente de IA experto, directo y útil.',
  'Responde SIEMPRE en Markdown bien estructurado.',
  'Usa bloques de código cercados indicando el lenguaje (```ts, ```python…).',
  'Responde en el mismo idioma en el que te escriba el usuario.',
].join(' ');

/* ── Validación de la configuración recibida por cabecera ──────────────── */

const configSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'ollama', 'custom', 'demo']),
  model: z.string().min(1),
  key: z.string().optional().default(''),
  ollamaUrl: z.string().optional().default(''),
  customBaseUrl: z.string().optional().default(''),
});

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
    const parsed = configSchema.parse(JSON.parse(json));
    return parsed satisfies ChatConfig;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'La cabecera x-omni-config no es válida.');
  }
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

/**
 * Rama demo: llama al LLM de Z.ai (sin clave del usuario) y emite el
 * resultado como UI Message Stream manual (chunks `text-start/delta/end`),
 * que es exactamente el protocolo que `useChat` consume.
 */
async function handleDemoStream(messages: ModelMessage[], signal: AbortSignal): Promise<Response> {
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

    // El backend Z.ai usa el rol `assistant` para el mensaje de sistema.
    const zaiMessages = [
      { role: 'assistant' as const, content: SYSTEM_PROMPT },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: contentToText(m.content) }))
        .filter((m) => m.content.trim().length > 0),
    ];

    const completion = await zai.chat.completions.create({
      messages: zaiMessages,
      thinking: { type: 'disabled' },
    });
    const text = completion.choices[0]?.message?.content ?? '';

    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: 'start' });
        writer.write({ type: 'start-step' });
        writer.write({ type: 'text-start', id: 'demo-text' });
        for (const delta of chunkText(text)) {
          if (signal.aborted) break;
          writer.write({ type: 'text-delta', id: 'demo-text', delta });
          await new Promise((resolve) => setTimeout(resolve, 12));
        }
        writer.write({ type: 'text-end', id: 'demo-text' });
        writer.write({ type: 'finish-step' });
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
  // 1) Mensajes UI del cliente.
  let uiMessages: UIMessage[];
  try {
    const body = (await req.json()) as { messages?: UIMessage[] };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new ApiError(400, 'El cuerpo debe incluir `messages`.');
    }
    uiMessages = body.messages;
  } catch (error) {
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

  // 4) Demo sin clave.
  if (config.provider === 'demo') {
    return handleDemoStream(modelMessages, req.signal);
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

  const result = streamText({
    model,
    messages: modelMessages,
    system: SYSTEM_PROMPT,
    abortSignal: req.signal,
  });

  // `onError` expone el mensaje real del proveedor (p. ej. 401 invalid_api_key)
  // para que la UI pueda mostrarlo en lugar de un genérico.
  return result.toUIMessageStreamResponse({
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}
