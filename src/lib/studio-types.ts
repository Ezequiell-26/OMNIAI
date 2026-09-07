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
