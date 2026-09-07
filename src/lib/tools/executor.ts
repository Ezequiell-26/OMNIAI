/**
 * Ejecutor de herramientas de OmniAI Studio — server-only.
 *
 * Ejecuta:
 * - Skills integradas (`web_search`, `page_reader`, `image_gen`, `clock`,
 *   `calculator`) usando z-ai-web-dev-sdk (backend del sandbox) o lógica local.
 * - Herramientas MCP reenviándolas al servidor correspondiente vía
 *   `lib/mcp/client` (incluye el servidor Studio integrado `builtin://studio`).
 *
 * Se usa desde dos caminos:
 * 1. Proveedores BYOK → herramientas nativas del AI SDK (`streamText({tools})`).
 * 2. Proveedor demo → protocolo JSON manual (ver app/api/chat/route.ts).
 */

import type { BuiltinSkillId } from '@/lib/skills/registry';
import { callMcpTool, type McpServerConfig } from '@/lib/mcp/client';

export type { McpCallResult } from '@/lib/mcp/client';

/* ── Calculadora segura (sin eval) ──────────────────────────────────────── */

const CALC_TOKEN = /^(\d+(?:\.\d+)?|[+\-*/%().,\s^]|Math\.(?:PI|E|sqrt|abs|round|floor|ceil|min|max|pow|log)|sqrt|abs|round|floor|ceil|min|max|pow|pi|e\b)+$/i;

function safeCalculate(expression: string): string {
  const cleaned = expression.trim().replace(/\^/g, '**');
  if (!cleaned || cleaned.length > 200 || !CALC_TOKEN.test(cleaned)) {
    return 'Error: expresión no permitida (solo aritmética básica y funciones Math.*).';
  }
  try {
    // La expresión ya está validada contra la whitelist anterior.
    const fn = new Function(`"use strict"; return (${cleaned});`) as () => unknown;
    const value = fn();
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 'Error: el resultado no es un número finito.';
    }
    return String(Number(value.toFixed(10)));
  } catch {
    return 'Error: no se pudo evaluar la expresión.';
  }
}

/* ── Skills integradas ──────────────────────────────────────────────────── */

export async function executeBuiltinSkill(
  skillId: BuiltinSkillId,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; content: string; error?: string }> {
  try {
    switch (skillId) {
      case 'web_search': {
        const { default: ZAI } = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        const results = (await zai.functions.invoke('web_search', {
          query: String(args.query ?? ''),
          num: Math.min(10, Math.max(1, Number(args.num) || 6)),
        })) as Array<{
          url: string;
          name: string;
          snippet: string;
          host_name: string;
          date?: string;
        }>;
        if (!Array.isArray(results) || results.length === 0) {
          return { ok: true, content: 'Sin resultados.' };
        }
        const content = results
          .map(
            (r, i) =>
              `${i + 1}. [${r.name}](${r.url})\n   ${r.host_name}${r.date ? ` · ${r.date}` : ''}\n   ${r.snippet}`,
          )
          .join('\n\n');
        return { ok: true, content };
      }

      case 'page_reader': {
        const { default: ZAI } = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        const result = (await zai.functions.invoke('page_reader', {
          url: String(args.url ?? ''),
        })) as { title?: string; url?: string; html?: string; text?: string };
        const html = result.html ?? result.text ?? '';
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 6000);
        return {
          ok: true,
          content: `# ${result.title ?? 'Página'}\nURL: ${result.url ?? args.url}\n\n${text}`,
        };
      }

      case 'image_gen': {
        const { default: ZAI } = await import('z-ai-web-dev-sdk');
        const zai = await ZAI.create();
        const allowed = new Set([
          '1024x1024',
          '768x1344',
          '864x1152',
          '1344x768',
          '1152x864',
          '1440x720',
          '720x1440',
        ]);
        const size = (allowed.has(String(args.size)) ? String(args.size) : '1024x1024') as
          | '1024x1024'
          | '768x1344'
          | '864x1152'
          | '1344x768'
          | '1152x864'
          | '1440x720'
          | '720x1440';
        const response = await zai.images.generations.create({
          prompt: String(args.prompt ?? ''),
          size,
        });
        const base64 = response.data?.[0]?.base64;
        if (!base64) return { ok: false, content: '', error: 'El modelo no devolvió imagen.' };
        // Se persiste en /public/generated y se devuelve URL corta: el modelo
        // puede incrustarla como Markdown sin arrastrar megas de base64.
        const { writeFile, mkdir } = await import('node:fs/promises');
        const path = await import('node:path');
        const dir = path.join(process.cwd(), 'public', 'generated');
        await mkdir(dir, { recursive: true });
        const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
        await writeFile(
          path.join(dir, filename),
          Buffer.from(base64, 'base64'),
        );
        return { ok: true, content: `/generated/${filename}` };
      }

      case 'clock': {
        const timezone =
          typeof args.timezone === 'string' && args.timezone.trim() ? args.timezone.trim() : 'UTC';
        const now = new Date();
        let formatted: string;
        try {
          formatted = new Intl.DateTimeFormat('es-ES', {
            dateStyle: 'full',
            timeStyle: 'long',
            timeZone: timezone,
          }).format(now);
        } catch {
          return { ok: false, content: '', error: `Zona horaria desconocida: ${timezone}` };
        }
        return { ok: true, content: `Fecha/hora (${timezone}): ${formatted} · ISO: ${now.toISOString()}` };
      }

      case 'calculator':
        return { ok: true, content: safeCalculate(String(args.expression ?? '')) };

      default:
        return { ok: false, content: '', error: 'Skill desconocida.' };
    }
  } catch (error) {
    return {
      ok: false,
      content: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/* ── Herramientas MCP ───────────────────────────────────────────────────── */

export interface McpToolRef {
  serverId: string;
  toolName: string;
}

/** Despacha una llamada de herramienta MCP a su servidor. */
export async function executeMcpTool(
  server: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; content: string; error?: string }> {
  return callMcpTool(server, toolName, args);
}
