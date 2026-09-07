/**
 * Registro cifrado de API Keys en IndexedDB (store `secrets`).
 * Solo se almacena el payload cifrado; la clave maestra AES-GCM es
 * no extraíble y vive únicamente en el navegador del usuario.
 */

import { getLocalDB } from '@/lib/db/local-db';

/** Guarda (o sobrescribe) el payload cifrado de un proveedor. */
export async function putSecretRecord(provider: string, payload: string): Promise<void> {
  const db = await getLocalDB();
  await db.put('secrets', { provider, payload });
}

/** Devuelve todos los payloads cifrados indexados por proveedor. */
export async function getAllSecretRecords(): Promise<Record<string, string>> {
  const db = await getLocalDB();
  const rows = (await db.getAll('secrets')) as Array<{ provider: string; payload: string }>;
  return Object.fromEntries(rows.map((r) => [r.provider, r.payload]));
}

/** Elimina la clave cifrada de un proveedor. */
export async function deleteSecretRecord(provider: string): Promise<void> {
  const db = await getLocalDB();
  await db.delete('secrets', provider);
}
