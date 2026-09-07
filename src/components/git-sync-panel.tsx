'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  FilePen,
  GitBranch,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'

const SYNC_PORT = 3031
const svc = (path: string) => `${path}?XTransformPort=${SYNC_PORT}`

interface SyncResult {
  ok: boolean
  action: 'push' | 'pull' | 'rebase-push' | 'noop' | 'auto-commit-push' | 'error' | string
  detail: string
  ahead: number
  behind: number
  dirty: boolean
  at: string
}

interface SyncStatus {
  repo: string
  repoUrl: string
  branch: string
  intervalMs: number
  autoCommit: boolean
  syncing: boolean
  lastResult: SyncResult | null
  lastError: string | null
}

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 5) return 'justo ahora'
  if (s < 60) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return new Date(iso).toLocaleDateString('es-AR')
}

const ACTION_LABEL: Record<string, string> = {
  push: 'Push a GitHub',
  pull: 'Pull desde GitHub',
  'rebase-push': 'Rebase + push',
  noop: 'Sin cambios',
  'auto-commit-push': 'Auto-commit + push',
  error: 'Error',
}

export function GitSyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [, setTick] = useState(0)
  const mounted = useRef(true)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(svc('/status'), { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as SyncStatus
      if (mounted.current) setStatus(data)
    } catch {
      // el servicio aún puede estar arrancando; se reintenta en el próximo ciclo
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void loadStatus()
    const poll = setInterval(() => void loadStatus(), 10_000)
    const tick = setInterval(() => setTick((t) => t + 1), 1_000)
    return () => {
      mounted.current = false
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [loadStatus])

  const syncNow = async () => {
    setBusy(true)
    try {
      await fetch(svc('/sync'), { method: 'POST' })
      await loadStatus()
    } finally {
      setBusy(false)
    }
  }

  const setAutoCommit = async (value: boolean) => {
    try {
      await fetch(svc('/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoCommit: value }),
      })
      await loadStatus()
    } catch {
      // ignorado: se reflejará en el próximo poll
    }
  }

  const r = status?.lastResult ?? null
  const isSyncing = busy || (status?.syncing ?? false)

  const state =
    !status || !r
      ? 'loading'
      : !r.ok
        ? 'error'
        : r.ahead > 0 || r.behind > 0 || r.dirty
          ? 'pending'
          : 'ok'

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="size-5 text-emerald-600" aria-hidden />
            Sincronización automática con GitHub
          </CardTitle>
          <CardDescription>
            Cada commit local se sube solo; lo que llegue a GitHub desde otro
            lugar se baja solo aquí.
          </CardDescription>
        </div>
        {state === 'loading' ? (
          <Skeleton className="h-6 w-32 rounded-full" />
        ) : (
          <StateBadge state={state} />
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Repositorio */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {status ? (
            <>
              <a
                href={status.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                {status.repo}
                <ExternalLink className="size-3.5 opacity-60" aria-hidden />
              </a>
              <Badge variant="outline" className="font-mono">
                {status.branch}
              </Badge>
              <span className="text-muted-foreground text-xs">
                cada {Math.round(status.intervalMs / 1000)}s
              </span>
            </>
          ) : (
            <Skeleton className="h-5 w-64" />
          )}
        </div>

        <Separator />

        {/* Última sincronización */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-medium">
              Última sincronización
            </p>
            {r ? (
              <p className="mt-1 text-sm font-medium" suppressHydrationWarning>
                {relTime(r.at)}
              </p>
            ) : (
              <Skeleton className="mt-1 h-5 w-24" />
            )}
            {r && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {ACTION_LABEL[r.action] ?? r.action}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric
              icon={<ArrowUp className="size-4" aria-hidden />}
              label="Por subir"
              value={r ? r.ahead : null}
              warn={(r?.ahead ?? 0) > 0}
            />
            <Metric
              icon={<ArrowDown className="size-4" aria-hidden />}
              label="Por bajar"
              value={r ? r.behind : null}
              warn={(r?.behind ?? 0) > 0}
            />
            <Metric
              icon={<FilePen className="size-4" aria-hidden />}
              label="Editados"
              value={r === null ? null : r.dirty ? '—' : '0'}
              warn={r?.dirty ?? false}
            />
          </div>
        </div>

        {/* Mensaje del último ciclo */}
        {r && (
          <p
            className={`text-sm ${r.ok ? 'text-muted-foreground' : 'text-destructive'}`}
          >
            {r.detail}
          </p>
        )}

        {status?.lastError && (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" aria-hidden />
            <AlertTitle>Error de sincronización</AlertTitle>
            <AlertDescription className="break-words">
              {status.lastError}
            </AlertDescription>
          </Alert>
        )}

        {/* Controles */}
        <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <label
              htmlFor="auto-commit"
              className="text-sm font-medium leading-none"
            >
              Auto-commit
            </label>
            <p className="text-muted-foreground text-xs">
              Commitea y sube automáticamente los archivos editados
            </p>
          </div>
          <Switch
            id="auto-commit"
            checked={status?.autoCommit ?? false}
            onCheckedChange={setAutoCommit}
            disabled={!status}
          />
        </div>

        <Button
          onClick={syncNow}
          disabled={isSyncing}
          className="w-full sm:w-auto"
        >
          {isSyncing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {isSyncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </Button>
      </CardContent>
    </Card>
  )
}

function StateBadge({ state }: { state: 'ok' | 'pending' | 'error' | 'loading' }) {
  if (state === 'loading') return null
  if (state === 'ok')
    return (
      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
        <CheckCircle2 className="size-3.5" aria-hidden /> Sincronizado
      </Badge>
    )
  if (state === 'pending')
    return (
      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
        <RefreshCw className="size-3.5" aria-hidden /> Pendiente
      </Badge>
    )
  return (
    <Badge variant="destructive" className="gap-1">
      <TriangleAlert className="size-3.5" aria-hidden /> Error
    </Badge>
  )
}

function Metric({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode
  label: string
  value: number | string | null
  warn: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border p-2 ${
        warn ? 'border-amber-400 bg-amber-50' : ''
      }`}
    >
      <span
        className={`flex items-center gap-1 ${warn ? 'text-amber-600' : 'text-muted-foreground'}`}
      >
        {icon}
        <span className="text-lg leading-none font-semibold">
          {value ?? '·'}
        </span>
      </span>
      <span className="text-muted-foreground mt-1 text-[10px] leading-none">
        {label}
      </span>
    </div>
  )
}
