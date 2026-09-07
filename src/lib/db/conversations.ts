/**
 * Historial de conversaciones en IndexedDB.
 * El servidor nunca ve el historial: es 100 % local (Local-First).
 */

import type { Conversation } from '@/lib/types';
import { getLocalDB } from '@/lib/db/local-db';

/** Devuelve las conversaciones ordenadas de más reciente a más antigua. */
export async function listConversations(): Promise<Conversation[]> {
  try {
    const db = await getLocalDB();
    const all = (await db.getAll('conversations')) as Conversation[];
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

/** Inserta o actualiza una conversación. */
export async function saveConversation(conversation: Conversation): Promise<void> {
  try {
    const db = await getLocalDB();
    await db.put('conversations', conversation);
  } catch (error) {
    console.error('[omniai] No se pudo guardar la conversación:', error);
  }
}

/** Elimina una conversación por id. */
export async function deleteConversation(id: string): Promise<void> {
  try {
    const db = await getLocalDB();
    await db.delete('conversations', id);
  } catch (error) {
    console.error('[omniai] No se pudo eliminar la conversación:', error);
  }
}

/** Vacía todo el historial local. */
export async function clearAllConversations(): Promise<void> {
  try {
    const db = await getLocalDB();
    await db.clear('conversations');
  } catch (error) {
    console.error('[omniai] No se pudo vaciar el historial:', error);
  }
}
