import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SKILLS } from '@/lib/skills'

export const dynamic = 'force-dynamic'

const DEFAULT_AGENT = {
  name: 'OMNIA',
  emoji: '🧠',
  description:
    'Asistente principal de OMNIAI. Versátil, directo y resolutivo.',
  systemPrompt:
    'Sos OMNIA, el asistente principal del estudio de agentes OMNIAI. Sos útil, directo y resolutivo. Respondés en el idioma del usuario, con claridad y sin relleno. Cuando te pidan crear cosas (textos, ideas, código, planes), das resultados concretos y bien estructurados.',
  isDefault: true,
  skills: JSON.stringify(SKILLS.map((s) => s.id)),
}

/** Crea el agente por defecto si la tabla está vacía. */
async function ensureDefaultAgent() {
  const count = await db.agent.count()
  if (count === 0) {
    await db.agent.create({ data: DEFAULT_AGENT })
  }
}

export async function GET() {
  await ensureDefaultAgent()
  const agents = await db.agent.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(agents)
}

/** Valida y normaliza el array de skills recibido del cliente. */
function sanitizeSkills(input: unknown): string | null {
  if (!Array.isArray(input)) return null
  const valid = new Set(SKILLS.map((s) => s.id))
  const ids = input
    .filter((x): x is string => typeof x === 'string' && valid.has(x))
  return JSON.stringify([...new Set(ids)])
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const systemPrompt = String(body.systemPrompt ?? '').trim()
    if (!name || !systemPrompt) {
      return NextResponse.json(
        { error: 'name y systemPrompt son obligatorios' },
        { status: 400 },
      )
    }
    const agent = await db.agent.create({
      data: {
        name: name.slice(0, 60),
        emoji: String(body.emoji ?? '🤖').slice(0, 8),
        description: String(body.description ?? '').slice(0, 300),
        systemPrompt: systemPrompt.slice(0, 4000),
        temperature: Math.min(Math.max(Number(body.temperature ?? 0.7), 0), 2),
        ...(sanitizeSkills(body.skills) !== null
          ? { skills: sanitizeSkills(body.skills) as string }
          : {}),
      },
    })
    return NextResponse.json(agent, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}
