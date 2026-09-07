import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, hashPassword, pruneExpiredSessions } from '@/lib/auth';

export const runtime = 'nodejs';

const bodySchema = z.object({
  name: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().email().max(200),
  password: z.string().min(6).max(200),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());

    const existing = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      return Response.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await db.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name || null,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    await pruneExpiredSessions();
    await createSession(user.id);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Datos inválidos. Revisa email y contraseña (mín. 6).' }, { status: 400 });
    }
    console.error('[auth/register]', error);
    return Response.json({ error: 'No se pudo crear la cuenta.' }, { status: 500 });
  }
}
