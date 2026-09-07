'use client';

/**
 * ChatBox — panel de conversación completo (compatible con split-view).
 *
 * Integra `useChat` de Vercel AI SDK (@ai-sdk/react v7) con un
 * `DefaultChatTransport` cuya cabecera `x-omni-config` se resuelve en el
 * momento de cada envío (función `Resolvable`), de modo que cambiar de
 * modelo o de clave a mitad de conversación funciona sin remontar el chat.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { AlertTriangle, KeyRound, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { ChatInput, ConfigHint } from '@/components/chat/chat-input';
import { ChatMessage } from '@/components/chat/chat-message';
import { ModelSelector, PROVIDER_ICON } from '@/components/chat/model-selector';
import { Button } from '@/components/ui/button';
import { findModel, isProviderReady, PROVIDERS, type ReadinessContext } from '@/lib/ai/catalog';
import { buildConfigHeader, useSettingsStore } from '@/lib/store/use-settings-store';
import type { PanelId } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatBoxProps {
  panelId: PanelId;
  /** Mensajes iniciales al (re)montar — historial cargado de IndexedDB. */
  initialMessages?: UIMessage[];
  /** Notifica al padre cada cambio de mensajes (para persistencia local). */
  onMessagesChange?: (messages: UIMessage[]) => void;
  onOpenSettings: () => void;
  /** Muestra la mini-cabecera con selector de modelo (modo split). */
  showPanelHeader?: boolean;
  placeholder?: string;
  className?: string;
}

/** Sugerencias del estado vacío. */
const SUGGESTIONS = [
  'Explícame la diferencia entre REST y GraphQL con un ejemplo de código',
  'Escribe una función en TypeScript con debounce y explica cada línea',
  'Resume las ventajas del enfoque Local-First en una tabla Markdown',
  'Genera un componente React de login con validación y estilos Tailwind',
];

export function ChatBox({
  panelId,
  initialMessages = [],
  onMessagesChange,
  onOpenSettings,
  showPanelHeader,
  placeholder,
  className,
}: ChatBoxProps) {
  const panel = useSettingsStore((s) => (panelId === 'a' ? s.panelA : s.panelB));
  const keys = useSettingsStore((s) => s.keys);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const customBaseUrl = useSettingsStore((s) => s.customBaseUrl);
  const customModel = useSettingsStore((s) => s.customModel);
  const ollamaModelsCsv = useSettingsStore((s) => s.ollamaModelsCsv);
  const setPanelSelection = useSettingsStore((s) => s.setPanelSelection);

  const ctx: ReadinessContext = useMemo(
    () => ({ keys, ollamaUrl, customBaseUrl, customModel, ollamaModelsCsv }),
    [keys, ollamaUrl, customBaseUrl, customModel, ollamaModelsCsv],
  );
  const modelInfo = findModel(panel.provider, panel.model, ctx);
  const ready = isProviderReady(panel.provider, ctx);
  const ProviderIcon = PROVIDER_ICON[panel.provider];

  // Ref para no re-suscribir el efecto de persistencia al callback del padre.
  const onMessagesChangeRef = useRef(onMessagesChange);
  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  // Transporte con cabecera BYOK resuelta en cada request.
  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: '/api/chat',
        headers: () => ({ 'x-omni-config': buildConfigHeader(panelId) }),
      }),
    [panelId],
  );

  const { messages, sendMessage, stop, regenerate, clearError, status, error } = useChat({
    id: `omni-panel-${panelId}`,
    transport,
    messages: initialMessages,
    onError: (err) => {
      toast.error('Error del proveedor', { description: err.message.slice(0, 220) });
    },
  });

  useEffect(() => {
    onMessagesChangeRef.current?.(messages);
  }, [messages]);

  // Auto-scroll al último mensaje.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  const isBusy = status === 'streaming' || status === 'submitted';
  const providerLabel = PROVIDERS[panel.provider].label;

  const disabledHint = (
    <ConfigHint
      text={`${providerLabel} necesita una API Key para funcionar.`}
      action={
        <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={onOpenSettings}>
          <KeyRound className="size-3.5" aria-hidden />
          Configurar clave
        </Button>
      }
    />
  );

  return (
    <section
      aria-label={showPanelHeader ? `Chat — ${providerLabel}` : 'Conversación'}
      className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}
    >
      {/* Mini-cabecera por panel (split-view) */}
      {showPanelHeader && (
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/40 bg-card/30 px-3">
          <ProviderIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {panelId === 'a' ? 'Panel A' : 'Panel B'}
          </span>
          <div className="ml-auto">
            <ModelSelector
              compact
              align={panelId === 'a' ? 'start' : 'end'}
              value={panel}
              onChange={(selection) => setPanelSelection(panelId, selection)}
              onOpenSettings={onOpenSettings}
            />
          </div>
        </div>
      )}

      {/* Historial de mensajes */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {messages.length === 0 ? (
          <div className="bg-grid flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <div className="glass-card flex size-12 items-center justify-center rounded-2xl shadow-lg">
              <ProviderIcon className="size-6 text-foreground" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">
              {showPanelHeader ? `${providerLabel} · listo` : '¿En qué trabajamos hoy?'}
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {modelInfo?.note ??
                `Usando ${modelInfo?.label ?? panel.model} — trae tu propia clave y todo queda en tu navegador.`}
            </p>
            <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage({ text: suggestion })}
                  className="glass-card rounded-xl px-3.5 py-3 text-left text-[13px] leading-snug text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-md"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                modelInfo={modelInfo}
                streaming={isBusy && index === messages.length - 1 && message.role === 'assistant'}
              />
            ))}
            <div className="h-2" />
          </div>
        )}
      </div>

      {/* Banner de error con reintento */}
      {error && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-2">
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 break-words">{error.message}</p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 border-destructive/40 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => {
                  clearError();
                  regenerate();
                }}
              >
                <RefreshCw className="size-3" aria-hidden />
                Reintentar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive hover:bg-destructive/10"
                onClick={clearError}
                aria-label="Descartar error"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <ChatInput
        onSend={(text) => sendMessage({ text })}
        onStop={stop}
        isBusy={isBusy}
        disabled={!ready}
        disabledHint={disabledHint}
        placeholder={placeholder ?? `Mensaje para ${modelInfo?.label ?? providerLabel}…`}
      />
    </section>
  );
}
