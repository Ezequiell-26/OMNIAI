import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJsonArray, type FlowStep } from '@/lib/flow-engine'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// Detalle completo de una ejecución (traza con todos los pasos).
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const run = await db.flowRun.findUnique({
      where: { id },
      include: { flow: { select: { name: true } } },
    })
    if (!run) {
      return NextResponse.json({ error: 'Ejecución no encontrada' }, { status: 404 })
    }
    return NextResponse.json({
      run: {
        id: run.id,
        flowId: run.flowId,
        flowName: run.flow?.name ?? 'Flujo eliminado',
        status: run.status,
        input: run.input,
        output: run.output,
        steps: parseJsonArray<FlowStep>(run.steps),
        error: run.error,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
