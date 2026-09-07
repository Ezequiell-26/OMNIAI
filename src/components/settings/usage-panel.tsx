'use client';

/**
 * UsagePanel — estadísticas locales de uso (tokens y coste estimado).
 *
 * Los registros viven en IndexedDB (nunca salen del navegador):
 * - Totales agregados (tokens, coste, registros).
 * - Gráfico de barras de los últimos 14 días (recharts).
 * - Desglose por modelo (top 6).
 */

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { subDays } from 'date-fns';
import { BarChart3, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { listUsageRecords, clearUsageRecords } from '@/lib/db/usage';
import type { UsageRecord } from '@/lib/db/usage';
import { formatCost, formatTokens } from '@/lib/tokens';

const DAYS_WINDOW = 14;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Serie diaria (últimos 14 días, incluidos los días sin datos) + totales. */
function buildAnalytics(records: UsageRecord[]) {
  const buckets = new Map<string, number>();
  for (let i = 0; i < DAYS_WINDOW; i += 1) {
    buckets.set(format(subDays(new Date(), i), 'yyyy-MM-dd'), 0);
  }

  let totalTokens = 0;
  let totalCost = 0;
  for (const record of records) {
    totalTokens += record.tokens;
    totalCost += record.costUsd;
    const date = new Date(record.ts);
    if (Number.isNaN(date.getTime())) continue;
    const key = format(date, 'yyyy-MM-dd');
    const current = buckets.get(key);
    if (current !== undefined) buckets.set(key, current + record.tokens);
  }

  const chartData = Array.from({ length: DAYS_WINDOW }, (_, i) => {
    const date = subDays(new Date(), DAYS_WINDOW - 1 - i);
    return {
      day: format(date, 'dd/MM'),
      tokens: buckets.get(format(date, 'yyyy-MM-dd')) ?? 0,
    };
  });

  return { chartData, totalTokens, totalCost };
}

export function UsagePanel() {
  const [records, setRecords] = useState<UsageRecord[] | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listUsageRecords()
      .then((rows) => {
        if (!cancelled) setRecords(rows);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { chartData, totalTokens, totalCost } = useMemo(
    () => buildAnalytics(records ?? []),
    [records],
  );

  const byModel = useMemo(() => {
    const map = new Map<string, { tokens: number; costUsd: number }>();
    for (const record of records ?? []) {
      const key = `${record.provider}:${record.model}`;
      const current = map.get(key) ?? { tokens: 0, costUsd: 0 };
      current.tokens += record.tokens;
      current.costUsd += record.costUsd;
      map.set(key, current);
    }
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 6);
  }, [records]);

  const maxTokens = byModel[0]?.tokens ?? 0;

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearUsageRecords();
      setRecords([]);
      toast.success('Estadísticas borradas');
    } catch (error) {
      toast.error('No se pudieron borrar las estadísticas', {
        description: errorMessage(error),
      });
    } finally {
      setClearing(false);
    }
  };

  if (records === null) {
    return (
      <div className="grid place-items-center py-12" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Cargando estadísticas…</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="grid gap-4">
        <div className="glass-card flex flex-col items-center justify-center gap-2 rounded-xl p-10 text-center">
          <BarChart3 className="size-8 text-muted-foreground/50" aria-hidden />
          <p className="text-sm font-medium">Aún no hay datos de uso</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Cada respuesta registra de forma local los tokens consumidos y su coste estimado.
            Envía algún mensaje en el estudio y las estadísticas aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* ── Totales ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3" aria-label="Totales de uso">
        <div className="glass-card rounded-xl p-3 sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
            Tokens totales
          </p>
          <p className="mt-1 truncate text-base font-semibold tabular-nums sm:text-lg">
            {formatTokens(totalTokens)}
          </p>
        </div>
        <div className="glass-card rounded-xl p-3 sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
            Coste total
          </p>
          <p className="mt-1 truncate text-base font-semibold tabular-nums sm:text-lg">
            {formatCost(totalCost)}
          </p>
        </div>
        <div className="glass-card rounded-xl p-3 sm:p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
            Registros
          </p>
          <p className="mt-1 truncate text-base font-semibold tabular-nums sm:text-lg">
            {records.length}
          </p>
        </div>
      </div>

      {/* ── Últimos 14 días ───────────────────────────────────────────────── */}
      <section className="glass-card rounded-xl p-4" aria-labelledby="usage-chart-title">
        <h2 id="usage-chart-title" className="text-sm font-medium">
          Últimos 14 días
        </h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Tokens consumidos por día (entradas y salidas), según el reloj de este dispositivo.
        </p>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
              <XAxis
                dataKey="day"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                interval="preserveStartEnd"
                minTickGap={18}
              />
              <YAxis width={36} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(value) => [`${String(value)} tokens`, 'Tokens']}
              />
              <Bar dataKey="tokens" fill="var(--color-chart-2, #10b981)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Por modelo ────────────────────────────────────────────────────── */}
      <section className="glass-card rounded-xl p-4" aria-labelledby="usage-models-title">
        <h2 id="usage-models-title" className="text-sm font-medium">
          Por modelo
        </h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Top {byModel.length} por tokens acumulados.
        </p>
        <div className="grid gap-2.5">
          {byModel.map((row) => {
            const pct = maxTokens > 0 ? Math.max(2, Math.round((row.tokens / maxTokens) * 100)) : 0;
            return (
              <div key={row.key} className="grid gap-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-mono text-foreground/90" title={row.key}>
                    {row.key}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatTokens(row.tokens)} · {formatCost(row.costUsd)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded bg-muted/50">
                  <div
                    className="h-1.5 rounded bg-emerald-500/40"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Borrar estadísticas ───────────────────────────────────────────── */}
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              disabled={clearing}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Borrar estadísticas
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Borrar todas las estadísticas?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán todos los registros de tokens y coste guardados en este navegador.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void handleClear();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sí, borrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
