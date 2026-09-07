'use client';

/**
 * CommandPalette — paleta de comandos (⌘K / Ctrl+K).
 * Busca conversaciones y ejecuta acciones globales: nueva conversación,
 * alternar split, cambiar tema, abrir ajustes en una pestaña concreta.
 * El filtrado por texto lo resuelve cmdk de forma nativa.
 */

import {
  Columns2,
  Database,
  MessageSquare,
  Moon,
  Palette,
  Plus,
  Server,
  Settings2,
  Sun,
  UserRound,
  Zap,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import type { SettingsTab } from '@/components/settings/settings-dialog';
import { useAppStore } from '@/lib/store/use-app-store';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import type { Conversation } from '@/lib/types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  onNewChat: () => void;
  onOpenConversation: (conversation: Conversation) => void;
  onOpenSettings: (tab: SettingsTab) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  conversations,
  onNewChat,
  onOpenConversation,
  onOpenSettings,
}: CommandPaletteProps) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const run = (action: () => void) => {
    onOpenChange(false);
    // Deja que el Dialog termine de cerrarse antes de ejecutar la acción.
    window.setTimeout(action, 50);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar conversaciones o ejecutar una acción…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Acciones">
          <CommandItem
            onSelect={() =>
              run(() => {
                onNewChat();
              })
            }
          >
            <Plus className="size-4" aria-hidden />
            Nueva conversación
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                useSettingsStore.getState().toggleSplitMode();
              })
            }
          >
            <Columns2 className="size-4" aria-hidden />
            Alternar modo comparación (split)
          </CommandItem>
          <CommandItem
            value={`tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? (
              <Sun className="size-4" aria-hidden />
            ) : (
              <Moon className="size-4" aria-hidden />
            )}
            Cambiar a tema {theme === 'dark' ? 'claro' : 'oscuro'}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ajustes">
          <CommandItem onSelect={() => run(() => onOpenSettings('providers'))}>
            <Settings2 className="size-4" aria-hidden />
            Ajustes · Proveedores
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenSettings('skills'))}>
            <Zap className="size-4" aria-hidden />
            Ajustes · Skills
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenSettings('mcp'))}>
            <Server className="size-4" aria-hidden />
            Ajustes · MCP
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenSettings('appearance'))}>
            <Palette className="size-4" aria-hidden />
            Ajustes · Apariencia
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenSettings('account'))}>
            <UserRound className="size-4" aria-hidden />
            Ajustes · Cuenta
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenSettings('data'))}>
            <Database className="size-4" aria-hidden />
            Ajustes · Datos
          </CommandItem>
        </CommandGroup>

        {conversations.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Conversaciones">
              {conversations.slice(0, 60).map((conversation) => (
                <CommandItem
                  key={conversation.id}
                  value={conversation.title}
                  onSelect={() =>
                    run(() => {
                      onOpenConversation(conversation);
                    })
                  }
                >
                  <MessageSquare className="size-4" aria-hidden />
                  <span className="truncate">{conversation.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
