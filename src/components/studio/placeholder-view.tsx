'use client'

import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, Rocket } from 'lucide-react'

export function PlaceholderView({
  icon: Icon,
  phase,
  title,
  description,
  features,
}: {
  icon: LucideIcon
  phase: string
  title: string
  description: string
  features: string[]
}) {
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <Icon className="size-6 text-emerald-400" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  <Rocket className="size-3" aria-hidden />
                  {phase} · próximamente
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {description}
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-2.5">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 rounded-lg border border-zinc-800/70 bg-zinc-950/50 px-3.5 py-2.5 text-sm text-zinc-300"
              >
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-500"
                  aria-hidden
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
