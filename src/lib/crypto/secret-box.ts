/**
 * Caja fuerte local (secret-box) para las API Keys de OmniAI Studio.
 *
 * Diseño BYOK / Local-First:
 * 1. Al primer uso se genera una clave AES-GCM-256 **no extraíble**
 *    (`extractable: false`) que se guarda en IndexedDB. Ni el JavaScript
 *    de la página puede exportarla; solo puede usarla para cifrar/descifrar.
 * 2. Cada API Key se cifra con AES-GCM (IV aleatorio de 96 bits) y se
 *    persiste como `v1.<iv>.<ciphertext>` en base64.
 * 3. Nada de esto viaja al servidor: las claves solo se adjuntan —en claro
 *    pero efímeras— a la cabecera `x-omni-config` de cada petición de chat.
 */

import { getLocalDB } from '@/lib/db/local-db';

const META_MASTER_KEY = 'omni-master-key';

let masterKeyPromise: Promise<CryptoKey> | null = null;

/** Obtiene (o crea) la clave maestra AES-GCM no extraíble del navegador. */
async function getMasterKey(): Promise<CryptoKey> {
  if (typeof crypto?.subtle === 'undefined') {
    throw new Error('Web Crypto no está disponible en este navegador.');
  }
  if (!masterKeyPromise) {
    masterKeyPromise = (async () => {
      const db = await getLocalDB();
      const existing = (await db.get('meta', META_MASTER_KEY)) as CryptoKey | undefined;
      if (existing) return existing;
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
      await db.put('meta', key, META_MASTER_KEY);
      return key;
    })();
    masterKeyPromise.catch(() => {
      masterKeyPromise = null; // permite reintentar tras un fallo
    });
  }
  return masterKeyPromise;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Cifra texto en claro → `v1.<iv>.<ciphertext>` (base64). */
export async function encryptSecret(plain: string): Promise<string> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

/** Descifra un payload `v1.<iv>.<ciphertext>`. */
export async function decryptSecret(payload: string): Promise<string> {
  const parts = payload.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new Error('Formato de secreto desconocido.');
  }
  const key = await getMasterKey();
  const iv = fromBase64(parts[1]);
  const ciphertext = fromBase64(parts[2]);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

/** Enmascara una clave para mostrarla en la UI (p. ej. `sk-…abcd`). */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '••••••••';
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}
