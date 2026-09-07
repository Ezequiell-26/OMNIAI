/**
 * OmniAI Studio — Tipos compartidos entre cliente y servidor.
 *
 * Filosofía Local-First / BYOK:
 * - Las API Keys se cifran (AES-GCM) y se guardan SOLO en el navegador.
 * - Viajan al servidor únicamente como cabecera efímera por petición
 *   (`x-omni-config`) y nunca se persisten en el backend.
 */

import type { UIMessage } from 'ai';

/** Proveedores soportados por el enrutador de IA. */
export type ProviderId = 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom' | 'demo';

/** Panel en modo split-view (a = izquierda, b = derecha). */
export type PanelId = 'a' | 'b';

/** Selección activa de un panel: proveedor + modelo. */
export interface PanelSelection {
  provider: ProviderId;
  model: string;
}

/**
 * Configuración efímera que viaja en la cabecera `x-omni-config`
 * (JSON → base64) con cada petición de chat.
 */
export interface ChatConfig {
  provider: ProviderId;
  model: string;
  /** API Key descifrada del navegador (solo vive durante la request). */
  key?: string;
  /** URL base de Ollama (p. ej. http://localhost:11434). */
  ollamaUrl?: string;
  /** Endpoint compatible con la API de OpenAI (vLLM, LM Studio, OpenRouter…). */
  customBaseUrl?: string;
}

/** Conversación persistida en IndexedDB (local al navegador). */
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mode: 'single' | 'split';
  /** Etiqueta compuesta `proveedor:modelo` usada en el panel A. */
  modelA: string;
  /** Etiqueta compuesta usada en el panel B (modo split). */
  modelB?: string;
  messagesA: UIMessage[];
  messagesB?: UIMessage[];
}

/** Totales aproximados de la sesión para el footer. */
export interface SessionTotals {
  tokens: number;
  costUsd: number;
}
