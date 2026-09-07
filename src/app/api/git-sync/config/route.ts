import { NextResponse } from 'next/server'
import { setAutoCommit } from '@/lib/git-sync-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { autoCommit?: unknown }
    if (typeof body.autoCommit !== 'boolean') {
      return NextResponse.json(
        { ok: false, error: 'autoCommit debe ser boolean' },
        { status: 400 },
      )
    }
    const autoCommit = setAutoCommit(body.autoCommit)
    return NextResponse.json({ ok: true, autoCommit })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'JSON inválido' },
      { status: 400 },
    )
  }
}
