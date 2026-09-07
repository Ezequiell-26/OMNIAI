/**
 * Constructor del payload de "features" enviado en el cuerpo de cada
 * petición de chat (junto a los mensajes):
 * - skills integradas activadas
 * - skills personalizadas activadas (instrucciones)
 * - herramientas MCP activadas (+ conexión de sus servidores, efímera)
 * - parámetros de muestreo y prompt de sistema (persona)
 *
 * Todo se construye en el momento del envío leyendo el estado actual de los
 * stores, igual que hace `buildConfigHeader` con la cabecera BYOK.
 */

import { BUILTIN_SKILLS, type BuiltinSkillId } from '@/lib/skills/registry';
import { useAppStore, activePersona } from '@/lib/store/use-app-store';
import type { ProviderId } from '@/lib/types';

/** Referencia de herramienta MCP que viaja al servidor (efímera). */
export interface McpToolPayload {
  serverId: string;
  serverName: string;
  toolName: string;
  description: string;
  inputSchema?: unknown;
}

/** Conexión efímera de un servidor MCP (solo si tiene tools activas). */
export interface McpServerPayload {
  id: string;
  name: string;
  transport: 'http' | 'sse';
  url: string;
  headersJson: string;
}

export interface CustomSkillPayload {
  id: string;
  name: string;
  instructions: string;
}

export interface ChatFeaturePayload {
  builtinSkills: BuiltinSkillId[];
  customSkills: CustomSkillPayload[];
  mcpServers: McpServerPayload[];
  mcpTools: McpToolPayload[];
  params: {
    temperature: number;
    topP: number;
    maxTokens: number; // 0 = auto
  };
  persona: { name: string; prompt: string } | null;
  customSystemPrompt: string;
}

/** Lee los stores y compone el payload actual. */
export function buildFeaturePayload(): ChatFeaturePayload {
  const s = useAppStore.getState();
  const persona = activePersona(s);

  const enabledServers = s.mcpServers.filter((srv) => srv.enabled && srv.tools.length > 0);
  const mcpTools: McpToolPayload[] = enabledServers.flatMap((srv) =>
    srv.tools.map((tool) => ({
      serverId: srv.id,
      serverName: srv.name,
      toolName: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  );

  return {
    builtinSkills: s.builtinSkillIds.filter((id) => BUILTIN_SKILLS.some((b) => b.id === id)),
    customSkills: s.customSkills
      .filter((sk) => sk.enabled && sk.instructions.trim())
      .map((sk) => ({ id: sk.id, name: sk.name, instructions: sk.instructions })),
    mcpServers: enabledServers.map((srv) => ({
      id: srv.id,
      name: srv.name,
      transport: srv.transport,
      url: srv.url,
      headersJson: srv.headersJson,
    })),
    mcpTools,
    params: {
      temperature: s.temperature,
      topP: s.topP,
      maxTokens: s.maxTokens,
    },
    persona: persona ? { name: persona.name, prompt: persona.prompt } : null,
    customSystemPrompt: s.personaId === null ? s.customSystemPrompt : '',
  };
}

/** ¿Tiene el payload alguna herramienta ejecutable (skill o MCP)? */
export function hasTools(payload: ChatFeaturePayload): boolean {
  return payload.builtinSkills.length > 0 || payload.mcpTools.length > 0;
}

/** Etiqueta legible para el estado de herramientas en la UI. */
export function toolSummaryLabel(payload: ChatFeaturePayload): string {
  const n = payload.builtinSkills.length + payload.mcpTools.length;
  if (n === 0) return 'sin herramientas';
  return `${n} herramienta${n === 1 ? '' : 's'}`;
}

/** Convierte un ProviderId en etiqueta segura (para métricas). */
export function providerTag(provider: ProviderId): string {
  return provider;
}
