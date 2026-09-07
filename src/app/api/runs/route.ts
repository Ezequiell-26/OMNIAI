import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseJsonArray, type FlowStep } from '@/lib/flow-engine'

export const dynamic = 'force-dynamic'

// Lista global de ejecuciones (más recientes primero).
export async function GET() {
  try {
    const runs = await db.flowRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: { flow: { select: { name: true } } },
    })
    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        flowId: r.flowId,
        flowName: r.flow?.name ?? 'Flujo eliminado',
        status: r.status,
        stepsCount: parseJsonArray<FlowStep>(r.steps).length,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        error: r.error,
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
