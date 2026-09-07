// Tipos compartidos del OMNIAI Studio (cliente)

export interface Agent {
  id: string
  name: string
  emoji: string
  description: string
  systemPrompt: string
  model: string
  temperature: number
  isDefault: boolean
  skills: string // JSON array de skill ids
  createdAt: string
  updatedAt: string
}

// Trazas de tool-use (spans estilo openai-agents-python, MIT)
export interface ToolUseTrace {
  skillId: string
  skillName: string
  emoji: string
  args: Record<string, unknown>
  result: string
  ok: boolean
  durationMs: number
}

export function parseAgentSkills(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function parseToolUses(raw: string | null | undefined): ToolUseTrace[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ToolUseTrace[]) : []
  } catch {
    return []
  }
}

export interface ConversationSummary {
  id: string
  title: string
  agentId: string | null
  agent?: { name: string; emoji: string } | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | string
  content: string
  toolUses?: string // JSON array de ToolUseTrace
  conversationId: string
  createdAt: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[]
  agent?: { id: string; name: string; emoji: string } | null
}

// ────────────────────────────────────────────────
// Fase 2: Flujos y Ejecuciones
// ────────────────────────────────────────────────

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

export interface FlowSummary {
  id: string
  name: string
  description: string
  runsCount: number
  createdAt: string
  updatedAt: string
}

export interface FlowDetail extends FlowSummary {
  nodes: FlowNodeDef[]
  edges: FlowEdgeDef[]
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

export interface RunSummary {
  id: string
  flowId: string
  flowName: string
  status: string
  stepsCount: number
  startedAt: string
  finishedAt?: string | null
  error?: string | null
}

export interface RunDetail extends RunSummary {
  input: string
  output: string
  steps: FlowStep[]
}
