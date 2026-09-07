import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const conversations = await db.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { agent: { select: { name: true, emoji: true } } },
    take: 100,
  })
  return NextResponse.json(conversations)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}) as Record<string, unknown>)
    const agentId =
      typeof body.agentId === 'string' && body.agentId ? body.agentId : null
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 80)
        : 'Nueva conversación'
    const conversation = await db.conversation.create({
      data: { agentId, title },
      include: { agent: { select: { name: true, emoji: true } } },
    })
    return NextResponse.json(conversation, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo crear la conversación' },
      { status: 400 },
    )
  }
}
