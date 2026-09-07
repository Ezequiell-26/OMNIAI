import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { FlowNodeDef, FlowEdgeDef } from '@/lib/flow-engine'

export const dynamic = 'force-dynamic'

// Plantilla inicial: Inicio → Agente (el default) → Fin
function starterGraph(agentId: string | null): {
  nodes: FlowNodeDef[]
  edges: FlowEdgeDef[]
} {
  const nodes: FlowNodeDef[] = [
    {
      id: 'start',
      type: 'start',
      position: { x: 40, y: 120 },
      data: { label: 'Inicio' },
    },
    {
      id: 'agent-1',
      type: 'agent',
      position: { x: 300, y: 90 },
      data: {
        label: 'Agente',
        agentId: agentId ?? undefined,
        template: '{{input}}',
      },
    },
    {
      id: 'end',
      type: 'end',
      position: { x: 580, y: 120 },
      data: { label: 'Fin' },
    },
  ]
  const edges: FlowEdgeDef[] = [
    { id: 'e-start-agent', source: 'start', target: 'agent-1' },
    { id: 'e-agent-end', source: 'agent-1', target: 'end' },
  ]
  return { nodes, edges }
}

export async function GET() {
  try {
    let count = await db.flow.count()
    if (count === 0) {
      // Sembramos un flujo de bienvenida con el agente por defecto.
      const agent =
        (await db.agent.findFirst({ where: { isDefault: true } })) ??
        (await db.agent.findFirst({ orderBy: { createdAt: 'asc' } }))
      const { nodes, edges } = starterGraph(agent?.id ?? null)
      await db.flow.create({
        data: {
          name: 'Mi primer flujo',
          description:
            'Pipeline de bienvenida: el agente recibe tu input y responde. Editá los nodos a gusto.',
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        },
      })
      count = 1
    }

    const flows = await db.flow.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    })
    return NextResponse.json({
      flows: flows.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        runsCount: f._count.runs,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = String(body.name ?? '').trim().slice(0, 80)
    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }
    const description = String(body.description ?? '').trim().slice(0, 300)

    const agent =
      (await db.agent.findFirst({ where: { isDefault: true } })) ??
      (await db.agent.findFirst({ orderBy: { createdAt: 'asc' } }))
    const { nodes, edges } = starterGraph(agent?.id ?? null)

    const flow = await db.flow.create({
      data: {
        name,
        description,
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
      },
    })
    return NextResponse.json({ flow: { id: flow.id, name: flow.name } }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
