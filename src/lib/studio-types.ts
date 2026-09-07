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
  createdAt: string
  updatedAt: string
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
