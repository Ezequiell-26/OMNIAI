import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executeFlow, parseJsonArray, type FlowStep } from '@/lib/flow-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Params = { params: Promise<{ id: string }> }

// Ejecuta el flujo completo y devuelve la traza (run) resultante.
export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const input = String(body.input ?? '').trim()
    if (!input) {
      return NextResponse.json(
        { error: 'Escribí el input para ejecutar el flujo' },
        { status: 400 },
      )
    }

    const flow = await db.flow.findUnique({ where: { id } })
    if (!flow) {
      return NextResponse.json({ error: 'Flujo no encontrado' }, { status: 404 })
    }

    const result = await executeFlow(id, input)

    const run = await db.flowRun.findFirst({
      where: { flowId: id },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({
      run: {
        id: run?.id ?? '',
        flowId: id,
        flowName: flow.name,
        status: result.status,
        input,
        output: result.output,
        steps: result.steps,
        error: result.error,
        startedAt: run?.startedAt ?? new Date(),
        finishedAt: run?.finishedAt ?? new Date(),
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Historial de runs del flujo (para el panel lateral).
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const runs = await db.flowRun.findMany({
      where: { flowId: id },
      orderBy: { startedAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        flowId: r.flowId,
        status: r.status,
        stepsCount: parseJsonArray<FlowStep>(r.steps).length,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
