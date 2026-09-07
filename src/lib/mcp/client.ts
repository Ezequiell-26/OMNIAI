/**
 * Cliente MCP (Model Context Protocol) — server-only.
 *
 * Implementa el mínimo viable del protocolo JSON-RPC 2.0 para:
 * 1. **Streamable HTTP** (`POST` al endpoint con `Accept: application/json, text/event-stream`).
 * 2. **SSE legacy** (`GET` al endpoint SSE → evento `endpoint` con la URL de POST).
 * 3. **Servidor Studio integrado** (`builtin://studio`) que vive dentro de
 *    esta misma ruta: herramientas de utilidad reales sin depender de red.
 *
 * Método expuesto: `tools/list` y `tools/call`.
 */

import { randomUUID } from 'node:crypto';

/* ── Tipos JSON-RPC ─────────────────────────────────────────────────────── */

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema?: unknown;
}

export interface McpServerConfig {
  id: string;
  name: string;
  transport: 'http' | 'sse';
  url: string;
  headersJson: string;
}

export interface McpCallResult {
  ok: boolean;
  content: string;
  error?: string;
}

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

/* ── Servidor "Studio" integrado ────────────────────────────────────────── */

export const BUILTIN_MCP_URL = 'builtin://studio';

interface BuiltinTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

const BUILTIN_TOOLS: BuiltinTool[] = [
  {
    name: 'studio_uuid',
    description: 'Genera un identificador UUID v4 aleatorio.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    execute: async () => randomUUID(),
  },
  {
    name: 'studio_dice',
    description: 'Lanza un dado y devuelve el número obtenido (1-N, por defecto 6).',
    inputSchema: {
      type: 'object',
      properties: { sides: { type: 'number', description: 'Número de caras (1-N)' } },
      required: [],
    },
    execute: async (args) => {
      const sides = Math.max(2, Math.min(1000, Number(args.sides) || 6));
      const value = 1 + Math.floor(Math.random() * sides);
      return `🎲 ${value} (d${sides})`;
    },
  },
  {
    name: 'studio_lorem',
    description: 'Genera un texto "lorem ipsum" de N palabras (10–200).',
    inputSchema: {
      type: 'object',
      properties: { words: { type: 'number', description: 'Cantidad de palabras' } },
      required: [],
    },
    execute: async (args) => {
      const words = Math.max(10, Math.min(200, Number(args.words) || 40));
      const pool =
        'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(
          ' ',
        );
      const out: string[] = [];
      for (let i = 0; i < words; i += 1) {
        out.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      const sentence = out.join(' ');
      return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
    },
  },
  {
    name: 'studio_base64',
    description: 'Codifica o decodifica texto en Base64.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Texto a convertir' },
        decode: { type: 'boolean', description: 'true = decodificar, false/omisión = codificar' },
      },
      required: ['text'],
    },
    execute: async (args) => {
      const text = String(args.text ?? '');
      if (args.decode) {
        return Buffer.from(text, 'base64').toString('utf8');
      }
      return Buffer.from(text, 'utf8').toString('base64');
    },
  },
];

function isBuiltin(server: Pick<McpServerConfig, 'url'>): boolean {
  return server.url.trim() === BUILTIN_MCP_URL || server.url.trim() === 'builtin://studio';
}

/* ── Transporte JSON-RPC ────────────────────────────────────────────────── */

async function rpcCall(
  server: McpServerConfig,
  method: string,
  params?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (server.headersJson.trim()) {
    try {
      const parsed = JSON.parse(server.headersJson) as Record<string, unknown>;
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') headers[k] = v;
      }
    } catch {
      throw new Error('Los headers extra no son JSON válido.');
    }
  }

  const body = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: params ?? {} });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    let url = server.url.replace(/\/+$/, '');
    let payload = body;

    // SSE legacy: descubrir la URL de POST desde el evento `endpoint`.
    if (server.transport === 'sse') {
      const endpoint = await discoverSseEndpoint(url, headers);
      url = new URL(endpoint, url).toString();
    }

    const res = await fetch(url, { method: 'POST', headers, body: payload, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    // El servidor puede responder como SSE (data: {...}) o JSON plano.
    const json = parseMaybeSse(text);
    if (json && typeof json === 'object') {
      const rpc = json as JsonRpcResponse;
      if (rpc.error) throw new Error(rpc.error.message || 'Error MCP remoto.');
      return rpc.result;
    }
    throw new Error('Respuesta MCP no reconocida.');
  } finally {
    clearTimeout(timeout);
  }
}

/** Extrae el primer objeto JSON de un cuerpo (SSE o plano). */
function parseMaybeSse(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* sigue como SSE */
    }
  }
  const lines = trimmed.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim();
      if (data && data !== '[DONE]') {
        try {
          return JSON.parse(data);
        } catch {
          /* ignore */
        }
      }
    }
  }
  return null;
}

/** SSE legacy: lee el stream hasta encontrar el evento `endpoint`. */
async function discoverSseEndpoint(url: string, headers: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      headers: { ...headers, Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`No se pudo abrir SSE (HTTP ${res.status}).`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventName = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        if (line.startsWith('data:') && eventName === 'endpoint') {
          controller.abort(); // ya tenemos lo que buscábamos
          return line.slice(5).trim();
        }
      }
    }
    throw new Error('El servidor SSE no envió el evento `endpoint`.');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // abort intencional tras encontrar el endpoint se propaga arriba;
      // si abortó sin endpoint, es un timeout real.
      throw new Error('Timeout esperando el endpoint SSE.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/* ── API pública del cliente MCP ────────────────────────────────────────── */

/** Lista las herramientas de un servidor MCP. */
export async function listMcpTools(server: McpServerConfig): Promise<McpToolInfo[]> {
  if (isBuiltin(server)) {
    return BUILTIN_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }
  const result = (await rpcCall(server, 'tools/list')) as { tools?: McpToolInfo[] } | undefined;
  return Array.isArray(result?.tools) ? result.tools : [];
}

/** Ejecuta una herramienta de un servidor MCP. */
export async function callMcpTool(
  server: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpCallResult> {
  try {
    if (isBuiltin(server)) {
      const tool = BUILTIN_TOOLS.find((t) => t.name === toolName);
      if (!tool) return { ok: false, content: '', error: `Herramienta desconocida: ${toolName}` };
      const content = await tool.execute(args);
      return { ok: true, content };
    }
    const result = (await rpcCall(server, 'tools/call', {
      name: toolName,
      arguments: args,
    })) as
      | { content?: Array<{ type: string; text?: string }> }
      | undefined;
    const text =
      (result?.content ?? [])
        .map((c) => (c.type === 'text' ? c.text : ''))
        .filter(Boolean)
        .join('\n') || JSON.stringify(result ?? {});
    return { ok: true, content: text };
  } catch (error) {
    return {
      ok: false,
      content: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
