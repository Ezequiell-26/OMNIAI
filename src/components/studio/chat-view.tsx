'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type {
  Agent,
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  ToolUseTrace,
} from '@/lib/studio-types'
import { parseToolUses } from '@/lib/studio-types'
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageSquarePlus,
  Send,
  Trash2,
  User,
} from 'lucide-react'

const SUGGESTIONS = [
  '¿Qué día es hoy? Usá tus herramientas',
  'Buscá en la web las últimas noticias de agentes IA y resumilas',
  'Calculá el 18% de IVA sobre 125000 y mostrame la cuenta',
  'Leé https://es.wikipedia.org/wiki/Inteligencia_artificial y haz un resumen',
]

export function ChatView() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState<string>('')
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileListOpen, setMobileListOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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
  }, [messages, sending])

  const send = async (raw?: string) => {
    const content = (raw ?? input).trim()
    if (!content || sending) return
    setInput('')
    setError(null)
    setSending(true)
    // mensaje optimista del usuario
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        role: 'user',
        content,
        conversationId: activeId ?? '',
        createdAt: new Date().toISOString(),
      },
    ])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId, agentId, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error del servidor')
      setMessages((prev) => [
        ...prev.filter((m) => !m.id.startsWith('tmp-')),
        data.userMessage,
        data.assistantMessage,
      ])
      if (!activeId) setActiveId(data.conversationId)
      void loadConversations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setSending(false)
    }
  }

  const deleteConversation = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (activeId === id) newConversation()
    void loadConversations()
  }

  const activeAgent = agents.find((a) => a.id === agentId)

  return (
    <div className="flex h-full">
      {/* Lista de conversaciones (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800/80 lg:flex">
        <div className="p-3">
          <button
            onClick={newConversation}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            <MessageSquarePlus className="size-4" aria-hidden />
            Nueva conversación
          </button>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onOpen={openConversation}
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

            {sending && (
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Bot className="size-4.5 text-emerald-400" aria-hidden />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-zinc-900 px-4 py-3">
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:300ms]" />
                </div>
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
              placeholder="Escribí tu mensaje… (Enter para enviar)"
              aria-label="Mensaje"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Enviar mensaje"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-5" aria-hidden />
              )}
            </button>
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const toolUses: ToolUseTrace[] = isUser ? [] : parseToolUses(message.toolUses)
  const [openTrace, setOpenTrace] = useState<number | null>(null)
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
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
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%]',
          isUser
            ? 'rounded-tr-sm bg-emerald-500 font-medium text-zinc-950'
            : 'rounded-tl-sm bg-zinc-900 text-zinc-200',
        )}
      >
        {/* Trazas de tool-use (spans) */}
        {toolUses.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {toolUses.map((t, i) => (
              <div key={i} className="w-full">
                <button
                  type="button"
                  onClick={() => setOpenTrace(openTrace === i ? null : i)}
                  aria-expanded={openTrace === i}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                    t.ok
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20',
                  )}
                  title={`${t.skillName} · ${t.durationMs}ms`}
                >
                  <span aria-hidden>{t.emoji}</span>
                  <span className="truncate">{t.skillName}</span>
                  <span className="text-[9px] opacity-70">{t.durationMs}ms</span>
                  <ChevronDown
                    className={cn(
                      'size-2.5 transition-transform',
                      openTrace === i && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>
                {openTrace === i && (
                  <pre className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-[10px] whitespace-pre-wrap text-zinc-400">
                    {t.result.slice(0, 800) || '(sin resultado)'}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="space-y-2 break-words [&_a]:text-emerald-400 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-emerald-300 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:m-0 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-950 [&_pre]:p-3 [&_pre]:text-[12px] [&_strong]:text-zinc-50 [&_ul]:list-disc [&_ul]:space-y-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
