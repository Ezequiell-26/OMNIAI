import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const HISTORY_LIMIT = 20

// ────────────────────────────────────────────────
// OMNIAI — API de chat con STREAMING SSE
// Eventos: meta | delta | done | error
// Soporta `regenerate: true` para re-emitir la última
// respuesta sin duplicar el mensaje del usuario.
// ────────────────────────────────────────────────

/** Formatea un evento Server-Sent Event. */
function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/** Chunk compatible con OpenAI (tolerante a variantes del SDK). */
interface StreamChunk {
  choices?: Array<{
    delta?: { content?: string | null }
    message?: { content?: string | null }
  }>
}

/**
 * El SDK con `stream: true` devuelve un AsyncIterable de Uint8Array con
 * líneas SSE crudas (`data: {...}`). Esto las decodifica y extrae los
 * deltas de contenido en orden.
 */
async function* iterateDeltas(
  raw: AsyncIterable<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of raw) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload) as StreamChunk
        const choice = parsed?.choices?.[0]
        const delta = choice?.delta?.content ?? choice?.message?.content ?? ''
        if (delta) yield delta
      } catch {
        /* línea parcial o malformada: ignorar */
      }
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const regenerate = body.regenerate === true
    let content = String(body.content ?? '').trim()
    if (!content && !regenerate) {
      return NextResponse.json(
        { error: 'content es obligatorio' },
        { status: 400 },
      )
    }

    // 1) Resolver agente (el pedido o el por defecto)
    type AgentRecord = Awaited<ReturnType<typeof db.agent.findFirst>>
    let agent: AgentRecord = null
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

    // Modo regenerar: necesita conversación existente; borra la última
    // respuesta del asistente y reutiliza el último mensaje del usuario.
    let userMessageId: string | null = null
    if (regenerate) {
      if (!conversation) {
        return NextResponse.json(
          { error: 'regenerate requiere una conversación existente' },
          { status: 400 },
        )
      }
      const last = await db.message.findFirst({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
      })
      if (last?.role === 'assistant') {
        await db.message.delete({ where: { id: last.id } })
      }
      const lastUser = await db.message.findFirst({
        where: { conversationId: conversation.id, role: 'user' },
        orderBy: { createdAt: 'desc' },
      })
      if (!lastUser) {
        return NextResponse.json(
          { error: 'No hay mensaje del usuario para regenerar' },
          { status: 400 },
        )
      }
      content = lastUser.content
      userMessageId = lastUser.id
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          agentId: agent.id,
          title: content.slice(0, 60),
        },
      })
    }

    // 3) Guardar mensaje del usuario (salvo regenerar)
    if (!regenerate) {
      const userMessage = await db.message.create({
        data: {
          role: 'user',
          content: content.slice(0, 8000),
          conversationId: conversation.id,
        },
      })
      userMessageId = userMessage.id
    }

    // 4) Historial reciente + prompt del agente
    const history = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    })
    const llmMessages = [
      { role: 'assistant' as const, content: agent.systemPrompt },
      ...history
        .reverse()
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        })),
    ]

    // 5) Stream SSE hacia el cliente
    const encoder = new TextEncoder()
    const conversationId = conversation.id
    const conversationTitle = conversation.title
    const agentInfo = { id: agent.id, name: agent.name, emoji: agent.emoji }

    const persistAssistant = async (text: string) => {
      const clean = text.trim()
      if (!clean) return null
      const assistantMessage = await db.message.create({
        data: {
          role: 'assistant',
          content: clean.slice(0, 24000),
          conversationId,
        },
      })
      await db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date(), agentId: agentInfo.id },
      })
      return assistantMessage
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = ''
        let closed = false
        const safeEnqueue = (chunk: string) => {
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(chunk))
            } catch {
              closed = true
            }
          }
        }

        try {
          safeEnqueue(
            sse('meta', {
              conversationId,
              conversationTitle,
              userMessageId,
              agent: agentInfo,
            }),
          )

          const zai = await ZAI.create()
          const completion = await zai.chat.completions.create({
            messages: llmMessages,
            thinking: { type: 'disabled' },
            stream: true,
          })

          for await (const delta of iterateDeltas(
            completion as AsyncIterable<Uint8Array>,
          )) {
            full += delta
            safeEnqueue(sse('delta', { text: delta }))
          }

          if (!full.trim()) {
            throw new Error('El modelo devolvió una respuesta vacía')
          }

          const assistantMessage = await persistAssistant(full)
          safeEnqueue(sse('done', { assistantMessage }))
        } catch (e) {
          // Si el cliente abortó a mitad de respuesta, guardamos el parcial.
          try {
            await persistAssistant(full)
          } catch {
            /* noop */
          }
          const message =
            e instanceof Error ? e.message : 'Error generando la respuesta'
          safeEnqueue(sse('error', { message, partial: full.length > 0 }))
        } finally {
          if (!closed) {
            try {
              controller.close()
            } catch {
              /* noop */
            }
          }
        }
      },
      // Cancelación del cliente (botón Detener): persistir lo recibido.
      async cancel() {
        // `full` vive en el closure de start(); Prisma persiste si hay texto.
        // Nota: en abort, start() detecta el fallo de enqueue y persiste igual.
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
