'use client'

import { useCallback, useEffect, useState } from 'react'
import { Blocks, Loader2, Plug, Puzzle, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/studio-types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

// ────────────────────────────────────────────────
// SkillsView — catálogo de plugins (everything-is-a-plugin,
// filosofía de deepseek-ai/deepseek-harness, MIT).
// Cada skill puede activarse/desactivarse por agente.
// ────────────────────────────────────────────────

interface SkillInfo {
  id: string
  name: string
  emoji: string
  description: string
  inspiredBy: string
  params: Array<{ name: string; type: string; required: boolean; description: string }>
  agents: Array<{ id: string; name: string; emoji: string }>
}

export function SkillsView() {
  const { toast } = useToast()
  const [skills, setSkills] = useState<SkillInfo[] | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [busy, setBusy] = useState<string | null>(null) // `${agentId}:${skillId}`

  const load = useCallback(async () => {
    try {
      const [skillsRes, agentsRes] = await Promise.all([
        fetch('/api/skills'),
        fetch('/api/agents'),
      ])
      const skillsData = (await skillsRes.json()) as { skills: SkillInfo[] }
      const agentsData = (await agentsRes.json()) as Agent[]
      setSkills(skillsData.skills ?? [])
      setAgents(agentsData ?? [])
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar el catálogo de skills', variant: 'destructive' })
      setSkills([])
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const toggleSkill = async (agent: Agent, skillId: string) => {
    const key = `${agent.id}:${skillId}`
    setBusy(key)
    const current = parseSkills(agent.skills)
    const next = current.includes(skillId)
      ? current.filter((id) => id !== skillId)
      : [...current, skillId]
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: next }),
      })
      if (!res.ok) throw new Error()
      const updated = (await res.json()) as Agent
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSkills((prev) =>
        prev
          ? prev.map((s) => {
              const has = next.includes(s.id)
              const included = s.agents.some((a) => a.id === agent.id)
              if (has && !included)
                return { ...s, agents: [...s.agents, { id: agent.id, name: agent.name, emoji: agent.emoji }] }
              if (!has && included)
                return { ...s, agents: s.agents.filter((a) => a.id !== agent.id) }
              return s
            })
          : prev,
      )
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el agente', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Banner filosofía plugin */}
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-900/40 to-zinc-900/40 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
              <Plug className="size-5 text-emerald-400" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100">
                Everything is a plugin
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Igual que <span className="font-medium text-emerald-300">deepseek-harness</span> (MIT,
                215k★), en OMNIAI cada herramienta es un plugin independiente que se conecta a
                cualquier agente. Activá skills por agente y los usarán automáticamente cuando
                los necesiten, con trazas visibles en el chat.
              </p>
            </div>
          </div>
        </div>

        {/* Catálogo */}
        {skills === null ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {skills.map((skill) => (
              <Card
                key={skill.id}
                className="border-zinc-800/80 bg-zinc-900/50 transition-colors hover:border-zinc-700"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg">
                      {skill.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100">{skill.name}</h3>
                        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {skill.id}
                        </code>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                        {skill.description}
                      </p>

                      {/* Parámetros */}
                      {skill.params.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {skill.params.map((p) => (
                            <span
                              key={p.name}
                              className="inline-flex items-center gap-1 rounded border border-zinc-700/70 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-400"
                              title={p.description}
                            >
                              <Wrench className="size-2.5" aria-hidden />
                              {p.name}
                              <span className="text-zinc-600">{p.type}</span>
                              {p.required && <span className="text-emerald-500">*</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="mt-2.5 text-[10px] italic text-zinc-600">
                        Inspirado en: {skill.inspiredBy}
                      </p>
                    </div>
                  </div>

                  {/* Agentes */}
                  <div className="mt-4 border-t border-zinc-800/80 pt-3">
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                      <Puzzle className="size-3" aria-hidden />
                      Activada para
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {agents.length === 0 && (
                        <span className="text-xs text-zinc-600">No hay agentes</span>
                      )}
                      {agents.map((agent) => {
                        const active = skill.agents.some((a) => a.id === agent.id)
                        const key = `${agent.id}:${skill.id}`
                        return (
                          <button
                            key={agent.id}
                            onClick={() => void toggleSkill(agent, skill.id)}
                            disabled={busy === key}
                            aria-pressed={active}
                            aria-label={`${active ? 'Desactivar' : 'Activar'} ${skill.name} para ${agent.name}`}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                              active
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                                : 'border-zinc-700 bg-zinc-800/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
                              busy === key && 'opacity-60',
                            )}
                          >
                            {busy === key ? (
                              <Loader2 className="size-3 animate-spin" aria-hidden />
                            ) : (
                              <span aria-hidden>{agent.emoji}</span>
                            )}
                            {agent.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Próximamente MCP */}
        <div className="rounded-xl border border-dashed border-zinc-800 p-5 text-center">
          <Blocks className="mx-auto size-5 text-zinc-600" aria-hidden />
          <p className="mt-2 text-xs font-medium text-zinc-400">
            Próximamente: servidores MCP externos
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Conectá miles de herramientas del ecosistema Model Context Protocol
            (modelcontextprotocol/servers, MIT/Apache-2.0).
          </p>
          <Badge variant="outline" className="mt-2 border-zinc-700 text-zinc-500">
            Fase 3
          </Badge>
        </div>
      </div>
    </div>
  )
}

function parseSkills(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
