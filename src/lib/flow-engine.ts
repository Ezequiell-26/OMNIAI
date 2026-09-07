// ─────────────────────────────────────────────────────────────
// OMNIAI Flow Engine — Fase 2
// Ejecuta grafos de agentes sobre la DB (topo-BFS desde el nodo
// Inicio). Inspirado en el agent-loop de deepseek-harness (MIT):
// cada nodo Agente = un ciclo prompt→LLM con su system prompt,
// plantilla {{input}}/{{prev}} y traza paso a paso.
// ─────────────────────────────────────────────────────────────
import { db } from '@/lib/db'
import { runCompletion, renderTemplate } from '@/lib/llm'

export interface FlowNodeDef {
  id: string
  type: 'start' | 'agent' | 'end' | string
  position?: { x: number; y: number }
  data?: { label?: string; agentId?: string; template?: string } & Record<
    string,
    unknown
  >
}

export interface FlowEdgeDef {
  id: string
  source: string
  target: string
}

export interface FlowStep {
  index: number
  nodeId: string
  nodeType: string
  agentName?: string
  agentEmoji?: string
  input: string
  output: string
  durationMs: number
  status: 'success' | 'error' | 'skipped'
}

const MAX_STEPS = 24

export function parseJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

// Orden de ejecución: BFS desde el nodo Inicio siguiendo aristas.
// Los nodos no alcanzables se agregan al final (grafo con islas).
export function orderNodesFromStart(
  nodes: FlowNodeDef[],
  edges: FlowEdgeDef[],
): FlowNodeDef[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const start = nodes.find((n) => n.type === 'start')
  if (!start) return nodes

  const visited = new Set<string>([start.id])
  const ordered: FlowNodeDef[] = [start]
  const queue: string[] = [start.id]

  while (queue.length > 0) {
    const current = queue.shift() as string
    const targets = edges
      .filter((e) => e.source === current && byId.has(e.target) && !visited.has(e.target))
      .map((e) => e.target)
    for (const t of targets) {
      visited.add(t)
      const node = byId.get(t)
      if (node) ordered.push(node)
      queue.push(t)
    }
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) ordered.push(n)
  }
  return ordered
}

export interface EngineResult {
  status: 'success' | 'error'
  output: string
  steps: FlowStep[]
  error?: string
}

export async function executeFlow(
  flowId: string,
  input: string,
): Promise<EngineResult> {
  const flow = await db.flow.findUnique({ where: { id: flowId } })
  if (!flow) throw new Error('Flujo no encontrado')

  const nodes = parseJsonArray<FlowNodeDef>(flow.nodes)
  const edges = parseJsonArray<FlowEdgeDef>(flow.edges)

  if (!nodes.some((n) => n.type === 'start')) {
    throw new Error('El flujo necesita un nodo Inicio')
  }

  const run = await db.flowRun.create({
    data: { flowId: flow.id, status: 'running', input: input.slice(0, 8000) },
  })

  const steps: FlowStep[] = []
  let lastOutput = ''
  let engineError: string | undefined
  const ordered = orderNodesFromStart(nodes, edges)

  try {
    for (const node of ordered) {
      if (steps.length >= MAX_STEPS) break
      const index = steps.length

      if (node.type === 'start') {
        steps.push({
          index,
          nodeId: node.id,
          nodeType: 'start',
          input: '',
          output: input,
          durationMs: 0,
          status: 'success',
        })
        lastOutput = input
        continue
      }

      if (node.type === 'end') {
        steps.push({
          index,
          nodeId: node.id,
          nodeType: 'end',
          input: lastOutput,
          output: lastOutput,
          durationMs: 0,
          status: 'success',
        })
        break // el primer nodo Fin alcanzado cierra la ejecución
      }

      if (node.type === 'agent') {
        const agentId = node.data?.agentId
        const agent = agentId
          ? await db.agent.findUnique({ where: { id: agentId } })
          : (await db.agent.findFirst({ where: { isDefault: true } })) ??
            (await db.agent.findFirst({ orderBy: { createdAt: 'asc' } }))
        if (!agent) throw new Error(`Nodo "${node.id}": no hay agente disponible`)

        const template = node.data?.template?.trim() || '{{input}}'
        const prompt = renderTemplate(template, {
          input,
          prev: lastOutput,
        })

        const { content, durationMs } = await runCompletion(
          [
            { role: 'assistant', content: agent.systemPrompt },
            { role: 'user', content: prompt.slice(0, 8000) },
          ],
          agent.temperature,
        )

        lastOutput = content
        steps.push({
          index,
          nodeId: node.id,
          nodeType: 'agent',
          agentName: agent.name,
          agentEmoji: agent.emoji,
          input: prompt.slice(0, 4000),
          output: content.slice(0, 8000),
          durationMs,
          status: 'success',
        })
      }
    }

    if (steps.length === 0) {
      throw new Error('El flujo no tiene nodos conectados para ejecutar')
    }
  } catch (e) {
    engineError = e instanceof Error ? e.message : 'Error desconocido del motor'
  }

  const status: EngineResult['status'] = engineError ? 'error' : 'success'
  const finishedAt = new Date()

  await db.flowRun.update({
    where: { id: run.id },
    data: {
      status,
      output: lastOutput.slice(0, 8000),
      steps: JSON.stringify(steps),
      error: engineError,
      finishedAt,
    },
  })

  return { status, output: lastOutput, steps, error: engineError }
}
