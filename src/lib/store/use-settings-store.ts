/**
 * useSettingsStore — estado global de OmniAI Studio (Zustand).
 *
 * Separación de responsabilidades por seguridad:
 * - `keys` (API Keys en claro) → SOLO memoria volátil. Se hidratan desde
 *   IndexedDB (descifrando con AES-GCM) al arrancar y NUNCA se persisten
 *   en localStorage.
 * - Preferencias no sensibles (paneles, URLs, modo split…) → persistidas
 *   en localStorage vía middleware `persist`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PanelId, PanelSelection, ProviderId } from '@/lib/types';
import { encryptSecret, decryptSecret } from '@/lib/crypto/secret-box';
import { putSecretRecord, getAllSecretRecords, deleteSecretRecord } from '@/lib/db/secrets';
import { encodeConfigHeader } from '@/lib/header-codec';

interface SettingsState {
  /** API Keys en claro — solo memoria volátil (nunca persistidas). */
  keys: Partial<Record<ProviderId, string>>;
  /** true cuando la hidratación de secretos desde IndexedDB terminó. */
  secretsLoaded: boolean;

  // ── Preferencias (persistidas en localStorage) ─────────────────────────
  panelA: PanelSelection;
  panelB: PanelSelection;
  splitMode: boolean;
  ollamaUrl: string;
  /** Modelos de Ollama separados por comas (editable desde el modal). */
  ollamaModelsCsv: string;
  /** Endpoint propio compatible con la API de OpenAI. */
  customBaseUrl: string;
  customModel: string;

  // ── Acciones ────────────────────────────────────────────────────────────
  setKey: (provider: ProviderId, key: string) => void;
  clearKey: (provider: ProviderId) => void;
  setSecretsLoaded: (loaded: boolean) => void;
  setPanelSelection: (panel: PanelId, selection: PanelSelection) => void;
  setSplitMode: (enabled: boolean) => void;
  toggleSplitMode: () => void;
  setOllamaUrl: (url: string) => void;
  setOllamaModelsCsv: (csv: string) => void;
  setCustomBaseUrl: (url: string) => void;
  setCustomModel: (model: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      keys: {},
      secretsLoaded: false,

      panelA: { provider: 'demo', model: 'glm-4.6' },
      panelB: { provider: 'openai', model: 'gpt-4o-mini' },
      splitMode: false,
      ollamaUrl: 'http://localhost:11434',
      ollamaModelsCsv: 'llama3.2, qwen2.5, mistral',
      customBaseUrl: '',
      customModel: '',

      setKey: (provider, key) =>
        set((state) => ({ keys: { ...state.keys, [provider]: key } })),
      clearKey: (provider) =>
        set((state) => {
          const keys = { ...state.keys };
          delete keys[provider];
          return { keys };
        }),
      setSecretsLoaded: (loaded) => set({ secretsLoaded: loaded }),
      setPanelSelection: (panel, selection) =>
        set(panel === 'a' ? { panelA: selection } : { panelB: selection }),
      setSplitMode: (enabled) => set({ splitMode: enabled }),
      toggleSplitMode: () => set((state) => ({ splitMode: !state.splitMode })),
      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      setOllamaModelsCsv: (csv) => set({ ollamaModelsCsv: csv }),
      setCustomBaseUrl: (url) => set({ customBaseUrl: url }),
      setCustomModel: (model) => set({ customModel: model }),
    }),
    {
      name: 'omniai-settings',
      version: 1,
      // ⚠️ `keys` y `secretsLoaded` se excluyen a propósito de localStorage.
      partialize: (state) => ({
        panelA: state.panelA,
        panelB: state.panelB,
        splitMode: state.splitMode,
        ollamaUrl: state.ollamaUrl,
        ollamaModelsCsv: state.ollamaModelsCsv,
        customBaseUrl: state.customBaseUrl,
        customModel: state.customModel,
      }),
    },
  ),
);

/**
 * Hidrata las API Keys desde IndexedDB (descifrándolas en el navegador).
 * Se llama una única vez al montar la aplicación.
 */
export async function loadSecretsIntoStore(): Promise<void> {
  try {
    const records = await getAllSecretRecords();
    const keys: Partial<Record<ProviderId, string>> = {};
    await Promise.all(
      Object.entries(records).map(async ([provider, payload]) => {
        try {
          keys[provider as ProviderId] = await decryptSecret(payload);
        } catch {
          // Payload corrupto (p. ej. DB de otro origen): se ignora.
        }
      }),
    );
    useSettingsStore.setState({ keys, secretsLoaded: true });
  } catch {
    useSettingsStore.setState({ secretsLoaded: true });
  }
}

/**
 * Guarda (cifra) o elimina la clave de un proveedor según el valor recibido:
 * - valor no vacío → cifra con AES-GCM y persiste en IndexedDB.
 * - valor vacío y había clave → elimina el registro.
 */
export async function persistSecret(provider: ProviderId, plainValue: string): Promise<void> {
  const hadKey = Boolean(useSettingsStore.getState().keys[provider]);
  if (plainValue.trim()) {
    const payload = await encryptSecret(plainValue.trim());
    await putSecretRecord(provider, payload);
    useSettingsStore.getState().setKey(provider, plainValue.trim());
  } else if (hadKey) {
    await deleteSecretRecord(provider);
    useSettingsStore.getState().clearKey(provider);
  }
}

/**
 * Construye la cabecera `x-omni-config` para un panel en el momento exacto
 * del envío (lee el estado actual del store → si el usuario cambia de
 * modelo o de clave a mitad de conversación, la siguiente petición ya usa
 * la nueva configuración sin remontar el chat).
 */
export function buildConfigHeader(panelId: PanelId): string {
  const state = useSettingsStore.getState();
  const selection = panelId === 'a' ? state.panelA : state.panelB;
  return encodeConfigHeader({
    provider: selection.provider,
    model: selection.model,
    key: state.keys[selection.provider] ?? '',
    ollamaUrl: state.ollamaUrl,
    customBaseUrl: state.customBaseUrl,
  });
}

/** Contexto de disponibilidad de proveedores derivado del store. */
export function readinessFromState(state: SettingsState) {
  return {
    keys: state.keys,
    ollamaUrl: state.ollamaUrl,
    customBaseUrl: state.customBaseUrl,
    customModel: state.customModel,
    ollamaModelsCsv: state.ollamaModelsCsv,
  };
}
