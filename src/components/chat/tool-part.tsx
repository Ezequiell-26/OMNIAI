'use client';

/**
 * ToolPart — tarjeta plegable para una invocación de herramienta
 * (skill integrada o herramienta MCP) dentro de un mensaje del asistente.
 *
 * Muestra el nombre, los argumentos JSON y el resultado (o error) con un
 * icono según la herramienta. Se usa con las partes `dynamic-tool` que
 * emite tanto el AI SDK como el protocolo demo.
 */

import { useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  Clock,
  Globe,
  Image as ImageIcon,
  Loader2,
  Search,
  Server,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Vista tolerante de una invocación de herramienta: cubre tanto las partes
 * `dynamic-tool` del AI SDK como el adaptador de partes estáticas.
 */
export interface ToolPartViewData {
  toolName: string;
  state: string;
  input: unknown;
  output?: unknown;
  errorText?: string;
}

const TOOL_ICONS: Record<string, typeof Search> = {
  web_search: Search,
  page_reader: Globe,
  image_gen: ImageIcon,
  clock: Clock,
  calculator: Calculator,
  studio_uuid: Server,
  studio_dice: Server,
  studio_lorem: Server,
  studio_base64: Server,
};

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Búsqueda web',
  page_reader: 'Lector web',
  image_gen: 'Generador de imágenes',
  clock: 'Reloj',
  calculator: 'Calculadora',
};

/** Extrae un texto legible de la salida de la herramienta. */
function outputToText(output: unknown): string {
  if (output === null || output === undefined) return '';
  if (typeof output === 'string') return output;
  if (typeof output === 'object') {
    const record = output as Record<string, unknown>;
    if (typeof record.content === 'string') return record.content;
    if (typeof record.error === 'string') return `Error: ${record.error}`;
    return JSON.stringify(output, null, 2);
  }
  return String(output);
}

export function ToolPart({ part }: { part: ToolPartViewData }) {
  const [open, setOpen] = useState(false);
  const Icon = TOOL_ICONS[part.toolName] ?? Sparkles;
  const label = TOOL_LABELS[part.toolName] ?? part.toolName;

  // Estados posibles: input-streaming | input-available | output-available |
  // output-error | output-denied | approval-request…
  const running = part.state === 'input-streaming' || part.state === 'input-available';
  const failed = part.state === 'output-error' || part.state === 'output-denied';
  const outputText =
    part.state === 'output-available'
      ? outputToText(part.output)
      : part.state === 'output-error'
        ? part.errorText
        : '';

  // Las imágenes generadas se muestran incrustadas.
  const isImage = part.toolName === 'image_gen' && typeof outputText === 'string' && outputText.startsWith('/');

  return (
    <div className="my-1.5 overflow-hidden rounded-xl border border-border/50 bg-card/50 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/40"
      >
        {running ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : failed ? (
          <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-hidden />
        ) : (
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{label}</span>
          <span className="ml-1.5 text-muted-foreground">
            {running
              ? 'ejecutando…'
              : failed
                ? 'falló'
                : isImage
                  ? 'imagen lista'
                  : 'completado'}
          </span>
        </span>
        <ChevronDown
          className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-border/40 px-3 py-2">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">
            Argumentos
          </p>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-2 font-mono text-[10.5px] leading-relaxed">
            {JSON.stringify(part.input, null, 2)}
          </pre>

          {part.state === 'output-available' && (
            <>
              <p className="mb-1 mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                Resultado
              </p>
              {isImage ? (
                // Ruta local de /public/generated: img nativo es correcto aquí.
                <img
                  src={outputText ?? ''}
                  alt="Imagen generada por la herramienta"
                  className="max-h-72 w-auto rounded-lg border border-border/40"
                />
              ) : (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 font-mono text-[10.5px] leading-relaxed">
                  {outputText?.slice(0, 4000) || '(vacío)'}
                </pre>
              )}
            </>
          )}

          {part.state === 'output-error' && (
            <p className="mt-2 text-destructive">{part.errorText ?? 'Error desconocido.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
