/**
 * useAppStore — personalización global de OmniAI Studio (Zustand + persist).
 *
 * Guarda SOLO preferencias no sensibles en localStorage:
 * - Apariencia (tema, acento, tipografía, anchura, animaciones…)
 * - Parámetros de chat (temperatura, topP, maxTokens)
 * - Personas (system prompts reutilizables)
 * - Skills (integradas activadas + skills personalizadas)
 * - Servidores MCP (URL y headers; los headers pueden contener tokens
 *   del propio usuario → permanecen en el navegador, igual que las BYOK)
 * - Biblioteca de prompts guardados
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuiltinSkillId } from '@/lib/skills/registry';

/* ── Tipos ──────────────────────────────────────────────────────────────── */

export type ThemeChoice = 'dark' | 'light' | 'system';
export type AccentChoice = 'zinc' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'orange';
export type FontSize = 'sm' | 'md' | 'lg';
export type ChatWidth = 'normal' | 'wide' | 'full';

/** Persona = instrucciones de sistema reutilizables. */
export interface Persona {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
}

/** Skill personalizada: inyecta instrucciones en el prompt del sistema. */
export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
}

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema?: unknown;
}

export interface McpServer {
  id: string;
  name: string;
  transport: 'http' | 'sse';
  url: string;
  /** JSON con headers extra (Authorization, …). Nunca sale del navegador. */
  headersJson: string;
  enabled: boolean;
  /** Cache de `tools/list` tras el último test. */
  tools: McpToolInfo[];
  lastError?: string;
  lastTestedAt?: string;
}

/** Prompt guardado en la biblioteca. */
export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
}

/* ── Estado ─────────────────────────────────────────────────────────────── */

interface AppState {
  // Apariencia
  theme: ThemeChoice;
  accent: AccentChoice;
  fontSize: FontSize;
  chatWidth: ChatWidth;
  showTokenBadges: boolean;
  animationsEnabled: boolean;
  sendOnEnter: boolean;

  // Parámetros de chat
  temperature: number; // 0–2
  topP: number; // 0–1
  maxTokens: number; // 0 = automático
  autoTitle: boolean;

  // Personas
  personas: Persona[];
  personaId: string | null; // persona activa (null = prompt por defecto)
  customSystemPrompt: string; // usado cuando personaId === null

  // Skills
  builtinSkillIds: BuiltinSkillId[];
  customSkills: CustomSkill[];

  // MCP
  mcpServers: McpServer[];

  // Biblioteca de prompts
  savedPrompts: SavedPrompt[];

  // Acciones apariencia / chat
  setTheme: (theme: ThemeChoice) => void;
  setAccent: (accent: AccentChoice) => void;
  setFontSize: (size: FontSize) => void;
  setChatWidth: (width: ChatWidth) => void;
  setShowTokenBadges: (v: boolean) => void;
  setAnimationsEnabled: (v: boolean) => void;
  setSendOnEnter: (v: boolean) => void;
  setTemperature: (v: number) => void;
  setTopP: (v: number) => void;
  setMaxTokens: (v: number) => void;
  setAutoTitle: (v: boolean) => void;

  // Acciones personas
  upsertPersona: (persona: Persona) => void;
  deletePersona: (id: string) => void;
  setPersonaId: (id: string | null) => void;
  setCustomSystemPrompt: (v: string) => void;

  // Acciones skills
  toggleBuiltinSkill: (id: BuiltinSkillId) => void;
  upsertCustomSkill: (skill: CustomSkill) => void;
  deleteCustomSkill: (id: string) => void;
  toggleCustomSkill: (id: string) => void;

  // Acciones MCP
  upsertMcpServer: (server: McpServer) => void;
  deleteMcpServer: (id: string) => void;
  toggleMcpServer: (id: string) => void;

  // Acciones prompts
  upsertSavedPrompt: (prompt: SavedPrompt) => void;
  deleteSavedPrompt: (id: string) => void;
}

