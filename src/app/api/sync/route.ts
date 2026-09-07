/**
 * POST /api/sync — sincronización opcional del historial (requiere cuenta).
 *
 * Push+pull en una sola llamada con estrategia last-write-wins por
 * `updatedAt`: guarda en servidor las conversaciones del cliente que sean
 * más nuevas, y devuelve todas las filas del usuario para que el cliente
 * haga el merge inverso (ver lib/sync.ts).
 */

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

const serverSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().max(300).default('Conversación'),
  mode: z.enum(['single', 'split']).default('single'),
  modelA: z.string().max(200).default(''),
  modelB: z.string().max(200).nullable().optional(),
  messages: z.string().max(2_000_000), // JSON serializado (~2 MB máx.)
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

const bodySchema = z.object({
  conversations: z.array(serverSchema).max(500),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await req.json());

    // PUSH: upsert de filas del cliente más nuevas que la copia del servidor.
    for (const conv of body.conversations) {
      const existing = await db.cloudConversation.findUnique({
        where: { userId_id: { userId: user.id, id: conv.id } },
        select: { updatedAt: true },
      });
      if (existing && existing.updatedAt.toISOString() >= conv.updatedAt) continue;
      const data = {
        title: conv.title,
        mode: conv.mode,
        modelA: conv.modelA,
        modelB: conv.modelB ?? null,
        messages: conv.messages,
        updatedAt: new Date(conv.updatedAt),
      };
      await db.cloudConversation.upsert({
        where: { userId_id: { userId: user.id, id: conv.id } },
        create: { id: conv.id, userId: user.id, createdAt: new Date(conv.createdAt), ...data },
        update: data,
      });
    }

    // PULL: devolver todas las filas del usuario.
    const rows = await db.cloudConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    return Response.json({
      serverTime: new Date().toISOString(),
      conversations: rows.map((row) => ({
        id: row.id,
        title: row.title,
        mode: row.mode,
        modelA: row.modelA,
        modelB: row.modelB,
        messages: row.messages,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Payload de sincronización inválido.' }, { status: 400 });
    }
    console.error('[sync]', error);
    return Response.json({ error: 'Error de sincronización.' }, { status: 500 });
  }
}
