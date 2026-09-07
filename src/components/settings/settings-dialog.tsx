'use client';

/**
 * SettingsDialog — centro de ajustes completo de OmniAI Studio.
 *
 * Pestañas: Proveedores (BYOK), Chat (parámetros), Personas, Skills, MCP,
 * Apariencia, Cuenta (sync) y Datos (export/import). Todo vive en un único
 * Dialog con navegación lateral (horizontal en móvil).
 */

import { useState } from 'react';
import {
  BarChart3,
  Database,
  Drama,
  KeyRound,
  Palette,
  Server,
  SlidersHorizontal,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProvidersPanel } from '@/components/settings/providers-panel';
import { ChatPanel } from '@/components/settings/chat-panel';
import { PersonasPanel } from '@/components/settings/personas-panel';
import { SkillsPanel } from '@/components/settings/skills-panel';
import { McpPanel } from '@/components/settings/mcp-panel';
import { AppearancePanel } from '@/components/settings/appearance-panel';
import { AccountPanel } from '@/components/settings/account-panel';
import { DataPanel } from '@/components/settings/data-panel';
import { UsagePanel } from '@/components/settings/usage-panel';
import { cn } from '@/lib/utils';

export type SettingsTab =
  | 'providers'
  | 'chat'
  | 'personas'
  | 'skills'
  | 'mcp'
  | 'appearance'
  | 'account'
  | 'usage'
  | 'data';

const TABS: Array<{ id: SettingsTab; label: string; icon: LucideIcon; hint: string }> = [
  { id: 'providers', label: 'Proveedores', icon: KeyRound, hint: 'Claves API BYOK' },
  { id: 'chat', label: 'Chat', icon: SlidersHorizontal, hint: 'Parámetros y prompt' },
  { id: 'personas', label: 'Personas', icon: Drama, hint: 'Instrucciones reutilizables' },
  { id: 'skills', label: 'Skills', icon: Zap, hint: 'Herramientas del modelo' },
  { id: 'mcp', label: 'MCP', icon: Server, hint: 'Servidores de contexto' },
  { id: 'appearance', label: 'Apariencia', icon: Palette, hint: 'Tema y acento' },
  { id: 'usage', label: 'Uso', icon: BarChart3, hint: 'Tokens y coste estimado' },
  { id: 'account', label: 'Cuenta', icon: UserRound, hint: 'Registro y sincronización' },
  { id: 'data', label: 'Datos', icon: Database, hint: 'Copia, importa, borra' },
];

const TAB_TITLES: Record<SettingsTab, { title: string; description: string }> = {
  providers: {
    title: 'Proveedores · Bring Your Own Key',
    description: 'OpenAI, Anthropic, Google Gemini, Ollama o tu propio endpoint.',
  },
  chat: {
    title: 'Parámetros de chat',
    description: 'Temperatura, límites de tokens y prompt de sistema.',
  },
  personas: {
    title: 'Personas',
    description: 'Instrucciones de sistema reutilizables que puedes activar al instante.',
  },
  skills: {
    title: 'Skills',
    description: 'Capacidades que el modelo puede invocar como herramientas.',
  },
  mcp: {
    title: 'Servidores MCP',
    description: 'Conecta herramientas externas vía Model Context Protocol.',
  },
  appearance: {
    title: 'Apariencia',
    description: 'Tema, acento, tipografía y comportamiento visual.',
  },
  usage: {
    title: 'Uso de tokens',
    description: 'Estadísticas locales: tokens consumidos y coste estimado por modelo.',
  },
  account: {
    title: 'Cuenta',
    description: 'Crea una cuenta opcional para sincronizar el historial entre dispositivos.',
  },
  data: {
    title: 'Datos y privacidad',
    description: 'Exporta, importa o elimina tu información local.',
  },
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pestaña solicitada desde fuera (se aplica al abrir). */
  initialTab?: SettingsTab;
}

export function SettingsDialog({ open, onOpenChange, initialTab }: SettingsDialogProps) {
  // El padre usa `key={tab}` para remontar y abrir siempre en `initialTab`.
  const [tab, setTab] = useState<SettingsTab>(initialTab ?? 'providers');

  const meta = TAB_TITLES[tab];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-hidden p-0 sm:max-w-3xl">
        <div className="flex max-h-[90dvh] flex-col">
          <DialogHeader className="border-b border-border/40 px-5 py-4">
            <DialogTitle className="text-base">{meta.title}</DialogTitle>
            <DialogDescription className="text-xs">{meta.description}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[190px_1fr]">
            {/* Navegación de pestañas */}
            <nav
              aria-label="Secciones de ajustes"
              className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/40 p-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-3"
            >
              {TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] outline-none transition-colors',
                      'focus-visible:ring-2 focus-visible:ring-ring/40',
                      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Contenido */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
              {tab === 'providers' && <ProvidersPanel />}
              {tab === 'chat' && <ChatPanel />}
              {tab === 'personas' && <PersonasPanel />}
              {tab === 'skills' && <SkillsPanel />}
              {tab === 'mcp' && <McpPanel />}
              {tab === 'appearance' && <AppearancePanel />}
              {tab === 'account' && <AccountPanel />}
              {tab === 'data' && <DataPanel />}
              {tab === 'usage' && <UsagePanel />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
