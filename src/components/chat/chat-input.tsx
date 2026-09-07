'use client';

/**
 * ChatInput — caja de entrada controlada (v2).
 * - Auto-crecimiento, botón de detener y CTA de configuración.
 * - `sendOnEnter` configurable (Ctrl+Enter siempre envía).
 * - Admite `toolbar` (skills/persona/prompts) y valor controlado desde el
 *   ChatBox para poder insertar prompts de la biblioteca.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store/use-app-store';

interface ChatInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Generación en curso (submitted|streaming). */
  isBusy: boolean;
  /** Proveedor sin configurar → muestra `disabledHint` en lugar del input. */
  disabled?: boolean;
  disabledHint?: ReactNode;
  placeholder?: string;
  /** Botones extra (skills / persona / prompts). */
  toolbar?: ReactNode;
}

export function ChatInput({
  value,
  onValueChange,
  onSend,
  onStop,
  isBusy,
  disabled,
  disabledHint,
  placeholder,
  toolbar,
}: ChatInputProps) {
  const sendOnEnter = useAppStore((s) => s.sendOnEnter);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-crecimiento del textarea hasta 200px.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || isBusy || disabled) return;
    onSend(text);
    onValueChange('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    const isCtrl = event.ctrlKey || event.metaKey;
    if (isCtrl || (sendOnEnter && !event.shiftKey)) {
      event.preventDefault();
      submit();
    }
    // Shift+Enter → salto de línea (nativo).
  };

  return (
    <div className="shrink-0 border-t border-border/40 bg-background/80 p-3 backdrop-blur md:p-4">
      <div className="mx-auto w-full max-w-3xl">
        {disabled ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
            {disabledHint}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-2 transition-colors focus-within:border-ring/70 focus-within:ring-2 focus-within:ring-ring/15">
            {toolbar}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={placeholder ?? 'Escribe tu mensaje…'}
                aria-label="Mensaje para el asistente"
                disabled={isBusy}
                className="max-h-[200px] min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 shadow-none focus-visible:ring-0"
              />
              {isBusy ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={onStop}
                  aria-label="Detener generación"
                  className="size-10 shrink-0"
                >
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!value.trim()}
                  aria-label="Enviar mensaje"
                  className="size-10 shrink-0"
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </form>
          </div>
        )}
        <p className="mt-1.5 hidden text-center text-[11px] text-muted-foreground/50 sm:block">
          <kbd className="font-mono">Enter</kbd> envía · <kbd className="font-mono">Shift</kbd>+
          <kbd className="font-mono">Enter</kbd> salto de línea · <kbd className="font-mono">Ctrl</kbd>+
          <kbd className="font-mono">K</kbd> paleta de comandos · tus claves nunca salen de este
          navegador
        </p>
      </div>
    </div>
  );
}

/** Variante compacta de banner para el estado deshabilitado. */
export function ConfigHint({ text, action }: { text: string; action: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="truncate">{text}</span>
      {action}
    </span>
  );
}
