import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import {
  buildToolsInstruction,
  executeSkill,
  parseSkillIds,
  parseToolCall,
  type SkillExecution,
} from '@/lib/skills'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const HISTORY_LIMIT = 20
const MAX_TOOL_ROUNDS = 3

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

    // 4) Historial reciente + prompt del agente (+ skills si tiene)
    const history = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    })
    const skillIds = parseSkillIds(agent.skills)
    const systemContent = agent.systemPrompt + buildToolsInstruction(skillIds)
    const llmMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'assistant', content: systemContent },
      ...history
        .reverse()
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        })),
    ]

    // 5) Llamar al LLM con loop de herramientas (agent-loop estilo
    //    deepseek-harness: el modelo decide, ejecutamos, realimentamos)
    const zai = await ZAI.create()
    const toolUses: SkillExecution[] = []
    let reply = ''
    let nudgeCount = 0
    outer: for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const completion = await zai.chat.completions.create({
        messages: llmMessages,
        ...(typeof agent.temperature === 'number'
          ? { temperature: agent.temperature }
          : {}),
        thinking: { type: 'disabled' },
      })
      reply = completion.choices[0]?.message?.content ?? ''
      if (!reply.trim()) {
        throw new Error('El modelo devolvió una respuesta vacía')
      }

      if (skillIds.length === 0) break
      const call = parseToolCall(reply)
      if (call) {
        if (round === MAX_TOOL_ROUNDS) break
        const execution = await executeSkill(call.name, call.arguments)
        toolUses.push(execution)
        llmMessages.push({ role: 'assistant', content: reply })
        llmMessages.push({
          role: 'user',
          content: `[RESULTADO DE HERRAMIENTA ${execution.skillId}]
${execution.result}

Continúa: responde al usuario usando este resultado.`,
        })
        continue
      }
      // Hay etiqueta <tool> pero malformada: pedir corrección (máx 1 vez)
      if (/<tool>/i.test(reply) && nudgeCount < 1) {
        nudgeCount++
        llmMessages.push({ role: 'assistant', content: reply })
        llmMessages.push({
          role: 'user',
          content:
            '[ERROR] La etiqueta <tool> no tenía JSON válido. Respetá EXACTAMENTE el formato: <tool>{"name":"id","arguments":{"param":"valor"}}</tool> en una sola línea. Reintentá.',
        })
        continue
      }
      break outer
    }

    // Limpiar restos de etiquetas <tool> del contenido final. Si el mensaje
    // era solo un tool-call sin texto, devolver una nota amable.
    let finalContent = reply.replace(/<tool>[\s\S]*?<\/tool>/gi, '').trim()
    if (!finalContent) {
      finalContent =
        toolUses.length > 0
          ? `Ejecuté ${toolUses.length} herramienta(s) (${toolUses
              .map((t) => t.skillName)
              .join(', ')}) pero me quedé sin pasos para redactar la respuesta. ¿La repetimos?`
          : 'No pude generar una respuesta. ¿Probás de nuevo?'
    }

    // 6) Guardar respuesta con su traza de tool-use
    const assistantMessage = await db.message.create({
      data: {
        role: 'assistant',
        content: finalContent.slice(0, 12000),
        toolUses: JSON.stringify(toolUses),
        conversationId: conversation.id,
      },
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
