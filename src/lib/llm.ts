// Helper compartido para llamar al LLM (z-ai-web-dev-sdk).
// Usado por /api/chat y por el motor de flujos (/api/flows/[id]/run).
// SOLO backend: nunca importar desde componentes cliente.
import ZAI from 'z-ai-web-dev-sdk'

export type LlmMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export interface CompletionResult {
  content: string
  durationMs: number
}

export async function runCompletion(
  messages: LlmMessage[],
  temperature?: number,
): Promise<CompletionResult> {
  const startedAt = Date.now()
  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages,
    ...(typeof temperature === 'number' && Number.isFinite(temperature)
      ? { temperature }
      : {}),
    thinking: { type: 'disabled' },
  })
  const content = completion.choices[0]?.message?.content ?? ''
  if (!content.trim()) {
    throw new Error('El modelo devolvió una respuesta vacía')
  }
  return { content, durationMs: Date.now() - startedAt }
}

// Plantillas tipo {{input}} / {{prev}} del constructor de flujos.
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    key in vars ? vars[key] : `{{${key}}}`,
  )
}
