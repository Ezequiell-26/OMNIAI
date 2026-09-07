/**
 * Sincronización opcional del historial con la cuenta (cliente).
 *
 * Estrategia last-write-wins por `updatedAt`:
 * 1. PUSH: se envían todas las conversaciones locales; el servidor guarda las
 *    que sean más nuevas que su copia.
 * 2. PULL: el servidor devuelve todas sus filas; el cliente guarda las más
 *    nuevas que su copia local.
 *
 * Los borrados no se propagan entre dispositivos (simplicidad v1).
 */

import { listConversations, saveConversation } from '@/lib/db/conversations';
import type { Conversation } from '@/lib/types';

export interface SyncResult {
  pushed: number;
  pulled: number;
}

interface CloudConversation {
  id: string;
  title: string;
  mode: string;
  modelA: string;
  modelB?: string | null;
  messages: string; // JSON: { a: UIMessage[]; b?: UIMessage[] }
  createdAt: string;
  updatedAt: string;
}

const LAST_SYNC_KEY = 'omniai-last-sync';

export function getLastSyncAt(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_SYNC_KEY);
}

/** Serializa una conversación local al formato cloud. */
function toCloud(c: Conversation): CloudConversation {
  return {
    id: c.id,
    title: c.title,
    mode: c.mode,
    modelA: c.modelA,
    modelB: c.modelB ?? null,
    messages: JSON.stringify({ a: c.messagesA ?? [], b: c.messagesB ?? [] }),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Reconstruye una conversación local desde el formato cloud. */
function fromCloud(c: CloudConversation): Conversation | null {
  try {
    const parsed = JSON.parse(c.messages) as { a?: Conversation['messagesA']; b?: Conversation['messagesB'] };
    return {
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      mode: c.mode === 'split' ? 'split' : 'single',
      modelA: c.modelA,
      modelB: c.modelB ?? undefined,
      messagesA: parsed.a ?? [],
      messagesB: parsed.b ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Ejecuta un ciclo completo push+pull contra /api/sync. */
export async function syncNow(): Promise<SyncResult> {
  const local = await listConversations();

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversations: local.map(toCloud),
    }),
  });

  if (res.status === 401) {
    throw new Error('Sesión caducada. Vuelve a iniciar sesión.');
  }
  if (!res.ok) {
    throw new Error('El servidor de sincronización no respondió correctamente.');
  }

  const data = (await res.json()) as { conversations: CloudConversation[] };
  const serverRows = data.conversations ?? [];

  let pulled = 0;
  const localById = new Map(local.map((c) => [c.id, c]));
  for (const cloud of serverRows) {
    const localRow = localById.get(cloud.id);
    if (!localRow || localRow.updatedAt < cloud.updatedAt) {
      const conv = fromCloud(cloud);
      if (conv) {
        await saveConversation(conv);
        pulled += 1;
      }
    }
  }

  window.localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  return { pushed: local.length, pulled };
}
