/**
 * Catálogo de proveedores y modelos de OmniAI Studio.
 *
 * Los precios son los de lista públicos (USD por 1M de tokens) y se usan
 * únicamente para la estimación aproximada de costes que se muestra bajo
 * cada mensaje. Ajusta las cifras a tu contrato/tarifa real si lo necesitas.
 */

import type { ProviderId } from '@/lib/types';

export interface ModelInfo {
  /** Identificador exacto que se envía al proveedor. */
  id: string;
  /** Etiqueta visible en el selector. */
  label: string;
  provider: ProviderId;
  /** Ventana de contexto aproximada (tokens). */
  context: number;
  /** USD por 1M de tokens de entrada. */
  priceIn: number;
  /** USD por 1M de tokens de salida. */
  priceOut: number;
  note?: string;
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  requiresKey: boolean;
  /** Regex de validación soft del formato de clave. */
  keyRegex?: RegExp;
  /** Pista de formato para el placeholder del input. */
  keyHint?: string;
  docsUrl?: string;
  /** Corre en la máquina del usuario (Local-First). */
  local?: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    requiresKey: true,
    keyRegex: /^sk-[A-Za-z0-9_-]{20,}$/,
    keyHint: 'sk-…',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    requiresKey: true,
    keyRegex: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
    keyHint: 'sk-ant-…',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  google: {
    id: 'google',
    label: 'Google Gemini',
    requiresKey: true,
    keyRegex: /^AIza[A-Za-z0-9_-]{30,}$/,
    keyHint: 'AIza…',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    requiresKey: false,
    local: true,
    docsUrl: 'https://ollama.com/download',
  },
  custom: {
    id: 'custom',
    label: 'Endpoint OpenAI-compatible',
    requiresKey: false,
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
  },
  demo: {
    id: 'demo',
    label: 'Demo (sin clave)',
    requiresKey: false,
  },
};

/** Contexto mínimo para saber si un proveedor está listo para usarse. */
export interface ReadinessContext {
  keys: Partial<Record<ProviderId, string>>;
  ollamaUrl: string;
  customBaseUrl: string;
  customModel: string;
  /** Lista CSV de modelos de Ollama (se añade aquí para no romper llamadas existentes). */
  ollamaModelsCsv?: string;
}

/** ¿Está configurado el proveedor? (el demo siempre está disponible). */
export function isProviderReady(provider: ProviderId, ctx: ReadinessContext): boolean {
  switch (provider) {
    case 'openai':
    case 'anthropic':
    case 'google':
      return Boolean(ctx.keys[provider]);
    case 'ollama':
      return Boolean(ctx.ollamaUrl.trim());
    case 'custom':
      return Boolean(ctx.customBaseUrl.trim() && ctx.customModel.trim());
    case 'demo':
      return true;
  }
}

/** Modelos integrados por proveedor (Ollama/custom se generan dinámicamente). */
const BUILTIN_MODELS: ModelInfo[] = [
  // ── OpenAI ──────────────────────────────────────────────────────────────
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', context: 128_000, priceIn: 2.5, priceOut: 10 },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai', context: 128_000, priceIn: 0.15, priceOut: 0.6 },
  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai', context: 1_000_000, priceIn: 2, priceOut: 8 },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', provider: 'openai', context: 1_000_000, priceIn: 0.4, priceOut: 1.6 },
  // ── Anthropic ───────────────────────────────────────────────────────────
  { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', provider: 'anthropic', context: 200_000, priceIn: 3, priceOut: 15 },
  { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', provider: 'anthropic', context: 200_000, priceIn: 0.8, priceOut: 4 },
  { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet', provider: 'anthropic', context: 200_000, priceIn: 3, priceOut: 15 },
  // ── Google Gemini ───────────────────────────────────────────────────────
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'google', context: 1_000_000, priceIn: 1.25, priceOut: 10 },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'google', context: 1_000_000, priceIn: 0.3, priceOut: 2.5 },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google', context: 1_000_000, priceIn: 0.1, priceOut: 0.4 },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'google', context: 2_000_000, priceIn: 1.25, priceOut: 5 },
  // ── Demo (backend Z.ai del sandbox, sin clave) ──────────────────────────
  {
    id: 'glm-4.6',
    label: 'GLM-4.6 · Demo',
    provider: 'demo',
    context: 200_000,
    priceIn: 0,
    priceOut: 0,
    note: 'Modelo de demostración incluido; no requiere API Key.',
  },
];

/** Lista de modelos disponibles para un proveedor, incluyendo los dinámicos. */
export function modelsForProvider(provider: ProviderId, ctx: ReadinessContext): ModelInfo[] {
  switch (provider) {
    case 'openai':
    case 'anthropic':
    case 'google':
    case 'demo':
      return BUILTIN_MODELS.filter((m) => m.provider === provider);
    case 'ollama':
      return parseModelList(ctx.ollamaModelsCsv ?? '').map((name) => ({
        id: name,
        label: name,
        provider: 'ollama' as const,
        context: 128_000,
        priceIn: 0,
        priceOut: 0,
        note: 'Modelo local — coste $0.',
      }));
    case 'custom':
      return ctx.customModel.trim()
        ? [
            {
              id: ctx.customModel.trim(),
              label: ctx.customModel.trim(),
              provider: 'custom' as const,
              context: 128_000,
              priceIn: 0,
              priceOut: 0,
              note: 'Endpoint propio — coste no estimable.',
            },
          ]
        : [];
  }
}

/** Busca un modelo por proveedor + id. */
export function findModel(provider: ProviderId, modelId: string, ctx: ReadinessContext): ModelInfo | undefined {
  return modelsForProvider(provider, ctx).find((m) => m.id === modelId);
}

/** Parsea "llama3.2, qwen2.5" → ["llama3.2", "qwen2.5"]. */
export function parseModelList(csv: string): string[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Etiqueta compuesta `proveedor:modelo` usada en el historial. */
export function composeModelTag(provider: ProviderId, modelId: string): string {
  return `${provider}:${modelId}`;
}

/** Separa `proveedor:modelo` en sus partes de forma segura. */
export function splitModelTag(tag: string): { provider: string; model: string } {
  const idx = tag.indexOf(':');
  if (idx < 0) return { provider: '', model: tag };
  return { provider: tag.slice(0, idx), model: tag.slice(idx + 1) };
}
