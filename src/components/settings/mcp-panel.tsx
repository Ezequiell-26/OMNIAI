'use client';

/**
 * McpPanel — gestión de servidores MCP (Model Context Protocol).
 *
 * - Añadir servidores Streamable HTTP o SSE con headers opcionales (JSON).
 * - Probar conexión (`tools/list` vía /api/mcp) y cachear las herramientas.
 * - Activar/desactivar, inspeccionar herramientas y eliminar servidores.
 * - El servidor "Studio MCP (integrado)" es local y no se puede eliminar.
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Plug,
  Plus,
  Server,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore, type McpServer, type McpToolInfo } from '@/lib/store/use-app-store';
import { cn } from '@/lib/utils';

const BUILTIN_STUDIO_ID = 'builtin-studio';

/** Borrador del formulario de alta de servidor. */
interface McpDraft {
  name: string;
  url: string;
  transport: McpServer['transport'];
  headersJson: string;
}

const EMPTY_DRAFT: McpDraft = { name: '', url: '', transport: 'http', headersJson: '' };

/** Etiquetas legibles del transporte. */
const TRANSPORT_LABEL: Record<McpServer['transport'], string> = {
  http: 'Streamable HTTP',
  sse: 'SSE (legacy)',
};

/** Respuesta del endpoint de prueba /api/mcp. */
interface McpListResponse {
  ok: boolean;
  tools?: McpToolInfo[];
  error?: string;
}

