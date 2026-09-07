/**
 * POST /api/mcp — proxy MCP (Model Context Protocol) server-only.
 *
 * El navegador guarda la configuración de servidores MCP (URL + headers) y
 * este proxy negocia JSON-RPC 2.0 en su nombre (evita CORS y expone el
 * servidor Studio integrado `builtin://studio`).
 *
 * Acciones:
 * - { action: 'list',   server }            → tools/list
 * - { action: 'call',   server, toolName, args } → tools/call
 */

import { z } from 'zod';
import { callMcpTool, listMcpTools, type McpServerConfig } from '@/lib/mcp/client';

export const runtime = 'nodejs';

const serverSchema = z.object({
  id: z.string().max(64).optional().default(''),
  name: z.string().max(120).optional().default('MCP'),
  transport: z.enum(['http', 'sse']),
  url: z.string().min(3).max(2000),
  headersJson: z.string().max(4000).optional().default(''),
});

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list'), server: serverSchema }),
  z.object({
    action: z.literal('call'),
    server: serverSchema,
    toolName: z.string().min(1).max(200),
    args: z.record(z.string(), z.unknown()).optional().default({}),
  }),
]);

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const server = body.server as McpServerConfig;

    if (body.action === 'list') {
      try {
        const tools = await listMcpTools(server);
        return Response.json({ ok: true, tools });
      } catch (error) {
        return Response.json({
          ok: false,
          tools: [],
          error: error instanceof Error ? error.message : 'No se pudo contactar el servidor MCP.',
        });
      }
    }

    const result = await callMcpTool(server, body.toolName, body.args);
    return Response.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ ok: false, error: 'Payload MCP inválido.' }, { status: 400 });
    }
    console.error('[mcp]', error);
    return Response.json({ ok: false, error: 'Error del proxy MCP.' }, { status: 500 });
  }
}
