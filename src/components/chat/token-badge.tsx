'use client';

/**
 * TokenBadge — indicador discreto bajo cada mensaje con la estimación de
 * tokens consumidos y el coste aproximado en USD según la tarifa del modelo
 * activo (entrada para mensajes del usuario, salida para el asistente).
 */

import { useMemo } from 'react';
import { Coins } from 'lucide-react';
import { estimateTokens, formatCost, formatTokens } from '@/lib/tokens';
import { cn } from '@/lib/utils';

interface TokenBadgeProps {
  text: string;
  /** Precio por 1M de tokens de entrada (USD). */
  priceIn: number;
  /** Precio por 1M de tokens de salida (USD). */
  priceOut: number;
  kind: 'input' | 'output';
  className?: string;
}

export function TokenBadge({ text, priceIn, priceOut, kind, className }: TokenBadgeProps) {
  const tokens = useMemo(() => estimateTokens(text), [text]);
  const price = kind === 'input' ? priceIn : priceOut;
  const cost = (tokens * price) / 1_000_000;
  const isFree = priceIn === 0 && priceOut === 0;

  return (
    <span
      className={cn('inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground/50', className)}
      title="Estimación aproximada con tokenizador o200k_base"
    >
      <Coins className="size-3" aria-hidden />
      <span>≈{formatTokens(tokens)} tok</span>
      <span aria-hidden>·</span>
      <span>{isFree ? 'gratis' : `≈${formatCost(cost)}`}</span>
    </span>
  );
}
