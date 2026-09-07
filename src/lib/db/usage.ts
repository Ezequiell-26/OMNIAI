/**
 * Registro de uso (tokens/coste) en IndexedDB — alimenta el panel "Uso".
 * Se guarda localmente: nada se envía a ningún servidor.
 */

import { getLocalDB } from '@/lib/db/local-db';

export interface UsageRecord {
  id: string;
  /** ISO timestamp. */
  ts: string;
  provider: string;
  model: string;
  tokens: number;
  costUsd: number;
  role: 'input' | 'output';
}

/** Añade un registro de uso (silencioso si IndexedDB falla). */
export async function addUsageRecord(record: UsageRecord): Promise<void> {
  try {
    const db = await getLocalDB();
    await db.put('usage', record);
  } catch {
    /* best-effort */
  }
}

/** Devuelve todos los registros ordenados por fecha ascendente. */
export async function listUsageRecords(): Promise<UsageRecord[]> {
  try {
    const db = await getLocalDB();
    const rows = (await db.getAll('usage')) as UsageRecord[];
    return rows.sort((a, b) => a.ts.localeCompare(b.ts));
  } catch {
    return [];
  }
}

/** Vacía el registro de uso. */
export async function clearUsageRecords(): Promise<void> {
  try {
    const db = await getLocalDB();
    await db.clear('usage');
  } catch {
    /* best-effort */
  }
}
