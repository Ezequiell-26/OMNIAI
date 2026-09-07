'use client';

/**
 * PromptLibraryDialog — biblioteca de prompts guardados.
 * Inserta un prompt en el input del chat, crea nuevos o elimina existentes.
 * Persistencia: localStorage vía useAppStore (Local-First).
 */

import { useState } from 'react';
import { BookMarked, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store/use-app-store';

interface PromptLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Inserta el contenido del prompt en el input del chat. */
  onInsert: (content: string) => void;
}

export function PromptLibraryDialog({ open, onOpenChange, onInsert }: PromptLibraryDialogProps) {
  const savedPrompts = useAppStore((s) => s.savedPrompts);
  const upsertSavedPrompt = useAppStore((s) => s.upsertSavedPrompt);
  const deleteSavedPrompt = useAppStore((s) => s.deleteSavedPrompt);

  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');

  const handleSave = () => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast.error('Completa el título y el contenido.');
      return;
    }
    upsertSavedPrompt({
      id: crypto.randomUUID(),
      title: draftTitle.trim(),
      content: draftContent.trim(),
    });
    setDraftTitle('');
    setDraftContent('');
    setCreating(false);
    toast.success('Prompt guardado en tu biblioteca.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="size-4" aria-hidden />
            Biblioteca de prompts
          </DialogTitle>
          <DialogDescription>
            Guarda instrucciones que usas a menudo e insértalas con un clic.
          </DialogDescription>
        </DialogHeader>

        {creating ? (
          <div className="glass-card grid gap-3 rounded-xl p-4">
            <div>
              <Label htmlFor="prompt-title" className="mb-1 block text-xs text-muted-foreground">
                Título
              </Label>
              <Input
                id="prompt-title"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Revisor de código TypeScript"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="prompt-content" className="mb-1 block text-xs text-muted-foreground">
                Contenido
              </Label>
              <Textarea
                id="prompt-content"
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                placeholder="Actúa como revisor experto de TypeScript…"
                rows={5}
                maxLength={4000}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave}>
                Guardar prompt
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {savedPrompts.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <BookMarked className="size-6 opacity-40" aria-hidden />
                <p className="text-xs">Aún no has guardado ningún prompt.</p>
              </div>
            )}
            {savedPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="glass-card group flex items-start gap-2 rounded-xl p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{prompt.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {prompt.content}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => {
                      onInsert(prompt.content);
                      onOpenChange(false);
                      toast.success('Prompt insertado.');
                    }}
                  >
                    Insertar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Eliminar prompt ${prompt.title}`}
                    onClick={() => {
                      deleteSavedPrompt(prompt.id);
                      toast.info('Prompt eliminado.');
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="mt-1 w-full gap-1.5"
              onClick={() => setCreating(true)}
            >
              <Plus className="size-4" aria-hidden />
              Nuevo prompt
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
