/**
 * Autenticación de OmniAI Studio (server-only).
 *
 * Diseño minimalista y sin dependencias externas:
 * - Contraseñas con scrypt (node:crypto) + salt aleatorio de 16 bytes.
 * - Sesiones opacas (token de 32 bytes) guardadas en la tabla `Session`
 *   y enviadas al navegador como cookie httpOnly `omniai_session`.
 *
 * ⚠️ La cuenta es OPCIONAL: OmniAI Studio es Local-First y funciona sin
 * registrarse. La cuenta solo añade sincronización del historial entre
 * dispositivos. Las API Keys BYOK jamás se sincronizan ni se suben.
 */

import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const scrypt = promisify(nodeScrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = 'omniai_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

/** Genera el hash `scrypt.<salt-hex>.<hash-hex>` de una contraseña. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt.${salt.toString('hex')}.${derived.toString('hex')}`;
}

/** Verifica una contraseña contra su hash almacenado (comparación constante). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('.');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  try {
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const derived = await scrypt(password, salt, expected.length);
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

/** Crea una sesión en DB y escribe la cookie httpOnly. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

/** Elimina la sesión actual (logout). */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

/** Devuelve el usuario de la sesión actual, o `null` si no hay sesión válida. */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await db.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) return null;
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true },
    });
    return user;
  } catch {
    return null;
  }
}

/** Limpia sesiones caducadas (llamado en login/registro como housekeeping). */
export async function pruneExpiredSessions(): Promise<void> {
  try {
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch {
    // housekeeping best-effort
  }
}
