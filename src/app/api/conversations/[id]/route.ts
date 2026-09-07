import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      agent: { select: { id: true, name: true, emoji: true } },
    },
  })
  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversación no encontrada' },
      { status: 404 },
    )
  }
  return NextResponse.json(conversation)
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  try {
    const body = await req.json()
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title requerido' }, { status: 400 })
    }
    const conversation = await db.conversation.update({
      where: { id },
      data: { title: body.title.trim().slice(0, 80) },
      include: { agent: { select: { name: true, emoji: true } } },
    })
    return NextResponse.json(conversation)
  } catch {
    return NextResponse.json({ error: 'Error al renombrar' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  try {
    await db.conversation.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 400 })
  }
}
