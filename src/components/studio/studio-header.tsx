'use client';

/**
 * StudioHeader — barra superior v3: controles compactos, contraste mejorado
 * y una jerarquía visual más clara sin alterar la lógica del Studio.
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

export function StudioHeader({ onMenuClick, onOpenSettings, onOpenAccount, onOpenPalette, onNewChat }: StudioHeaderProps) {
  const splitMode = useSettingsStore((s) => s.splitMode);
  const toggleSplitMode = useSettingsStore((s) => s.toggleSplitMode);
  const panelA = useSettingsStore((s) => s.panelA);
  const panelB = useSettingsStore((s) => s.panelB);
  const setPanelSelection = useSettingsStore((s) => s.setPanelSelection);
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-border/50 bg-background/88 px-3 shadow-[0_1px_0_0_rgba(255,255,255,0.02)] backdrop-blur-md supports-[backdrop-filter]:bg-background/72 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground md:hidden" onClick={onMenuClick} aria-label="Abrir historial">
          <Menu className="size-4.5" />
        </Button>

        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border/60 bg-foreground text-background shadow-sm">
            <Sparkles className="relative z-10 size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[13px] font-semibold tracking-[-0.01em] sm:text-sm">OmniAI Studio</h1>
              <Badge variant="secondary" className="hidden rounded-md border border-border/50 bg-muted/60 px-1.5 py-0 font-mono text-[9px] font-medium text-muted-foreground sm:inline-flex">
                MIT · LOCAL-FIRST
              </Badge>
            </div>
            <p className="hidden truncate text-[10px] text-muted-foreground/70 md:block">Multi-model workspace</p>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 rounded-xl border border-border/50 bg-muted/25 p-1 shadow-sm">
        <div className="hidden items-center gap-1.5 px-1 lg:flex">
          {splitMode ? (
            <>
              <ModelSelector compact value={panelA} onChange={(selection) => setPanelSelection('a', selection)} onOpenSettings={onOpenSettings} />
              <span className="px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">vs</span>
              <ModelSelector compact align="end" value={panelB} onChange={(selection) => setPanelSelection('b', selection)} onOpenSettings={onOpenSettings} />
            </>
          ) : (
            <ModelSelector compact value={panelA} onChange={(selection) => setPanelSelection('a', selection)} onOpenSettings={onOpenSettings} />
          )}
        </div>

        <Button variant="ghost" size="sm" className="hidden h-8 gap-2 rounded-lg px-2.5 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground md:flex" onClick={onOpenPalette} aria-label="Abrir paleta de comandos" title="Paleta de comandos (Ctrl+K)">
          <Search className="size-3.5" aria-hidden />
          <span>Buscar</span>
          <kbd>Ctrl</kbd><kbd>K</kbd>
        </Button>
        <Button variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground md:hidden" onClick={onOpenPalette} aria-label="Buscar">
          <Search className="size-4" />
        </Button>

        <Button variant={splitMode ? 'secondary' : 'ghost'} size="icon" className="size-9 rounded-lg" onClick={toggleSplitMode} aria-pressed={splitMode} aria-label="Modo comparación (split-view)" title="Comparar dos modelos en paralelo">
          <Columns2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground" onClick={onNewChat} aria-label="Nueva conversación" title="Nueva conversación">
          <MessagesSquare className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground" onClick={onOpenAccount} aria-label={user ? `Cuenta: ${user.email}` : 'Cuenta y sincronización'} title={user ? `Sesión: ${user.email}` : 'Crea tu cuenta (opcional)'}>
          {user ? <span className="flex size-6 items-center justify-center rounded-full border border-border/60 bg-primary text-[10px] font-semibold text-primary-foreground">{(user.name ?? user.email).slice(0, 2).toUpperCase()}</span> : <UserRound className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground" onClick={onOpenSettings} aria-label="Abrir ajustes" title="Ajustes">
          <Settings2 className="size-4" />
        </Button>
      </div>
    </header>
  );
}
