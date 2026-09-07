import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SKILLS, parseSkillIds } from '@/lib/skills'

export const dynamic = 'force-dynamic'

/** Catálogo de plugins (everything-is-a-plugin) + qué agentes los usan. */
export async function GET() {
  const agents = await db.agent.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, emoji: true, skills: true, isDefault: true },
  })

  const skills = SKILLS.map((s) => ({
    id: s.id,
    name: s.name,
    emoji: s.emoji,
    description: s.description,
    inspiredBy: s.inspiredBy,
    params: s.params,
    agents: agents
      .filter((a) => parseSkillIds(a.skills).includes(s.id))
      .map((a) => ({ id: a.id, name: a.name, emoji: a.emoji })),
  }))

  return NextResponse.json({ skills, agentCount: agents.length })
}
