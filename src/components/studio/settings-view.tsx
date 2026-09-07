'use client'

import { GitSyncPanel } from '@/components/git-sync-panel'

export function SettingsView() {
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        <div className="w-full text-left">
          <h2 className="text-lg font-bold tracking-tight text-zinc-100">
            Estado del sistema
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Sincronización con GitHub y estado de la infraestructura.
          </p>
        </div>

        {/* Fondo claro para que el panel git mantenga su estilo legible */}
        <div className="w-full rounded-2xl bg-zinc-100 p-2 shadow-2xl shadow-black/40">
          <GitSyncPanel />
        </div>

        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-bold text-zinc-100">
            Sobre OMNIAI
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            Studio de super-agentes construido con Next.js 16, TypeScript,
            Tailwind, shadcn/ui y Prisma. Diseñado integrando lo mejor de los
            repos open source más importantes del mundo (MIT / Apache-2.0):
            LangChain, CrewAI, OpenHands, browser-use, mem0, LlamaIndex,
            LibreChat y muchos más.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <Info label="Licencia" value="MIT" />
            <Info label="Stack" value="Next.js 16" />
            <Info label="Versión" value="0.1 · Fase 1" />
            <Info label="Repo" value="OMNIAI" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
      <p className="text-[9px] font-semibold tracking-wider text-zinc-600 uppercase">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-zinc-300">
        {value}
      </p>
    </div>
  )
}
