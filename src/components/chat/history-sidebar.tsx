'use client';

/**
 * HistorySidebar — historial local (IndexedDB) v2.
 * Novedades: buscador, renombrar, exportar (MD/JSON) y menú contextual.
 * Reutilizado en el aside de escritorio y en el Sheet móvil.
 */

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Download,
  FileJson,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { splitModelTag } from '@/lib/ai/catalog';
import { exportConversation } from '@/lib/export';
import type { Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HistorySidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onOpen: (conversation: Conversation) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
}

export function HistorySidebar({
  conversations,
  activeId,
  onOpen,
  onDelete,
  onNewChat,
  onRename,
}: HistorySidebarProps) {
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<Conversation | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        `${c.modelA} ${c.modelB ?? ''}`.toLowerCase().includes(q),
    );
  }, [conversations, query]);

  const startRename = (conversation: Conversation) => {
    setRenaming(conversation);
    setRenameDraft(conversation.title);
  };

  const commitRename = () => {
    if (renaming && renameDraft.trim()) {
      onRename(renaming.id, renameDraft.trim());
    }
    setRenaming(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-2 p-3">
        <Button onClick={onNewChat} className="w-full justify-start gap-2" variant="outline">
          <Plus className="size-4" aria-hidden />
          Nueva conversación
        </Button>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en el historial…"
            aria-label="Buscar conversaciones"
            className="h-9 bg-background/60 pl-8 text-xs"
          />
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-2 pb-3"
        role="list"
        aria-label="Historial de conversaciones"
      >
        {filtered.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 px-6 text-center text-muted-foreground">
            <MessageSquare className="size-6 opacity-40" aria-hidden />
            <p className="text-xs leading-relaxed">
              {query
                ? 'Sin resultados para tu búsqueda.'
                : 'Sin conversaciones todavía. Tu historial se guarda solo en este navegador.'}
            </p>
          </div>
        ) : (
          filtered.map((conversation) => {
            const { provider, model } = splitModelTag(conversation.modelA);
            const isActive = conversation.id === activeId;
            return (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onOpen(conversation)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(conversation);
                  }
                }}
                className={cn(
                  'group mb-1 cursor-pointer rounded-lg px-3 py-2.5 outline-none transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring/40',
                  isActive ? 'bg-accent' : 'hover:bg-accent/60',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{conversation.title}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 text-muted-foreground opacity-0 transition-all focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`Opciones de ${conversation.title}`}
                      >
                        <MoreVertical className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onSelect={() => startRename(conversation)}>
                        <Pencil className="size-3.5" aria-hidden />
                        Renombrar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => void exportConversation(conversation, 'md')}
                      >
                        <Download className="size-3.5" aria-hidden />
                        Exportar Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => void exportConversation(conversation, 'json')}
                      >
                        <FileJson className="size-3.5" aria-hidden />
                        Exportar JSON
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => onDelete(conversation.id)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <span className="shrink-0">
                    {formatDistanceToNow(new Date(conversation.updatedAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                  {conversation.mode === 'split' && (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal">
                      split
                    </Badge>
                  )}
                  <span className="min-w-0 truncate font-mono">{model || provider}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Renombrar conversación */}
      {renaming && (
        <div className="border-t border-border/40 p-3">
          <label htmlFor="rename-input" className="mb-1 block text-xs text-muted-foreground">
            Nuevo nombre
          </label>
          <div className="flex gap-1.5">
            <Input
              id="rename-input"
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitRename();
                if (event.key === 'Escape') setRenaming(null);
              }}
              autoFocus
              className="h-8 text-xs"
              maxLength={120}
            />
            <Button size="sm" className="h-8 px-2.5 text-xs" onClick={commitRename}>
              Guardar
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-border/40 p-3 text-[10px] leading-relaxed text-muted-foreground/60">
        <p>
          Almacenamiento local (IndexedDB). Con una cuenta puedes sincronizarlo entre
          dispositivos.
        </p>
      </div>
    </div>
  );
}
