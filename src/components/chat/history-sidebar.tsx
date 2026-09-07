'use client';

/**
 * HistorySidebar — historial de conversaciones 100 % local (IndexedDB).
 * Reutilizado en el aside de escritorio y en el Sheet móvil.
 */

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { splitModelTag } from '@/lib/ai/catalog';
import type { Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HistorySidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onOpen: (conversation: Conversation) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}

export function HistorySidebar({
  conversations,
  activeId,
  onOpen,
  onDelete,
  onNewChat,
}: HistorySidebarProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Button onClick={onNewChat} className="w-full justify-start gap-2" variant="outline">
          <Plus className="size-4" aria-hidden />
          Nueva conversación
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3" role="list" aria-label="Historial de conversaciones">
        {conversations.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 px-6 text-center text-muted-foreground">
            <MessageSquare className="size-6 opacity-40" aria-hidden />
            <p className="text-xs leading-relaxed">
              Sin conversaciones todavía. Tu historial se guarda solo en este navegador.
            </p>
          </div>
        ) : (
          conversations.map((conversation) => {
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
                  <button
                    type="button"
                    aria-label={`Eliminar conversación: ${conversation.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(conversation.id);
                    }}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
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

      <div className="border-t border-border/40 p-3 text-[10px] leading-relaxed text-muted-foreground/60">
        <p>Almacenamiento local (IndexedDB). Nada se envía a servidores de OmniAI Studio.</p>
      </div>
    </div>
  );
}