export function McpPanel() {
  const mcpServers = useAppStore((s) => s.mcpServers);
  const toggleMcpServer = useAppStore((s) => s.toggleMcpServer);
  const upsertMcpServer = useAppStore((s) => s.upsertMcpServer);
  const deleteMcpServer = useAppStore((s) => s.deleteMcpServer);

  const [draft, setDraft] = useState<McpDraft | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSaveServer = () => {
    if (!draft) return;
    const name = draft.name.trim();
    const url = draft.url.trim();
    if (!name) {
      toast.error('Ponle un nombre al servidor');
      return;
    }
    if (!url) {
      toast.error('Indica la URL del servidor MCP');
      return;
    }
    const headers = draft.headersJson.trim();
    if (headers) {
      try {
        const parsed: unknown = JSON.parse(headers);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('no-objeto');
        }
      } catch {
        toast.error('Los headers extra no son un objeto JSON válido', {
          description: 'Ej.: {"Authorization":"Bearer sk-…"}',
        });
        return;
      }
    }
    upsertMcpServer({
      id: crypto.randomUUID(),
      name,
      transport: draft.transport,
      url,
      headersJson: headers,
      enabled: false,
      tools: [],
    });
    toast.success(`Servidor «${name}» añadido`);
    setDraft(null);
  };

  /** POST /api/mcp { action:'list' } → cachea las herramientas del servidor. */
  const handleTestServer = async (server: McpServer) => {
    setTestingId(server.id);
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          server: {
            id: server.id,
            name: server.name,
            transport: server.transport,
            url: server.url,
            headersJson: server.headersJson,
          },
        }),
      });
      const data = (await response.json()) as McpListResponse;
      if (data.ok) {
        const tools = data.tools ?? [];
        upsertMcpServer({
          ...server,
          tools,
          lastError: undefined,
          lastTestedAt: new Date().toISOString(),
        });
        toast.success(`${tools.length} herramientas encontradas`, {
          description: `${server.name} · ${TRANSPORT_LABEL[server.transport]}`,
        });
      } else {
        const message = data.error ?? 'Error desconocido';
        upsertMcpServer({ ...server, lastError: message });
        toast.error(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo contactar con /api/mcp';
      upsertMcpServer({ ...server, lastError: message });
      toast.error('Fallo al probar el servidor', { description: message });
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteServer = (server: McpServer) => {
    if (server.id === BUILTIN_STUDIO_ID) {
      toast.error('El servidor Studio integrado no se puede eliminar');
      return;
    }
    deleteMcpServer(server.id);
    if (expandedId === server.id) setExpandedId(null);
    toast.info(`Servidor «${server.name}» eliminado`);
  };

  return (
    <div className="grid gap-4">
      {/* Cabecera de sección */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Server className="size-4 text-muted-foreground" aria-hidden />
            Servidores MCP
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Conecta herramientas externas mediante el protocolo MCP.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
        >
          <Plus className="size-3.5" aria-hidden />
          Añadir servidor
        </Button>
      </div>

      {/* Lista de servidores */}
      <div className="grid gap-2">
        {mcpServers.map((server) => {
          const isBuiltin = server.id === BUILTIN_STUDIO_ID;
          const isTesting = testingId === server.id;
          const isExpanded = expandedId === server.id;
          return (
            <div key={server.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{server.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-sm px-1.5 text-[9px] font-normal',
                        server.transport === 'http'
                          ? 'border-emerald-500/30 text-emerald-400'
                          : 'border-amber-500/30 text-amber-400',
                      )}
                    >
                      {server.transport === 'http' ? 'HTTP' : 'SSE'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-sm px-1.5 text-[9px] font-normal text-muted-foreground"
                    >
                      {server.tools.length}{' '}
                      {server.tools.length === 1 ? 'herramienta' : 'herramientas'}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                    {server.url}
                  </p>
                  {server.lastError && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-destructive/90">
                      {server.lastError}
                    </p>
                  )}
                  {isBuiltin && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
                      <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
                      Servidor local de Studio con herramientas listas para usar:
                      <span className="font-mono">studio_uuid</span> (identificadores),
                      <span className="font-mono">studio_dice</span> (dados),
                      <span className="font-mono">studio_lorem</span> (texto de relleno) y
                      <span className="font-mono">studio_base64</span> (codificar/decodificar).
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={() => toggleMcpServer(server.id)}
                    aria-label={`${server.enabled ? 'Desactivar' : 'Activar'} servidor ${server.name}`}
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                  disabled={isTesting}
                  onClick={() => handleTestServer(server)}
                >
                  {isTesting ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                  ) : (
                    <Plug className="size-3" aria-hidden />
                  )}
                  Probar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  disabled={server.tools.length === 0}
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded
                      ? `Ocultar herramientas de ${server.name}`
                      : `Mostrar herramientas de ${server.name}`
                  }
                  onClick={() => setExpandedId(isExpanded ? null : server.id)}
                >
                  {isExpanded ? (
                    <ChevronUp className="size-3" aria-hidden />
                  ) : (
                    <ChevronDown className="size-3" aria-hidden />
                  )}
                  Herramientas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'h-7 gap-1.5 px-2.5 text-xs text-muted-foreground',
                    isBuiltin
                      ? 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground'
                      : 'hover:text-destructive',
                  )}
                  aria-label={
                    isBuiltin
                      ? `${server.name} no se puede eliminar`
                      : `Eliminar servidor ${server.name}`
                  }
                  onClick={() => handleDeleteServer(server)}
                >
                  <Trash2 className="size-3" aria-hidden />
                  {isBuiltin ? 'Integrado' : 'Eliminar'}
                </Button>
                {server.lastTestedAt && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60">
                    Probado: {new Date(server.lastTestedAt).toLocaleTimeString('es-ES')}
                  </span>
                )}
              </div>

              {/* Herramientas descubiertas */}
              {isExpanded && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-background/40 p-2">
                  <ul className="grid gap-1.5">
                    {server.tools.map((tool) => (
                      <li key={tool.name} className="text-xs">
                        <span className="font-mono text-[11px] text-foreground">{tool.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          {tool.description || 'Sin descripción.'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground/70">
        El protocolo MCP (JSON-RPC 2.0) se negocia desde el servidor de la app. Los headers se
        guardan solo en este navegador.
      </p>

      {/* Diálogo añadir servidor */}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir servidor MCP</DialogTitle>
            <DialogDescription>
              El servidor de la app abrirá la conexión; el navegador nunca habla directamente
              con el endpoint.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-1">
            <div>
              <Label htmlFor="mcp-name" className="mb-1 block text-xs text-muted-foreground">
                Nombre
              </Label>
              <Input
                id="mcp-name"
                value={draft?.name ?? ''}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
                placeholder="Ej.: Documentación interna"
                autoComplete="off"
                className="h-9"
                aria-label="Nombre del servidor MCP"
              />
            </div>
            <div>
              <Label htmlFor="mcp-url" className="mb-1 block text-xs text-muted-foreground">
                URL
              </Label>
              <Input
                id="mcp-url"
                value={draft?.url ?? ''}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, url: event.target.value } : prev))
                }
                placeholder="https://ejemplo.com/mcp"
                autoComplete="off"
                spellCheck={false}
                className="h-9 font-mono text-xs"
                aria-label="URL del servidor MCP"
              />
            </div>
            <div>
              <Label htmlFor="mcp-transport" className="mb-1 block text-xs text-muted-foreground">
                Transporte
              </Label>
              <Select
                value={draft?.transport ?? 'http'}
                onValueChange={(value) =>
                  setDraft(
                    (prev) =>
                      prev ? { ...prev, transport: value as McpServer['transport'] } : prev,
                  )
                }
              >
                <SelectTrigger id="mcp-transport" className="h-9" aria-label="Transporte del servidor MCP">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">Streamable HTTP</SelectItem>
                  <SelectItem value="sse">SSE (legacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="mcp-headers"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Headers extra (opcional)
              </Label>
              <Textarea
                id="mcp-headers"
                value={draft?.headersJson ?? ''}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, headersJson: event.target.value } : prev))
                }
                rows={2}
                placeholder='{"Authorization":"Bearer …"}'
                spellCheck={false}
                className="resize-y font-mono text-xs"
                aria-label="Headers HTTP extra en formato JSON"
              />
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Objeto JSON con cabeceras HTTP. Se cifra en el navegador y no sale de él.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveServer}>
              Guardar servidor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
