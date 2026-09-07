import { destroySession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await destroySession();
  } catch (error) {
    console.error('[auth/logout]', error);
  }
  return Response.json({ ok: true });
}
