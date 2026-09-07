import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, pruneExpiredSessions, verifyPassword } from '@/lib/auth';

export const runtime = 'nodejs';

const bodySchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());

    const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return Response.json({ error: 'Email o contraseña incorrectos.' }, { status: 401 });
    }

    await pruneExpiredSessions();
    await createSession(user.id);
    return Response.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Datos inválidos.' }, { status: 400 });
    }
    console.error('[auth/login]', error);
    return Response.json({ error: 'No se pudo iniciar sesión.' }, { status: 500 });
  }
}
