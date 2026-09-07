/**
 * Estimación de tokens y costes aproximados.
 *
 * - Tokenización real con el vocabulario `o200k_base` (GPT-4o y familia).
 *   Para Anthropic/Google sirve como estimación razonable (±10 %).
 * - Coste = tokens × precio por 1M, usando el catálogo `lib/ai/catalog`.
 */

import { encode } from 'gpt-tokenizer/encoding/o200k_base';

/** Número aproximado de tokens de un texto (fallback: chars/4). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

/** Coste en USD para un par entrada/salida según precios por 1M. */
export function estimateCostUsd(inputTokens: number, outputTokens: number, priceIn: number, priceOut: number): number {
  return (inputTokens * priceIn + outputTokens * priceOut) / 1_000_000;
}

/** Formatea un coste pequeño de forma legible ($0.0042 / <$0.0001). */
export function formatCost(usd: number): string {
  if (usd <= 0) return '$0';
  if (usd < 0.0001) return '<$0.0001';
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

/** Formatea un recuento de tokens (1240 → "1.2k"). */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}k`;
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}
