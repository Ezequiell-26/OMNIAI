import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SKILLS } from '@/lib/skills'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/** Valida y normaliza el array de skills recibido del cliente. */
function sanitizeSkills(input: unknown): string | null {
  if (!Array.isArray(input)) return null
  const valid = new Set(SKILLS.map((s) => s.id))
  const ids = input.filter((x): x is string => typeof x === 'string' && valid.has(x))
  return JSON.stringify([...new Set(ids)])
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim())
      data.name = body.name.trim().slice(0, 60)
    if (typeof body.emoji === 'string') data.emoji = body.emoji.slice(0, 8)
    if (typeof body.description === 'string')
      data.description = body.description.slice(0, 300)
    if (typeof body.systemPrompt === 'string' && body.systemPrompt.trim())
      data.systemPrompt = body.systemPrompt.slice(0, 4000)
    if (typeof body.temperature === 'number')
      data.temperature = Math.min(Math.max(body.temperature, 0), 2)
    const skills = sanitizeSkills(body.skills)
    if (skills !== null) data.skills = skills
    const agent = await db.agent.update({ where: { id }, data })
    return NextResponse.json(agent)
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar el agente' },
      { status: 400 },
    )
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  try {
    const agent = await db.agent.findUnique({ where: { id } })
    if (agent?.isDefault) {
      return NextResponse.json(
        { error: 'No se puede eliminar el agente principal' },
        { status: 400 },
      )
    }
    await db.agent.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo eliminar el agente' },
      { status: 400 },
    )
  }
}
