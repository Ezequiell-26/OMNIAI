import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const flow = await db.flow.findUnique({
      where: { id },
      include: { _count: { select: { runs: true } } },
    })
    if (!flow) {
      return NextResponse.json({ error: 'Flujo no encontrado' }, { status: 404 })
    }
    return NextResponse.json({
      flow: {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        nodes: JSON.parse(flow.nodes || '[]'),
        edges: JSON.parse(flow.edges || '[]'),
        runsCount: flow._count.runs,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim().slice(0, 80)
    }
    if (typeof body.description === 'string') {
      data.description = body.description.trim().slice(0, 300)
    }
    if (Array.isArray(body.nodes)) {
      if (body.nodes.length > 50) {
        return NextResponse.json(
          { error: 'Máximo 50 nodos por flujo' },
          { status: 400 },
        )
      }
      data.nodes = JSON.stringify(body.nodes)
    }
    if (Array.isArray(body.edges)) {
      if (body.edges.length > 100) {
        return NextResponse.json(
          { error: 'Máximo 100 conexiones por flujo' },
          { status: 400 },
        )
      }
      data.edges = JSON.stringify(body.edges)
    }

    const flow = await db.flow.update({ where: { id }, data })
    return NextResponse.json({ flow: { id: flow.id, updatedAt: flow.updatedAt } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    await db.flow.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
