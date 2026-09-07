'use client';

/**
 * ChatMessage — burbuja individual de la conversación (v2).
 * - Usuario: burbuja alineada a la derecha (texto pre-formateado).
 * - Asistente: tarjeta glassmorphism con Markdown completo, tarjetas de
 *   herramientas (skills/MCP), lectura en voz alta (TTS), botón de
 *   regenerar y contador de tokens/coste configurable.
 * - Animaciones desactivables desde Ajustes (Framer Motion).
 */

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Loader2, RefreshCw, Sparkles, User, Volume2, VolumeX } from 'lucide-react';
import type { UIMessage } from 'ai';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { TokenBadge } from '@/components/chat/token-badge';
import { ToolPart } from '@/components/chat/tool-part';
import type { ModelInfo } from '@/lib/ai/catalog';
import { messageText } from '@/lib/ai/messages';
import { useAppStore } from '@/lib/store/use-app-store';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: UIMessage;
  modelInfo?: ModelInfo;
  /** true mientras este mensaje está recibiendo stream. */
  streaming?: boolean;
  /** Solo la última respuesta puede regenerarse. */
  onRegenerate?: () => void;
}

function StreamingDots() {
  return (
    <span className="mt-2 inline-flex items-center gap-1" aria-label="Generando respuesta">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="size-1.5 rounded-full bg-muted-foreground/70"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

/** Quita bloques de código y Markdown ruidoso para la lectura TTS. */
function textForSpeech(message: UIMessage): string {
  return messageText(message)
    .replace(/```[\s\S]*?```/g, ' (bloque de código omitido) ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>~`|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
}

/** Botón de lectura en voz alta (TTS backend). */
function SpeakButton({ text }: { text: string }) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = useCallback(async () => {
    if (phase === 'playing') {
      audioRef.current?.pause();
      audioRef.current = null;
      setPhase('idle');
      return;
    }
    if (phase === 'loading' || !text.trim()) return;
    setPhase('loading');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('No se pudo generar el audio.');
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => {
        setPhase('idle');
        URL.revokeObjectURL(audio.src);
        audioRef.current = null;
      };
      setPhase('playing');
      await audio.play();
    } catch {
      setPhase('idle');
    }
  }, [phase, text]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={phase === 'playing' ? 'Detener lectura' : 'Leer en voz alta'}
      title={phase === 'playing' ? 'Detener lectura' : 'Leer en voz alta'}
      className={cn(
        'inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-opacity hover:text-foreground',
        phase !== 'idle' && 'opacity-100 text-foreground',
      )}
    >
      {phase === 'loading' ? (
        <Loader2 className="size-3 animate-spin" />
      ) : phase === 'playing' ? (
        <VolumeX className="size-3" />
      ) : (
        <Volume2 className="size-3" />
      )}
      <span>{phase === 'playing' ? 'Detener' : 'Escuchar'}</span>
    </button>
  );
}

/** Renderiza una parte de herramienta (estática o dinámica). */
function ToolPartView({ part }: { part: UIMessage['parts'][number] }) {
  if (part.type === 'dynamic-tool') {
    // Mapeo explícito: la unión del AI SDK tiene variantes con campos propios.
    return (
      <ToolPart
        part={{
          toolName: part.toolName,
          state: part.state,
          input: 'input' in part ? part.input : {},
          output: 'output' in part ? part.output : undefined,
          errorText: 'errorText' in part ? part.errorText : undefined,
        }}
      />
    );
  }
  if (part.type.startsWith('tool-')) {
    // Parte de herramienta estática (skill integrada vía AI SDK).
    const staticPart = part as unknown as {
      state?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
    };
    return (
      <ToolPart
        part={{
          toolName: part.type.slice('tool-'.length),
          state: staticPart.state ?? 'output-available',
          input: staticPart.input ?? {},
          output: staticPart.output,
          errorText: staticPart.errorText ?? '',
        }}
      />
    );
  }
  return null;
}

/** Envoltura del mensaje: con o sin animación de entrada (Framer Motion). */
function MessageShell({
  isUser,
  animations,
  children,
}: {
  isUser: boolean;
  animations: boolean;
  children: React.ReactNode;
}) {
  const className = cn('group flex w-full gap-3', isUser && 'justify-end');
  if (!animations) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ChatMessage({ message, modelInfo, streaming, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const text = messageText(message);
  const [copied, setCopied] = useState(false);

  const showTokenBadges = useAppStore((s) => s.showTokenBadges);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);

  const toolParts = message.parts.filter(
    (part) => part.type === 'dynamic-tool' || part.type.startsWith('tool-'),
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Portapapeles no disponible.
    }
  }, [text]);

  const body = (
    <>
      {toolParts.length > 0 && (
        <div className="mb-2">
          {toolParts.map((part, index) => (
            <ToolPartView key={`${part.type}-${index}`} part={part} />
          ))}
        </div>
      )}
      {isUser ? (
        <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm leading-relaxed text-secondary-foreground">
          {text}
        </div>
      ) : (
        <>
          <MarkdownRenderer content={text} />
          {streaming && <StreamingDots />}
        </>
      )}
    </>
  );

  return (
    <MessageShell isUser={isUser} animations={animationsEnabled}>
      {!isUser && (
        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground shadow-sm">
          <Sparkles className="size-3.5" aria-hidden />
        </div>
      )}

      <div className={cn('min-w-0', isUser ? 'flex max-w-[85%] flex-col items-end sm:max-w-[75%]' : 'flex-1')}>
        {isUser ? (
          body
        ) : (
          <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">{body}</div>
        )}

        {/* Meta: tokens/coste + copiar + TTS + regenerar */}
        <div
          className={cn(
            'mt-1 flex flex-wrap items-center gap-2.5 px-1',
            isUser ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          {showTokenBadges && (
            <TokenBadge
              text={text}
              kind={isUser ? 'input' : 'output'}
              priceIn={modelInfo?.priceIn ?? 0}
              priceOut={modelInfo?.priceOut ?? 0}
            />
          )}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Mensaje copiado' : 'Copiar mensaje'}
            className={cn(
              'inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-opacity hover:text-foreground',
              'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
              copied && 'opacity-100 text-emerald-400',
            )}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          {!isUser && !streaming && text.trim() && <SpeakButton text={text} />}

          {!isUser && !streaming && onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              aria-label="Regenerar respuesta"
              title="Regenerar respuesta"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-opacity hover:text-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <RefreshCw className="size-3" />
              <span>Regenerar</span>
            </button>
          )}

          {!isUser && modelInfo && (
            <span className="hidden font-mono text-[10px] text-muted-foreground/40 sm:inline">
              {modelInfo.label}
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary text-muted-foreground shadow-sm">
          <User className="size-3.5" aria-hidden />
        </div>
      )}
    </MessageShell>
  );
}