/* ── Personas de fábrica ────────────────────────────────────────────────── */

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'dev',
    name: 'Ingeniero Senior',
    emoji: '💻',
    prompt:
      'Eres un ingeniero de software senior. Prioriza código correcto, idiomático y bien tipado. Explica decisiones clave en 2-3 frases y sugiere alternativas cuando aporten valor real. Responde en Markdown con bloques de código cercados.',
  },
  {
    id: 'writer',
    name: 'Editor de textos',
    emoji: '✍️',
    prompt:
      'Eres un editor profesional. Mejora claridad, ritmo y tono del texto del usuario sin cambiar su voz. Señala los cambios más importantes con una breve lista al final. Responde en Markdown.',
  },
  {
    id: 'teacher',
    name: 'Profesor paciente',
    emoji: '🎓',
    prompt:
      'Eres un profesor infinitamente paciente. Explica con analogías sencillas, del concepto al detalle, y comprueba la comprensión con una pregunta corta al final. Responde en Markdown.',
  },
  {
    id: 'analyst',
    name: 'Analista crítico',
    emoji: '📊',
    prompt:
      'Eres un analista escéptico y riguroso. Estructura tus respuestas en: resumen ejecutivo, evidencia a favor, evidencia en contra y conclusión. Cita supuestos explícitos y marca la incertidumbre. Responde en Markdown.',
  },
];

/* ── Store ──────────────────────────────────────────────────────────────── */

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Apariencia
      theme: 'dark',
      accent: 'emerald',
      fontSize: 'md',
      chatWidth: 'normal',
      showTokenBadges: true,
      animationsEnabled: true,
      sendOnEnter: true,

      // Chat
      temperature: 0.7,
      topP: 1,
      maxTokens: 0,
      autoTitle: true,

      // Personas
      personas: DEFAULT_PERSONAS,
      personaId: null,
      customSystemPrompt: '',

      // Skills: búsqueda web activada por defecto
      builtinSkillIds: ['web_search'],
      customSkills: [],

      // MCP: servidor Studio integrado preconfigurado
      mcpServers: [
        {
          id: 'builtin-studio',
          name: 'Studio MCP (integrado)',
          transport: 'http',
          url: 'builtin://studio',
          headersJson: '',
          enabled: false,
          tools: [],
        },
      ],

      // Prompts
      savedPrompts: [],

      // ── Acciones ──
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setFontSize: (fontSize) => set({ fontSize }),
      setChatWidth: (chatWidth) => set({ chatWidth }),
      setShowTokenBadges: (showTokenBadges) => set({ showTokenBadges }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setSendOnEnter: (sendOnEnter) => set({ sendOnEnter }),
      setTemperature: (temperature) => set({ temperature }),
      setTopP: (topP) => set({ topP }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      setAutoTitle: (autoTitle) => set({ autoTitle }),

      upsertPersona: (persona) =>
        set((state) => ({
          personas: [persona, ...state.personas.filter((p) => p.id !== persona.id)],
        })),
      deletePersona: (id) =>
        set((state) => ({
          personas: state.personas.filter((p) => p.id !== id),
          personaId: state.personaId === id ? null : state.personaId,
        })),
      setPersonaId: (personaId) => set({ personaId }),
      setCustomSystemPrompt: (customSystemPrompt) => set({ customSystemPrompt }),

      toggleBuiltinSkill: (id) =>
        set((state) => ({
          builtinSkillIds: state.builtinSkillIds.includes(id)
            ? state.builtinSkillIds.filter((s) => s !== id)
            : [...state.builtinSkillIds, id],
        })),
      upsertCustomSkill: (skill) =>
        set((state) => ({
          customSkills: [skill, ...state.customSkills.filter((s) => s.id !== skill.id)],
        })),
      deleteCustomSkill: (id) =>
        set((state) => ({ customSkills: state.customSkills.filter((s) => s.id !== id) })),
      toggleCustomSkill: (id) =>
        set((state) => ({
          customSkills: state.customSkills.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s,
          ),
        })),

      upsertMcpServer: (server) =>
        set((state) => ({
          mcpServers: [server, ...state.mcpServers.filter((s) => s.id !== server.id)],
        })),
      deleteMcpServer: (id) =>
        set((state) => ({ mcpServers: state.mcpServers.filter((s) => s.id !== id) })),
      toggleMcpServer: (id) =>
        set((state) => ({
          mcpServers: state.mcpServers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
        })),

      upsertSavedPrompt: (prompt) =>
        set((state) => ({
          savedPrompts: [prompt, ...state.savedPrompts.filter((p) => p.id !== prompt.id)],
        })),
      deleteSavedPrompt: (id) =>
        set((state) => ({ savedPrompts: state.savedPrompts.filter((p) => p.id !== id) })),
    }),
    {
      name: 'omniai-app',
      version: 1,
    },
  ),
);

/** Persona activa resuelta (o null). */
export function activePersona(state: AppState): Persona | null {
  if (!state.personaId) return null;
  return state.personas.find((p) => p.id === state.personaId) ?? null;
}
