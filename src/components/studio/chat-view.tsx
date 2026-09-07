'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type {
  Agent,
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
} from '@/lib/studio-types'
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Square,
  Trash2,
  User,
} from 'lucide-react'

const SUGGESTIONS = [
  'Explícame qué sabe hacer este studio',
  'Escríbeme un plan de proyecto para una app IA',
  'Generame un script de Python que renombre archivos',
  'Resúmeme las tendencias de agentes IA 2026',
]

/** Eventos SSE que emite /api/chat. */
type StreamEvent =
  | { event: 'meta'; data: { conversationId: string; conversationTitle: string; userMessageId: string | null } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: { assistantMessage: ChatMessage | null } }
  | { event: 'error'; data: { message: string; partial: boolean } }

/** Parsea el body SSE de un Response en eventos tipados. */
async function* parseSSE(res: Response): AsyncGenerator<StreamEvent> {
  const reader = res.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const lines = part.split('\n')
        const evLine = lines.find((l) => l.startsWith('event: '))
        const dataLine = lines.find((l) => l.startsWith('data: '))
        if (!dataLine) continue
        try {
          const parsed = JSON.parse(dataLine.slice(6)) as StreamEvent['data']
          const evName = (evLine?.slice(7) ?? 'message') as StreamEvent['event']
          yield { event: evName, data: parsed } as StreamEvent
        } catch {
          /* evento malformado: ignorar */
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function ChatView() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState<string>('')
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // Texto del asistente llegando en vivo (streaming)
  const [streamText, setStreamText] = useState('')
  const [gotFirstDelta, setGotFirstDelta] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileListOpen, setMobileListOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations', { cache: 'no-store' })
    if (res.ok) setConversations(await res.json())
  }, [])

  const loadAgents = useCallback(async () => {
    const res = await fetch('/api/agents', { cache: 'no-store' })
    if (res.ok) {
      const list: Agent[] = await res.json()
      setAgents(list)
      setAgentId((prev) => prev || list.find((a) => a.isDefault)?.id || list[0]?.id || '')
    }
  }, [])

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id)
    setMobileListOpen(false)
    setMessages([])
    const res = await fetch(`/api/conversations/${id}`, { cache: 'no-store' })
    if (res.ok) {
      const detail: ConversationDetail = await res.json()
      setMessages(detail.messages)
      if (detail.agent?.id) setAgentId(detail.agent.id)
    }
  }, [])

  const newConversation = () => {
    if (sending) return
    setActiveId(null)
    setMessages([])
    setMobileListOpen(false)
    setError(null)
  }

  useEffect(() => {
    void loadAgents()
    void loadConversations()
  }, [loadAgents, loadConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, streamText])

  // Limpieza al desmontar: abortar request en curso
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const send = async (raw?: string, opts?: { regenerate?: boolean }) => {
    const regenerate = opts?.regenerate === true
    const content = (raw ?? input).trim()
    if ((!content && !regenerate) || sending) return
    if (!regenerate) setInput('')
    setError(null)
    setSending(true)
    setStreamText('')
    setGotFirstDelta(false)

    // Mensaje optimista del usuario (no aplica al regenerar)
    const optimisticId = `tmp-${Date.now()}`
    if (!regenerate) {
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          role: 'user',
          content,
          conversationId: activeId ?? '',
          createdAt: new Date().toISOString(),
        },
      ])
    }

    const controller = new AbortController()
    abortRef.current = controller

    // Al regenerar: quitar localmente la última respuesta del asistente
    // (el backend también la borra de la base de datos).
    if (regenerate) {
      setMessages((prev) => {
        const copy = [...prev]
        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
          copy.pop()
        }
        return copy
      })
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId, agentId, content, regenerate }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Error del servidor')
      }

      let finalMessage: ChatMessage | null = null

      for await (const ev of parseSSE(res)) {
        if (ev.event === 'meta') {
          // Reemplaza el mensaje optimista por el real y fija la conversación
          if (ev.data.userMessageId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === optimisticId ? { ...m, id: ev.data.userMessageId! } : m,
              ),
            )
          }
          if (!activeId && ev.data.conversationId) setActiveId(ev.data.conversationId)
        } else if (ev.event === 'delta') {
          setGotFirstDelta(true)
          setStreamText((prev) => prev + ev.data.text)
        } else if (ev.event === 'done') {
          finalMessage = ev.data.assistantMessage ?? null
        } else if (ev.event === 'error') {
          throw new Error(ev.data.message)
        }
      }

      setStreamText('')
      if (finalMessage) setMessages((prev) => [...prev, finalMessage!])
      void loadConversations()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // El usuario presionó Detener: conservar lo recibido como mensaje
        setStreamText((current) => {
          const partial = current.trim()
          if (partial) {
            setMessages((prev) => [
              ...prev,
              {
                id: `partial-${Date.now()}`,
                role: 'assistant',
                content: partial,
                conversationId: activeId ?? '',
                createdAt: new Date().toISOString(),
              },
            ])
          }
          return ''
        })
      } else {
        setError(e instanceof Error ? e.message : 'Error inesperado')
        setStreamText('')
      }
    } finally {
      abortRef.current = null
      setSending(false)
      setGotFirstDelta(false)
    }
  }

  const stop = () => abortRef.current?.abort()

  const deleteConversation = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (activeId === id) newConversation()
    void loadConversations()
  }

  const activeAgent = agents.find((a) => a.id === agentId)
  const lastMsg = messages[messages.length - 1]
  const canRegenerate =
    !sending && lastMsg?.role === 'assistant' && Boolean(activeId)

  return (
    <div className="flex h-full">
      {/* Lista de conversaciones (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800/80 lg:flex">
        <div className="p-3">
          <button
            onClick={newConversation}
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageSquarePlus className="size-4" aria-hidden />
            Nueva conversación
          </button>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onOpen={(id) => !sending && openConversation(id)}
          onDelete={deleteConversation}
        />
      </aside>

      {/* Columna de chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra de contexto */}
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
          {/* Selector de agente */}
          <div className="relative">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              aria-label="Seleccionar agente"
              className="appearance-none rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 pr-8 pl-3 text-xs font-medium text-zinc-200 outline-none focus:border-emerald-500"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-zinc-500" />
          </div>

          {activeAgent && (
            <span className="hidden max-w-48 truncate text-[11px] text-zinc-500 sm:block">
              {activeAgent.description || 'Sin descripción'}
            </span>
          )}

          {/* Toggle lista móvil */}
          <button
            onClick={() => setMobileListOpen((v) => !v)}
            className="ml-auto rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 lg:hidden"
          >
            {mobileListOpen ? 'Ocultar' : 'Conversaciones'}
          </button>
        </div>

        {/* Lista móvil desplegable */}
        {mobileListOpen && (
          <div className="max-h-56 shrink-0 overflow-y-auto border-b border-zinc-800 bg-zinc-900/60 lg:hidden">
            <button
              onClick={newConversation}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-400"
            >
              <MessageSquarePlus className="size-4" aria-hidden /> Nueva
              conversación
            </button>
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              onOpen={openConversation}
              onDelete={deleteConversation}
            />
          </div>
        )}

        {/* Mensajes */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && !sending && (
              <div className="pt-10 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/20">
                  <Bot className="size-8 text-zinc-950" aria-hidden />
                </div>
                <h2 className="mt-4 text-lg font-bold tracking-tight">
                  ¿En qué te ayudo hoy?
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Escribí algo o probá una sugerencia · agente:{' '}
                  <span className="text-emerald-400">
                    {activeAgent?.emoji} {activeAgent?.name}
                  </span>
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-emerald-500/40 hover:bg-zinc-900 hover:text-zinc-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {/* Burbuja en streaming */}
            {sending && (
              <StreamingBubble
                text={streamText}
                waiting={!gotFirstDelta}
              />
            )}

            {/* Regenerar última respuesta */}
            {canRegenerate && (
              <div className="flex justify-center">
                <button
                  onClick={() => void send(undefined, { regenerate: true })}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                >
                  <RefreshCw className="size-3" aria-hidden />
                  Regenerar respuesta
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="shrink-0 px-4 pb-2 text-center text-xs text-red-400">
            ⚠ {error}
          </p>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-zinc-800/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form
            className="mx-auto flex max-w-3xl items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              disabled={sending}
              placeholder="Escribí tu mensaje… (Enter para enviar)"
              aria-label="Mensaje"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-60"
            />
            {sending ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Detener respuesta"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:border-red-400 hover:text-red-300"
              >
                <Square className="size-4.5 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Enviar mensaje"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="size-5" aria-hidden />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

function ConversationList({
  conversations,
  activeId,
  onOpen,
  onDelete,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
      {conversations.length === 0 && (
        <p className="px-3 py-6 text-center text-xs text-zinc-600">
          Todavía no hay conversaciones
        </p>
      )}
      {conversations.map((c) => (
        <div
          key={c.id}
          className={cn(
            'group flex items-center gap-1 rounded-lg pr-1 transition-colors',
            activeId === c.id
              ? 'bg-emerald-500/10 text-emerald-200'
              : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
          )}
        >
          <button
            onClick={() => onOpen(c.id)}
            className="min-w-0 flex-1 px-3 py-2 text-left text-xs"
          >
            <span className="block truncate font-medium">
              {c.agent?.emoji ?? '💬'} {c.title}
            </span>
            <span className="text-[10px] text-zinc-600">
              {c.agent?.name ?? 'OMNIAI'}
            </span>
          </button>
          <button
            onClick={() => onDelete(c.id)}
            aria-label={`Eliminar conversación ${c.title}`}
            className="rounded p-1.5 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}

/** Extrae el texto plano de los children de <pre> para copiar. */
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props?: { children?: React.ReactNode } }).props?.children)
  }
  return ''
}

/** Bloque de código con botón copiar (aprendido de los clientes IA open source). */
function CodeBlock({ children }: { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = extractText(children).replace(/\n$/, '')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div className="group/code relative my-2">
      <button
        onClick={copy}
        aria-label="Copiar código"
        className="absolute top-2 right-2 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900/90 px-2 py-1 text-[10px] font-medium text-zinc-400 opacity-0 transition group-hover/code:opacity-100 hover:text-emerald-300"
      >
        {copied ? (
          <>
            <Check className="size-3 text-emerald-400" aria-hidden /> ¡Copiado!
          </>
        ) : (
          <>
            <Copy className="size-3" aria-hidden /> Copiar
          </>
        )}
      </button>
      <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-3 text-[12px]">
        {children}
      </pre>
    </div>
  )
}

const MARKDOWN_CLASS =
  'space-y-2 break-words [&_a]:text-emerald-400 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-emerald-300 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:m-0 [&_strong]:text-zinc-50 [&_ul]:list-disc [&_ul]:space-y-1'

function AssistantContent({ content }: { content: string }) {
  return (
    <div className={MARKDOWN_CLASS}>
      <ReactMarkdown
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div className={cn('group flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          isUser ? 'bg-zinc-800' : 'bg-emerald-500/15',
        )}
      >
        {isUser ? (
          <User className="size-4.5 text-zinc-400" aria-hidden />
        ) : (
          <Bot className="size-4.5 text-emerald-400" aria-hidden />
        )}
      </div>
      <div className="flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-sm bg-emerald-500 font-medium text-zinc-950'
              : 'rounded-tl-sm bg-zinc-900 text-zinc-200',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <AssistantContent content={message.content} />
          )}
        </div>
        {!isUser && (
          <button
            onClick={copyMessage}
            aria-label="Copiar respuesta"
            className="flex items-center gap-1 self-start rounded px-1 py-0.5 text-[10px] font-medium text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:text-emerald-300"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-400" aria-hidden /> ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="size-3" aria-hidden /> Copiar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

/** Burbuja del asistente mientras llega el stream (cursor parpadeante). */
function StreamingBubble({ text, waiting }: { text: string; waiting: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
        <Bot className="size-4.5 text-emerald-400" aria-hidden />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-900 px-4 py-3 text-sm leading-relaxed text-zinc-200 sm:max-w-[75%]">
        {waiting ? (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:150ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:300ms]" />
          </span>
        ) : (
          <div className={MARKDOWN_CLASS}>
            <ReactMarkdown>{text}</ReactMarkdown>
            <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-emerald-400 align-middle" />
          </div>
        )}
      </div>
    </div>
  )
}
