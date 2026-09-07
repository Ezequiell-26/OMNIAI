'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft,
  Bot,
  Copy,
  Flag,
  GitBranch,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  Agent,
  FlowDetail,
  FlowEdgeDef,
  FlowNodeDef,
  FlowSummary,
  RunDetail,
} from '@/lib/studio-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'

// ────────────────────────────────────────────────
// Tipos de nodos del canvas
// ────────────────────────────────────────────────

interface FlowNodeData extends Record<string, unknown> {
  label?: string
  agentId?: string
  agentName?: string
  agentEmoji?: string
  template?: string
}
type OmniNode = Node<FlowNodeData>

function StartNode({ selected }: NodeProps<OmniNode>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border-2 border-emerald-500/70 bg-emerald-950/70 px-4 py-2.5 shadow-lg transition-shadow',
        selected && 'ring-2 ring-emerald-400/60',
      )}
    >
      <Flag className="size-4 text-emerald-400" aria-hidden />
      <div className="leading-tight">
        <p className="text-xs font-bold text-emerald-300">Inicio</p>
        <p className="text-[10px] text-emerald-500/80">input del flujo</p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-zinc-950 !bg-emerald-400"
      />
    </div>
  )
}

function AgentNode({ data, selected }: NodeProps<OmniNode>) {
  const hasAgent = Boolean(data.agentName)
  return (
    <div
      className={cn(
        'w-52 rounded-xl border-2 bg-zinc-900 shadow-xl transition-all',
        selected
          ? 'border-emerald-400/80 ring-2 ring-emerald-400/40'
          : 'border-zinc-700/80',
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span className="text-base" aria-hidden>
          {data.agentEmoji ?? '🤖'}
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-100">
          {hasAgent ? data.agentName : 'Elegir agente…'}
        </p>
        <Bot className="size-3.5 shrink-0 text-emerald-500" aria-hidden />
      </div>
      <p className="line-clamp-2 px-3 py-2 font-mono text-[10px] leading-snug text-zinc-500">
        {data.template || '{{input}}'}
      </p>
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-zinc-950 !bg-zinc-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-zinc-950 !bg-emerald-400"
      />
    </div>
  )
}

function EndNode({ selected }: NodeProps<OmniNode>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border-2 border-zinc-600 bg-zinc-900 px-4 py-2.5 shadow-lg',
        selected && 'ring-2 ring-emerald-400/60',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-zinc-950 !bg-zinc-400"
      />
      <div className="leading-tight">
        <p className="text-xs font-bold text-zinc-200">Fin</p>
        <p className="text-[10px] text-zinc-500">salida del flujo</p>
      </div>
      <span className="text-sm" aria-hidden>
        🏁
      </span>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  start: StartNode,
  agent: AgentNode,
  end: EndNode,
}

// ────────────────────────────────────────────────
// Vista principal
// ────────────────────────────────────────────────

export function FlowsView() {
  const { toast } = useToast()
  const [flows, setFlows] = useState<FlowSummary[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadFlows = useCallback(async () => {
    try {
      const res = await fetch('/api/flows')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar flujos')
      setFlows(data.flows)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudieron cargar los flujos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadFlows()
    void (async () => {
      try {
        const res = await fetch('/api/agents')
        const data = await res.json()
        if (res.ok) setAgents(Array.isArray(data) ? data : (data.agents ?? []))
      } catch {
        /* los agentes se pueden elegir después */
      }
    })()
  }, [loadFlows])

  const createFlow = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Flujo ${flows.length + 1}` }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear')
      await loadFlows()
      setSelectedId(data.flow.id)
      setListOpen(false)
      toast({ title: 'Flujo creado', description: 'Conectá agentes y ejecutalo.' })
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudo crear el flujo',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const deleteFlow = async (id: string) => {
    try {
      const res = await fetch(`/api/flows/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      if (selectedId === id) setSelectedId(null)
      await loadFlows()
      toast({ title: 'Flujo eliminado' })
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudo eliminar',
        variant: 'destructive',
      })
    }
  }

  const selectFlow = (id: string) => {
    setSelectedId(id)
    setListOpen(false)
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Lista de flujos */}
      <aside
        className={cn(
          'w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-900/30 md:flex',
          listOpen ? 'flex' : 'hidden',
        )}
      >
        <div className="border-b border-zinc-800/80 p-3">
          <Button
            onClick={createFlow}
            disabled={creating}
            className="w-full bg-emerald-600 text-zinc-950 hover:bg-emerald-500"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Nuevo flujo
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-zinc-500">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </div>
          ) : flows.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-zinc-500">
              Todavía no hay flujos. Creá el primero.
            </p>
          ) : (
            <ul className="space-y-1">
              {flows.map((f) => (
                <li key={f.id} className="group relative">
                  <button
                    onClick={() => selectFlow(f.id)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2.5 pr-9 text-left transition-colors',
                      selectedId === f.id
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : 'text-zinc-300 hover:bg-zinc-800/70',
                    )}
                  >
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      {f.runsCount} ejecuciones ·{' '}
                      {new Date(f.updatedAt).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </button>
                  <button
                    onClick={() => void deleteFlow(f.id)}
                    aria-label={`Eliminar ${f.name}`}
                    className="absolute right-2 top-2.5 rounded p-1.5 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Constructor / estado vacío */}
      <section className="flex min-w-0 flex-1 flex-col">
        {selectedId ? (
          <FlowBuilder
            key={selectedId}
            flowId={selectedId}
            onBack={() => setListOpen(true)}
            onSaved={loadFlows}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15">
                <Workflow className="size-7 text-emerald-400" aria-hidden />
              </div>
              <h2 className="mt-4 text-lg font-bold">Constructor de Flujos</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                Elegí un flujo de la lista o creá uno nuevo. Conectá agentes en
                cadena y ejecutá pipelines completos con un clic.
              </p>
              {flows.length > 0 && (
                <Button
                  onClick={() => setListOpen(true)}
                  variant="outline"
                  className="mt-4 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
                >
                  Ver flujos
                </Button>
              )}
              <p className="mt-4 text-[11px] text-zinc-600">
                Basado en React Flow (MIT) · motor tipo deepseek-harness (MIT)
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function FlowBuilder({
  flowId,
  onBack,
  onSaved,
}: {
  flowId: string
  onBack: () => void
  onSaved: () => Promise<void> | void
}) {
  const { toast } = useToast()
  const [agents, setAgents] = useState<Agent[]>([])
  const [name, setName] = useState('')
  const [nodes, setNodes, onNodesChange] = useNodesState<OmniNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [configNodeId, setConfigNodeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Run dialog
  const [runOpen, setRunOpen] = useState(false)
  const [runInput, setRunInput] = useState('')
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<RunDetail | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        // Agentes primero: hacen falta para enriquecer los nodos del canvas.
        const resA = await fetch('/api/agents')
        const dataA = await resA.json()
        const agentList: Agent[] = resA.ok
          ? Array.isArray(dataA)
            ? dataA
            : (dataA.agents ?? [])
          : []
        setAgents(agentList)

        const res = await fetch(`/api/flows/${flowId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al cargar el flujo')
        const flow: FlowDetail = data.flow
        setName(flow.name)
        // Enriquecer nodos con nombre/emoji del agente para el canvas
        const agentMap = new Map(agentList.map((a) => [a.id, a]))
        setNodes(
          flow.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position ?? { x: 0, y: 0 },
            data: {
              ...n.data,
              agentName:
                n.data?.agentId && agentMap.has(n.data.agentId)
                  ? `${agentMap.get(n.data.agentId)?.emoji} ${agentMap.get(n.data.agentId)?.name}`
                  : n.data?.agentName,
            },
          })),
        )
        setEdges(
          flow.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: true,
            style: { stroke: '#10b98166' },
          })),
        )
      } catch (e) {
        toast({
          title: 'Error',
          description: e instanceof Error ? e.message : 'No se pudo cargar el flujo',
          variant: 'destructive',
        })
      }
    })()
  }, [flowId])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#10b98166' },
          },
          eds,
        ),
      )
      setDirty(true)
    },
    [setEdges],
  )

  const markDirty = useCallback(() => setDirty(true), [])

  const toDefs = useMemo(
    () => () => ({
      nodes: nodes.map(
        (n): FlowNodeDef => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            label: n.data.label,
            agentId: n.data.agentId,
            template: n.data.template,
          },
        }),
      ),
      edges: edges.map(
        (e): FlowEdgeDef => ({ id: e.id, source: e.source, target: e.target }),
      ),
    }),
    [nodes, edges],
  )

  const save = useCallback(
    async (opts?: { silent?: boolean }): Promise<boolean> => {
      setSaving(true)
      try {
        const res = await fetch(`/api/flows/${flowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() || 'Flujo sin título', ...toDefs() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
        setDirty(false)
        await onSaved()
        if (!opts?.silent) {
          toast({ title: 'Flujo guardado ✓' })
        }
        return true
      } catch (e) {
        toast({
          title: 'Error al guardar',
          description: e instanceof Error ? e.message : 'Intentá de nuevo',
          variant: 'destructive',
        })
        return false
      } finally {
        setSaving(false)
      }
    },
    [flowId, name, toDefs, onSaved, toast],
  )

  const addAgentNode = () => {
    const first = agents[0]
    const id = `agent-${Date.now().toString(36)}`
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'agent',
        position: { x: 220 + Math.random() * 160, y: 40 + Math.random() * 200 },
        data: {
          label: 'Agente',
          agentId: first?.id,
          agentName: first ? `${first.emoji} ${first.name}` : undefined,
          agentEmoji: first?.emoji,
          template: '{{prev}}',
        },
      },
    ])
    setDirty(true)
  }

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: OmniNode) => {
      if (node.type === 'agent') setConfigNodeId(node.id)
    },
    [],
  )

  const configNode = nodes.find((n) => n.id === configNodeId && n.type === 'agent')

  const updateConfigNode = (patch: Partial<FlowNodeData>) => {
    if (!configNodeId) return
    setNodes((nds) =>
      nds.map((n) =>
        n.id === configNodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    )
    setDirty(true)
  }

  const deleteConfigNode = () => {
    if (!configNodeId) return
    setNodes((nds) => nds.filter((n) => n.id !== configNodeId))
    setEdges((eds) =>
      eds.filter((e) => e.source !== configNodeId && e.target !== configNodeId),
    )
    setConfigNodeId(null)
    setDirty(true)
  }

  const runFlow = async () => {
    setRunning(true)
    setRunError(null)
    setRunResult(null)
    try {
      const saved = await save({ silent: true })
      if (!saved) throw new Error('Guardá el flujo antes de ejecutar')
      const res = await fetch(`/api/flows/${flowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: runInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al ejecutar')
      setRunResult(data.run)
      await onSaved()
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Error al ejecutar')
    } finally {
      setRunning(false)
    }
  }

  const openRunDialog = () => {
    setRunResult(null)
    setRunError(null)
    setRunOpen(true)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Volver a la lista"
          className="size-8 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setDirty(true)
          }}
          aria-label="Nombre del flujo"
          className="h-8 w-40 border-transparent bg-transparent px-2 text-sm font-semibold focus-visible:border-zinc-700 sm:w-56"
        />
        {dirty && (
          <span className="hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 sm:inline">
            sin guardar
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addAgentNode}
            className="border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Plus className="size-3.5" aria-hidden />
            Agente
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void save()}
            disabled={saving}
            className="border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="size-3.5" aria-hidden />
            )}
            Guardar
          </Button>
          <Button
            size="sm"
            onClick={openRunDialog}
            className="bg-emerald-600 text-xs text-zinc-950 hover:bg-emerald-500"
          >
            <Play className="size-3.5" aria-hidden />
            Ejecutar
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            colorMode="dark"
            fitView
            minZoom={0.2}
            deleteKeyCode={['Delete', 'Backspace']}
          >
            <Background gap={18} variant={BackgroundVariant.Dots} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="hidden sm:block" />
          </ReactFlow>
        </div>
        <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-[10px] text-zinc-500">
          Conectá los puertos arrastrando · seleccioná un nodo Agente para configurarlo · Delete lo elimina
        </p>
      </div>

      {/* Panel de configuración del nodo agente */}
      <Sheet open={Boolean(configNode)} onOpenChange={(o) => !o && setConfigNodeId(null)}>
        <SheetContent side="right" className="w-full border-zinc-800 bg-zinc-950 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="text-zinc-100">Configurar agente</SheetTitle>
            <SheetDescription className="text-zinc-500">
              Elegí qué agente responde en este nodo y con qué instrucción.
            </SheetDescription>
          </SheetHeader>
          {configNode && (
            <div className="space-y-5 px-4 pb-6">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Agente</Label>
                <Select
                  value={configNode.data.agentId ?? ''}
                  onValueChange={(v) => {
                    const a = agents.find((ag) => ag.id === v)
                    updateConfigNode({
                      agentId: v,
                      agentName: a ? `${a.emoji} ${a.name}` : undefined,
                      agentEmoji: a?.emoji,
                    })
                  }}
                >
                  <SelectTrigger className="border-zinc-800 bg-zinc-900">
                    <SelectValue placeholder="Elegir agente" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-800 bg-zinc-900">
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.emoji} {a.name}
                        {a.isDefault ? ' · principal' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {agents.length === 0 && (
                  <p className="text-[11px] text-amber-400">
                    No hay agentes creados. Creá uno en la vista Agentes.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">
                  Plantilla del mensaje
                </Label>
                <Textarea
                  value={configNode.data.template ?? ''}
                  onChange={(e) => updateConfigNode({ template: e.target.value })}
                  rows={4}
                  className="resize-none border-zinc-800 bg-zinc-900 font-mono text-xs"
                  placeholder="{{input}}"
                />
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Variables:{' '}
                  <code className="rounded bg-zinc-800 px-1 text-emerald-400">
                    {'{{input}}'}
                  </code>{' '}
                  = input del flujo ·{' '}
                  <code className="rounded bg-zinc-800 px-1 text-emerald-400">
                    {'{{prev}}'}
                  </code>{' '}
                  = salida del nodo anterior. Ideal para encadenar agentes.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={deleteConfigNode}
                className="w-full border-red-900/60 bg-zinc-950 text-red-400 hover:bg-red-950/40 hover:text-red-300"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Eliminar nodo
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de ejecución */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-lg [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar]:w-1.5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-100">
              <GitBranch className="size-4 text-emerald-400" aria-hidden />
              Ejecutar flujo
            </DialogTitle>
            <DialogDescription>
              Se guarda la versión actual y se ejecuta con tu input.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              rows={3}
              placeholder="Input del flujo. Ej: Resumí las ventajas de la energía solar…"
              className="resize-none border-zinc-800 bg-zinc-900 text-sm"
            />

            {running && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-300">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Ejecutando agentes… puede tardar un poco.
              </div>
            )}

            {runError && (
              <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2.5 text-sm text-red-300">
                {runError}
              </p>
            )}

            {runResult && (
              <div className="space-y-3">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    runResult.status === 'success'
                      ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300'
                      : 'border-red-900/60 bg-red-950/30 text-red-300',
                  )}
                >
                  {runResult.status === 'success' ? '✅' : '❌'}
                  Ejecución {runResult.status === 'success' ? 'completa' : 'con error'}
                  {runResult.error ? ` — ${runResult.error}` : ''}
                </div>

                <div className="space-y-2">
                  {runResult.steps.map((s) => (
                    <details
                      key={`${s.nodeId}-${s.index}`}
                      className="group rounded-lg border border-zinc-800 bg-zinc-900/60"
                    >
                      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-zinc-300">
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
                  ))}
                </div>

                {runResult.output && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase">
                      <Copy className="size-3" aria-hidden />
                      Salida final del flujo
                    </p>
                    <p className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar]:w-1">
                      {runResult.output}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRunOpen(false)}
              className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
            >
              Cerrar
            </Button>
            <Button
              onClick={() => void runFlow()}
              disabled={running || !runInput.trim()}
              className="bg-emerald-600 text-zinc-950 hover:bg-emerald-500"
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Play className="size-4" aria-hidden />
              )}
              Ejecutar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
