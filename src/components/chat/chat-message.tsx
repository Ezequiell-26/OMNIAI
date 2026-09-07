'use client';

/**
 * ChatMessage — burbuja individual de la conversación.
 * - Usuario: burbuja alineada a la derecha (texto pre-formateado).
 * - Asistente: tarjeta glassmorphism con Markdown completo + contador de
 *   tokens/coste + indicador de streaming animado (Framer Motion).
 */

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Sparkles, User } from 'lucide-react';
import type { UIMessage } from 'ai';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { TokenBadge } from '@/components/chat/token-badge';
import type { ModelInfo } from '@/lib/ai/catalog';
import { messageText } from '@/lib/ai/messages';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: UIMessage;
  modelInfo?: ModelInfo;
  /** true mientras este mensaje está recibiendo stream. */
  streaming?: boolean;
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

export function ChatMessage({ message, modelInfo, streaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const text = messageText(message);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Portapapeles no disponible.
    }
  }, [text]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('group flex w-full gap-3', isUser && 'justify-end')}
    >
      {!isUser && (
        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground shadow-sm">
          <Sparkles className="size-3.5" aria-hidden />
        </div>
      )}

      <div className={cn('min-w-0', isUser ? 'flex max-w-[85%] flex-col items-end sm:max-w-[75%]' : 'flex-1')}>
        {isUser ? (
          <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm leading-relaxed text-secondary-foreground">
            {text}
          </div>
        ) : (
          <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
            <MarkdownRenderer content={text} />
            {streaming && <StreamingDots />}
          </div>
        )}

        {/* Meta: tokens/coste + copiar mensaje */}
        <div
          className={cn(
            'mt-1 flex items-center gap-2.5 px-1',
            isUser ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          <TokenBadge
            text={text}
            kind={isUser ? 'input' : 'output'}
            priceIn={modelInfo?.priceIn ?? 0}
            priceOut={modelInfo?.priceOut ?? 0}
          />
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
    </motion.article>
  );
}
