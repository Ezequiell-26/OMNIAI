'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Bot,
  BrainCircuit,
  GitBranch,
  Layers,
  LibraryBig,
  MessageSquare,
  Menu,
  Puzzle,
  Activity,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { ChatView } from '@/components/studio/chat-view'
import { AgentsView } from '@/components/studio/agents-view'
import { SettingsView } from '@/components/studio/settings-view'
import { PlaceholderView } from '@/components/studio/placeholder-view'

export type ViewId =
  | 'chat'
  | 'agents'
  | 'flows'
  | 'skills'
  | 'knowledge'
  | 'runs'
  | 'settings'

const NAV: {
  id: ViewId
  label: string
  icon: typeof MessageSquare
  soon?: string
}[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'agents', label: 'Agentes', icon: Bot },
  { id: 'flows', label: 'Flujos', icon: GitBranch, soon: 'F2' },
  { id: 'skills', label: 'Skills & Tools', icon: Puzzle, soon: 'F3' },
  { id: 'knowledge', label: 'Conocimiento', icon: LibraryBig, soon: 'F3' },
  { id: 'runs', label: 'Ejecuciones', icon: Activity, soon: 'F2' },
  { id: 'settings', label: 'Ajustes', icon: Settings },
]

const TITLES: Record<ViewId, string> = {
  chat: 'Chat',
  agents: 'Agentes',
  flows: 'Constructor de Flujos',
  skills: 'Skills & Tools',
  knowledge: 'Base de Conocimiento',
  runs: 'Ejecuciones',
  settings: 'Ajustes',
}

export function StudioShell() {
  const [view, setView] = useState<ViewId>('chat')
  const [mobileOpen, setMobileOpen] = useState(false)

  const go = (v: ViewId) => {
    setView(v)
    setMobileOpen(false)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-900/40 md:flex">
        <Brand />
        <NavList view={view} go={go} />
        <SidebarFooter />
      </aside>

      {/* Sidebar móvil (overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="animate-in slide-in-from-left absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800 bg-zinc-900 duration-200">
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavList view={view} go={go} />
            <SidebarFooter />
          </aside>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800/80 bg-zinc-900/40 px-4 backdrop-blur">
          <button
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="text-sm font-semibold tracking-tight">
            {TITLES[view]}
          </h1>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            OMNIAI v0.1 · Fase 1
          </span>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          {view === 'chat' && <ChatView />}
          {view === 'agents' && <AgentsView />}
          {view === 'settings' && <SettingsView />}
          {view === 'flows' && (
            <PlaceholderView
              icon={GitBranch}
              phase="Fase 2"
              title="Constructor de Flujos"
              description="Diseñá pipelines de agentes arrastrando nodos: entradas, decisiones, bucles y salidas. Inspirado en React Flow (MIT) y LangGraph (MIT)."
              features={[
                'Editor visual drag & drop de multi-agentes',
                'Ejecución paso a paso con checkpoints',
                'Conexión entre salidas y entradas de agentes',
              ]}
            />
          )}
          {view === 'skills' && (
            <PlaceholderView
              icon={Puzzle}
              phase="Fase 3"
              title="Skills & Tools (MCP)"
              description="Un marketplace de herramientas para tus agentes: navegación web, ejecución de código, APIs externas y servidores MCP. Inspirado en el ecosistema MCP (MIT) y browser-use (MIT)."
              features={[
                'Cientos de herramientas vía protocolo MCP',
                'Agentes que navegan y actúan en la web',
                'Sandbox de ejecución de código',
              ]}
            />
          )}
          {view === 'knowledge' && (
            <PlaceholderView
              icon={LibraryBig}
              phase="Fase 3"
              title="Base de Conocimiento (RAG)"
              description="Subí tus documentos y los agentes responden con ese contenido. Inspirado en LlamaIndex (MIT), MarkItDown (MIT) y mem0 (Apache-2.0)."
              features={[
                'Ingesta de PDF, Word, webs y notas',
                'Memoria persistente por agente',
                'Citas y fuentes en las respuestas',
              ]}
            />
          )}
          {view === 'runs' && (
            <PlaceholderView
              icon={Activity}
              phase="Fase 2"
              title="Ejecuciones & Trazas"
              description="Observá cada paso de tus agentes: prompts, tools llamadas, tokens y costos. Inspirado en OpenHands (MIT) y SWE-agent (MIT)."
              features={[
                'Timeline de cada run con detalles',
                'Métricas de tokens y latencia',
                'Re-ejecutar con un clic',
              ]}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
        <BrainCircuit className="size-5 text-zinc-950" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight">OMNIAI</p>
        <p className="text-[10px] font-medium tracking-widest text-emerald-400/80 uppercase">
          Super Agent Studio
        </p>
      </div>
    </div>
  )
}

function NavList({
  view,
  go,
}: {
  view: ViewId
  go: (v: ViewId) => void
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
      {NAV.map((item) => {
        const active = view === item.id
        return (
          <button
            key={item.id}
            onClick={() => go(item.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100',
            )}
          >
            <item.icon
              className={cn(
                'size-4 shrink-0',
                active
                  ? 'text-emerald-400'
                  : 'text-zinc-500 group-hover:text-zinc-300',
              )}
              aria-hidden
            />
            <span className="flex-1 text-left">{item.label}</span>
            {item.soon && (
              <span className="rounded border border-zinc-700 px-1 py-0.5 text-[9px] font-semibold text-zinc-500 group-hover:text-zinc-400">
                {item.soon}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  return (
    <div className="border-t border-zinc-800/80 p-3">
      <div className="rounded-lg bg-zinc-900/80 p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
          <Sparkles className="size-3.5 text-emerald-400" aria-hidden />
          100% open source
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
          Construido con los mejores repos MIT del mundo. Licencia MIT.
        </p>
        <a
          href="https://github.com/Ezequiell-26/OMNIAI"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:underline"
        >
          <Layers className="size-3" aria-hidden />
          github.com/Ezequiell-26/OMNIAI
        </a>
      </div>
    </div>
  )
}
