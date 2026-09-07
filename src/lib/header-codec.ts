/**
 * Códec de la cabecera `x-omni-config`.
 *
 * La configuración BYOK (proveedor, modelo, clave efímera, URLs) viaja en
 * cada petición como JSON → base64 dentro de una cabecera HTTP, tal y como
 * exige el patrón "Bring Your Own Key" con Vercel AI SDK.
 *
 * El encoding es unicode-safe (TextEncoder antes de btoa).
 * El decode del lado servidor vive en `app/api/chat/route.ts` (Buffer).
 */

import type { ChatConfig } from '@/lib/types';

/** Serializa la configuración de chat para la cabecera (solo cliente). */
export function encodeConfigHeader(config: ChatConfig): string {
  const json = JSON.stringify(config);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
