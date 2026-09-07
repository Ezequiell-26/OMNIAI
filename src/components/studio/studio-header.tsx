'use client';

/**
 * StudioHeader — barra superior con logo, selector(es) de modelo,
 * toggle de split-view, nueva conversación y ajustes BYOK.
 */

import {
  Columns2,
  Menu,
  MessagesSquare,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModelSelector } from '@/components/chat/model-selector';
import { useSettingsStore } from '@/lib/store/use-settings-store';

interface StudioHeaderProps {
  onMenuClick: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
}

export function StudioHeader({ onMenuClick, onOpenSettings, onNewChat }: StudioHeaderProps) {
  const splitMode = useSettingsStore((s) => s.splitMode);
  const toggleSplitMode = useSettingsStore((s) => s.toggleSplitMode);
  const panelA = useSettingsStore((s) => s.panelA);
  const panelB = useSettingsStore((s) => s.panelB);
  const setPanelSelection = useSettingsStore((s) => s.setPanelSelection);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 px-3 backdrop-blur-xl md:px-4">
      {/* Menú móvil */}
      <Button
        variant="ghost"
        size="icon"
        className="size-10 md:hidden"
        onClick={onMenuClick}
        aria-label="Abrir historial"
      >
        <Menu className="size-5" />
      </Button>

      {/* Logo */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4" aria-hidden />
        </div>
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-sm font-semibold tracking-tight">OmniAI Studio</h1>
          <Badge
            variant="secondary"
            className="hidden shrink-0 rounded-sm px-1.5 py-0 font-mono text-[9px] font-normal text-muted-foreground sm:inline-flex"
          >
            MIT · Local-First
          </Badge>
        </div>
      </div>

      {/* Acciones */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Selectores de modelo (ocultos en móvil: se usan los del panel) */}
        {splitMode ? (
          <div className="hidden items-center gap-1.5 lg:flex">
            <ModelSelector
              compact
              value={panelA}
              onChange={(selection) => setPanelSelection('a', selection)}
              onOpenSettings={onOpenSettings}
            />
            <span className="text-[11px] text-muted-foreground">vs</span>
            <ModelSelector
              compact
              align="end"
              value={panelB}
              onChange={(selection) => setPanelSelection('b', selection)}
              onOpenSettings={onOpenSettings}
            />
          </div>
        ) : (
          <div className="hidden sm:block">
            <ModelSelector
              value={panelA}
              onChange={(selection) => setPanelSelection('a', selection)}
              onOpenSettings={onOpenSettings}
            />
          </div>
        )}

        <Button
          variant={splitMode ? 'secondary' : 'ghost'}
          size="icon"
          className="size-10"
          onClick={toggleSplitMode}
          aria-pressed={splitMode}
          aria-label="Modo comparación (split-view)"
          title="Comparar dos modelos en paralelo"
        >
          <Columns2 className="size-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={onNewChat}
          aria-label="Nueva conversación"
          title="Nueva conversación"
        >
          <MessagesSquare className="size-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={onOpenSettings}
          aria-label="Ajustes de claves API (BYOK)"
          title="Ajustes de claves API"
        >
          <Settings2 className="size-5" />
        </Button>
      </div>
    </header>
  );
}
