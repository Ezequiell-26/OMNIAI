'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/studio-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Bot,
  CheckCircle2,
  Pencil,
  Plus,
  Thermometer,
  Trash2,
} from 'lucide-react'

interface FormState {
  name: string
  emoji: string
  description: string
  systemPrompt: string
  temperature: number
}

const EMPTY: FormState = {
  name: '',
  emoji: '🤖',
  description: '',
  systemPrompt: '',
  temperature: 0.7,
}

const EMOJIS = ['🤖', '🧠', '🚀', '📝', '🔍', '💼', '🎯', '🧪', '🎨', '👨‍💻', '📊', '🛠️']

export function AgentsView() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/agents', { cache: 'no-store' })
    if (res.ok) setAgents(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (a: Agent) => {
    setEditingId(a.id)
    setForm({
      name: a.name,
      emoji: a.emoji,
      description: a.description,
      systemPrompt: a.systemPrompt,
      temperature: a.temperature,
    })
    setError(null)
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) {
      setError('El nombre y el prompt del sistema son obligatorios')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = editingId
        ? await fetch(`/api/agents/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'No se pudo guardar')
      }
      setDialogOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (a: Agent) => {
    const res = await fetch(`/api/agents/${a.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'No se pudo eliminar')
      setTimeout(() => setError(null), 4000)
      return
    }
    await load()
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Tus agentes</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Cada agente tiene personalidad, instrucciones y estilo propios.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          >
            <Plus className="size-4" aria-hidden /> Nuevo agente
          </Button>
        </div>

        {error && !dialogOpen && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            ⚠ {error}
          </p>
        )}

        {loading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50"
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'group relative rounded-2xl border p-4 transition-colors',
                  a.isDefault
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {a.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold">{a.name}</h3>
                      {a.isDefault && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                          <CheckCircle2 className="size-2.5" aria-hidden />
                          PRINCIPAL
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                      {a.description || 'Sin descripción'}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Thermometer className="size-3" aria-hidden />
                        temp {a.temperature.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bot className="size-3" aria-hidden />
                        {a.model}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1.5 border-t border-zinc-800/60 pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(a)}
                    className="h-7 gap-1 px-2 text-xs text-zinc-400 hover:text-zinc-100"
                  >
                    <Pencil className="size-3" aria-hidden /> Editar
                  </Button>
                  {!a.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(a)}
                      className="h-7 gap-1 px-2 text-xs text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="size-3" aria-hidden /> Eliminar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogo crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar agente' : 'Nuevo agente'}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Definí su personalidad: el prompt del sistema es su cerebro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name">Nombre</Label>
              <Input
                id="agent-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Investigador"
                className="border-zinc-700 bg-zinc-950"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ícono</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm({ ...form, emoji: e })}
                    aria-label={`Elegir ícono ${e}`}
                    className={cn(
                      'rounded-lg border p-1.5 text-lg transition',
                      form.emoji === e
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-800 hover:border-zinc-600',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-desc">Descripción corta</Label>
              <Input
                id="agent-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Busca info en la web y resume"
                className="border-zinc-700 bg-zinc-950"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-prompt">Prompt del sistema</Label>
              <Textarea
                id="agent-prompt"
                value={form.systemPrompt}
                onChange={(e) =>
                  setForm({ ...form, systemPrompt: e.target.value })
                }
                placeholder="Sos un investigador experto. Cuando te den un tema…"
                rows={5}
                className="resize-y border-zinc-700 bg-zinc-950"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Creatividad (temperature)</Label>
                <span className="text-xs font-semibold text-emerald-400">
                  {form.temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[form.temperature]}
                onValueChange={([v]) => setForm({ ...form, temperature: v })}
                min={0}
                max={2}
                step={0.1}
              />
              <p className="text-[10px] text-zinc-600">
                Bajo = preciso y estable · Alto = creativo y sorprendente
              </p>
            </div>

            {error && dialogOpen && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                ⚠ {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving}
              className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
            >
              {saving ? 'Guardando…' : 'Guardar agente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
