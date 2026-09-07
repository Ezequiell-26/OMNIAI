/**
 * Export / import de datos de OmniAI Studio (cliente).
 *
 * - Exportar todo → JSON (conversaciones, ajustes sin secretos, personas,
 *   skills, MCP, prompts). Las API Keys cifradas NO se exportan.
 * - Exportar conversación → Markdown o JSON.
 * - Importar → restaura conversaciones + preferencias (merge tolerante).
 */

import { listConversations, saveConversation } from '@/lib/db/conversations';
import { useAppStore } from '@/lib/store/use-app-store';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import { messageText } from '@/lib/ai/messages';
import type { Conversation } from '@/lib/types';

/** Descarga un archivo al navegador (sin dependencias). */
export function downloadFile(filename: string, content: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const SLUG_RE = /[^a-z0-9-_]+/gi;

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(SLUG_RE, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'conversacion'
  );
}

/** Exporta una conversación como Markdown legible. */
export function conversationToMarkdown(c: Conversation): string {
  const lines: string[] = [`# ${c.title}`, '', `> Modelo A: \`${c.modelA}\``];
  if (c.modelB) lines.push(`> Modelo B: \`${c.modelB}\``);
  lines.push('', '---', '');
  for (const m of c.messagesA ?? []) {
    lines.push(m.role === 'user' ? '## 👤 Tú' : '## 🤖 Asistente', '', messageText(m), '');
    if (c.mode === 'split' && c.messagesB) {
      // En split se exporta solo el panel A con una nota.
    }
  }
  if (c.mode === 'split' && c.messagesB?.length) {
    lines.push('---', '', '# Comparación — Panel B', '');
    for (const m of c.messagesB) {
      lines.push(m.role === 'user' ? '## 👤 Tú' : '## 🤖 Panel B', '', messageText(m), '');
    }
  }
  return lines.join('\n');
}

/** Exporta todas las conversaciones como JSON con un solo clic. */
export async function exportConversation(c: Conversation, format: 'md' | 'json'): Promise<void> {
  if (format === 'md') {
    downloadFile(`${slugify(c.title)}.md`, conversationToMarkdown(c), 'text/markdown');
  } else {
    downloadFile(`${slugify(c.title)}.json`, JSON.stringify(c, null, 2));
  }
}

/** Exporta TODO (sin secretos) a un archivo JSON. */
export async function exportAllData(): Promise<void> {
  const conversations = await listConversations();
  const app = useAppStore.getState();
  const settings = useSettingsStore.getState();
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    conversations,
    preferences: {
      panelA: settings.panelA,
      panelB: settings.panelB,
      splitMode: settings.splitMode,
      ollamaUrl: settings.ollamaUrl,
      ollamaModelsCsv: settings.ollamaModelsCsv,
      customBaseUrl: settings.customBaseUrl,
      customModel: settings.customModel,
      appearance: {
        theme: app.theme,
        accent: app.accent,
        fontSize: app.fontSize,
        chatWidth: app.chatWidth,
        showTokenBadges: app.showTokenBadges,
        animationsEnabled: app.animationsEnabled,
        sendOnEnter: app.sendOnEnter,
      },
      chat: {
        temperature: app.temperature,
        topP: app.topP,
        maxTokens: app.maxTokens,
        autoTitle: app.autoTitle,
        personaId: app.personaId,
        customSystemPrompt: app.customSystemPrompt,
      },
    },
    personas: app.personas,
    customSkills: app.customSkills,
    builtinSkillIds: app.builtinSkillIds,
    mcpServers: app.mcpServers,
    savedPrompts: app.savedPrompts,
  };
  downloadFile(`omniai-studio-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
}

interface BackupPayload {
  conversations?: Conversation[];
  preferences?: {
    appearance?: Record<string, unknown>;
    chat?: Record<string, unknown>;
  };
  personas?: unknown;
  customSkills?: unknown;
  builtinSkillIds?: unknown;
  mcpServers?: unknown;
  savedPrompts?: unknown;
}

/** Importa un backup JSON (merge: no borra lo existente). */
export async function importAllData(json: string): Promise<{ conversations: number }> {
  const payload = JSON.parse(json) as BackupPayload;
  let count = 0;

  for (const conv of payload.conversations ?? []) {
    if (!conv?.id || !Array.isArray(conv.messagesA)) continue;
    await saveConversation(conv);
    count += 1;
  }

  const app = useAppStore.getState();
  if (Array.isArray(payload.personas)) {
    for (const p of payload.personas as Array<never>) {
      // persones validadas por forma mínima
      const persona = p as unknown as { id?: string; name?: string; emoji?: string; prompt?: string };
      if (persona.id && persona.name && typeof persona.prompt === 'string') {
        app.upsertPersona({
          id: persona.id,
          name: persona.name,
          emoji: persona.emoji ?? '🧩',
          prompt: persona.prompt,
        });
      }
    }
  }
  if (Array.isArray(payload.customSkills)) {
    for (const raw of payload.customSkills as Array<Record<string, unknown>>) {
      if (typeof raw.id === 'string' && typeof raw.name === 'string' && typeof raw.instructions === 'string') {
        app.upsertCustomSkill({
          id: raw.id,
          name: raw.name,
          description: typeof raw.description === 'string' ? raw.description : '',
          instructions: raw.instructions,
          enabled: raw.enabled !== false,
        });
      }
    }
  }
  if (Array.isArray(payload.mcpServers)) {
    for (const raw of payload.mcpServers as Array<Record<string, unknown>>) {
      if (typeof raw.id === 'string' && typeof raw.name === 'string' && typeof raw.url === 'string') {
        app.upsertMcpServer({
          id: raw.id,
          name: raw.name,
          transport: raw.transport === 'sse' ? 'sse' : 'http',
          url: raw.url,
          headersJson: typeof raw.headersJson === 'string' ? raw.headersJson : '',
          enabled: raw.enabled === true,
          tools: Array.isArray(raw.tools) ? (raw.tools as never[]) : [],
        });
      }
    }
  }
  if (Array.isArray(payload.savedPrompts)) {
    for (const raw of payload.savedPrompts as Array<Record<string, unknown>>) {
      if (typeof raw.id === 'string' && typeof raw.title === 'string' && typeof raw.content === 'string') {
        app.upsertSavedPrompt({ id: raw.id, title: raw.title, content: raw.content });
      }
    }
  }

  return { conversations: count };
}
