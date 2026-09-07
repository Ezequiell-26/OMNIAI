'use client';

/**
 * StudioHeader — barra superior v2: logo, selector(es) de modelo,
 * split-view, paleta de comandos (⌘K), nueva conversación, cuenta y ajustes.
 */

import { Columns2, Menu, MessagesSquare, Search, Settings2, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModelSelector } from '@/components/chat/model-selector';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import { useAuthStore } from '@/lib/store/use-auth-store';

interface StudioHeaderProps {
  onMenuClick: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenPalette: () => void;
  onNewChat: () => void;
}

export function StudioHeader({
  onMenuClick,
  onOpenSettings,
  onOpenAccount,
  onOpenPalette,
  onNewChat,
}: StudioHeaderProps) {
  const splitMode = useSettingsStore((s) => s.splitMode);
  const toggleSplitMode = useSettingsStore((s) => s.toggleSplitMode);
  const panelA = useSettingsStore((s) => s.panelA);
  const panelB = useSettingsStore((s) => s.panelB);
  const setPanelSelection = useSettingsStore((s) => s.setPanelSelection);

  const user = useAuthStore((s) => s.user);

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

        {/* Paleta de comandos */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden h-10 gap-2 px-3 text-xs text-muted-foreground md:flex"
          onClick={onOpenPalette}
          aria-label="Abrir paleta de comandos"
          title="Paleta de comandos (Ctrl+K)"
        >
          <Search className="size-4" aria-hidden />
          <kbd className="font-mono">Ctrl</kbd>
          <kbd className="font-mono">K</kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 md:hidden"
          onClick={onOpenPalette}
          aria-label="Buscar"
        >
          <Search className="size-5" />
        </Button>

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

        {/* Cuenta (avatar/estado) */}
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={onOpenAccount}
          aria-label={user ? `Cuenta: ${user.email}` : 'Cuenta y sincronización'}
          title={user ? `Sesión: ${user.email}` : 'Crea tu cuenta (opcional)'}
        >
          {user ? (
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/90 text-[11px] font-semibold text-primary-foreground">
              {(user.name ?? user.email).slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <UserRound className="size-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={onOpenSettings}
          aria-label="Abrir ajustes"
          title="Ajustes"
        >
          <Settings2 className="size-5" />
        </Button>
      </div>
    </header>
  );
}
