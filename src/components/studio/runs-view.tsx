'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { RunDetail, RunSummary } from '@/lib/studio-types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Activity, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

function statusBadge(status: string) {
  if (status === 'success') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
  }
  if (status === 'error') {
    return 'border-red-500/30 bg-red-500/10 text-red-400'
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
}

function statusLabel(status: string) {
  if (status === 'success') return 'Exitosa'
  if (status === 'error') return 'Con error'
  return 'En curso'
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDuration(startedAt: string, finishedAt?: string | null) {
  if (!finishedAt) return '—'
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export function RunsView() {
  const { toast } = useToast()
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RunDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/runs')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar ejecuciones')
      setRuns(data.runs)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudieron cargar las ejecuciones',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const openRun = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/runs/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar la ejecución')
      setSelected(data.run)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudo abrir la ejecución',
        variant: 'destructive',
      })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              Historial de ejecuciones
            </h2>
            <p className="text-xs text-zinc-500">
              Cada run guarda la traza completa: pasos, agentes, entradas y salidas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="shrink-0 border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            Actualizar
          </Button>
        </div>

        {!loading && runs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15">
              <Activity className="size-7 text-emerald-400" aria-hidden />
            </div>
            <h3 className="mt-4 text-sm font-bold">Sin ejecuciones todavía</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-500">
              Cuando ejecutes un flujo desde la vista Flujos, acá vas a ver cada
              paso con su traza completa (estilo inspector de deepseek-harness).
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => void openRun(r.id)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                        statusBadge(r.status),
                      )}
                    >
                      {statusLabel(r.status)}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
                      {r.flowName}
                    </p>
                    <span className="text-[11px] text-zinc-500">
                      {fmtDateTime(r.startedAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{r.stepsCount} pasos</span>
                    <span>·</span>
                    <span>{fmtDuration(r.startedAt, r.finishedAt)}</span>
                    {r.error && (
                      <>
                        <span>·</span>
                        <span className="truncate text-red-400">{r.error}</span>
                      </>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detalle de la ejecución (traza) */}
      <Dialog open={Boolean(selected) || detailLoading} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-xl [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar]:w-1.5"
        >
          {detailLoading && !selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-zinc-100">
                  Cargando ejecución…
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center py-10 text-zinc-500">
                <Loader2 className="size-6 animate-spin" aria-hidden />
              </div>
            </>
          ) : selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 text-zinc-100">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                      statusBadge(selected.status),
                    )}
                  >
                    {statusLabel(selected.status)}
                  </span>
                  {selected.flowName}
                </DialogTitle>
                <DialogDescription>
                  {fmtDateTime(selected.startedAt)} · {selected.steps.length} pasos ·{' '}
                  {fmtDuration(selected.startedAt, selected.finishedAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase">
                    Input del flujo
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-300">
                    {selected.input || '—'}
                  </p>
                </div>

                {selected.error && (
                  <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                    {selected.error}
                  </p>
                )}

                {/* Timeline de pasos */}
                <ol className="relative space-y-2 border-l border-zinc-800 pl-4">
                  {selected.steps.map((s) => (
                    <li key={`${s.nodeId}-${s.index}`} className="relative">
                      <span
                        className="absolute -left-[21px] top-3 size-2.5 rounded-full border-2 border-zinc-950 bg-emerald-500"
                        aria-hidden
                      />
                      <details className="group rounded-lg border border-zinc-800 bg-zinc-900/60">
                        <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-xs text-zinc-300">
                          <span aria-hidden>
                            {s.nodeType === 'start'
                              ? '▶️'
                              : s.nodeType === 'end'
                                ? '🏁'
                                : (s.agentEmoji ?? '🤖')}
                          </span>
                          <span className="font-medium">
                            {s.nodeType === 'start'
                              ? 'Inicio'
                              : s.nodeType === 'end'
                                ? 'Fin'
                                : (s.agentName ?? 'Agente')}
                          </span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500 uppercase">
                            {s.nodeType}
                          </span>
                          {s.durationMs > 0 && (
                            <span className="ml-auto text-[10px] text-zinc-500">
                              {(s.durationMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </summary>
                        <div className="space-y-2 border-t border-zinc-800 px-3 py-2">
                          <div>
                            <p className="text-[10px] font-semibold text-zinc-500 uppercase">
                              Entrada
                            </p>
                            <p className="mt-0.5 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar]:w-1">
                              {s.input || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-zinc-500 uppercase">
                              Salida
                            </p>
                            <p className="mt-0.5 max-h-48 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar]:w-1">
                              {s.output || '—'}
                            </p>
                          </div>
                        </div>
                      </details>
                    </li>
                  ))}
                </ol>

                {selected.output && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Salida final
                    </p>
                    <p className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar]:w-1">
                      {selected.output}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
