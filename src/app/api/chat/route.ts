import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const HISTORY_LIMIT = 20

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const content = String(body.content ?? '').trim()
    if (!content) {
      return NextResponse.json(
        { error: 'content es obligatorio' },
        { status: 400 },
      )
    }

    // 1) Resolver agente (el pedido o el por defecto)
    let agent = null
    if (typeof body.agentId === 'string' && body.agentId) {
      agent = await db.agent.findUnique({ where: { id: body.agentId } })
    }
    if (!agent) {
      agent =
        (await db.agent.findFirst({ where: { isDefault: true } })) ??
        (await db.agent.findFirst({ orderBy: { createdAt: 'asc' } }))
    }
    if (!agent) {
      return NextResponse.json(
        { error: 'No hay agentes disponibles' },
        { status: 400 },
      )
    }

    // 2) Resolver conversación
    let conversation =
      typeof body.conversationId === 'string' && body.conversationId
        ? await db.conversation.findUnique({ where: { id: body.conversationId } })
        : null
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          agentId: agent.id,
          title: content.slice(0, 60),
        },
      })
    }

    // 3) Guardar mensaje del usuario
    const userMessage = await db.message.create({
      data: { role: 'user', content: content.slice(0, 8000), conversationId: conversation.id },
    })

    // 4) Historial reciente + prompt del agente
    const history = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    })
    const llmMessages = [
      { role: 'assistant', content: agent.systemPrompt },
      ...history
        .reverse()
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
    ]

    // 5) Llamar al LLM
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: llmMessages,
      thinking: { type: 'disabled' },
    })
    const reply = completion.choices[0]?.message?.content ?? ''
    if (!reply.trim()) {
      throw new Error('El modelo devolvió una respuesta vacía')
    }

    // 6) Guardar respuesta
    const assistantMessage = await db.message.create({
      data: { role: 'assistant', content: reply, conversationId: conversation.id },
    })
    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date(), agentId: agent.id },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      userMessage,
      assistantMessage,
      agent: { id: agent.id, name: agent.name, emoji: agent.emoji },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
