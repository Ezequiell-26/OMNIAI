'use client';

/**
 * PersonasPanel — gestión de personas (system prompts reutilizables).
 *
 * - Lista de personas con activación ("Usar" / "Quitar"), edición y borrado.
 * - Diálogo de creación/edición (emoji, nombre, instrucciones).
 * - Prompt personalizado de reserva, aplicado cuando no hay persona activa.
 */

import { useState } from 'react';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore, type Persona } from '@/lib/store/use-app-store';
import { cn } from '@/lib/utils';

/** Borrador del formulario (id = null → nueva persona). */
interface PersonaDraft {
  id: string | null;
  emoji: string;
  name: string;
  prompt: string;
}

const EMPTY_DRAFT: PersonaDraft = { id: null, emoji: '🧩', name: '', prompt: '' };

export function PersonasPanel() {
  const personas = useAppStore((s) => s.personas);
  const personaId = useAppStore((s) => s.personaId);
  const setPersonaId = useAppStore((s) => s.setPersonaId);
  const upsertPersona = useAppStore((s) => s.upsertPersona);
  const deletePersona = useAppStore((s) => s.deletePersona);
  const customSystemPrompt = useAppStore((s) => s.customSystemPrompt);
  const setCustomSystemPrompt = useAppStore((s) => s.setCustomSystemPrompt);

  /** Persona en edición/creación (null = diálogo cerrado). */
  const [draft, setDraft] = useState<PersonaDraft | null>(null);
  /** Id de persona marcada para borrar (patrón de confirmación por doble clic). */
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);

  const handleSavePersona = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast.error('Ponle un nombre a la persona');
      return;
    }
    upsertPersona({
      id: draft.id ?? crypto.randomUUID(),
      name,
      emoji: draft.emoji.trim() || '🧩',
      prompt: draft.prompt.trim(),
    });
    toast.success('Persona guardada');
    setDraft(null);
  };

  /** Primer clic arma el borrado; el segundo confirma. Se desarma solo a los 3 s. */
  const handleDeletePersona = (persona: Persona) => {
    if (armedDeleteId === persona.id) {
      deletePersona(persona.id);
      setArmedDeleteId(null);
      toast.info(`Persona «${persona.name}» eliminada`);
      return;
    }
    setArmedDeleteId(persona.id);
    window.setTimeout(() => {
      setArmedDeleteId((current) => (current === persona.id ? null : current));
    }, 3000);
  };

  return (
    <div className="grid gap-4">
      {/* Cabecera de sección */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <UserRound className="size-4 text-muted-foreground" aria-hidden />
            Personas
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Instrucciones de sistema reutilizables que definen el comportamiento del modelo.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
        >
          <Plus className="size-3.5" aria-hidden />
          Nueva persona
        </Button>
      </div>

      {/* Lista de personas */}
      {personas.length === 0 ? (
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no hay personas. Crea una para darle un rol fijo al modelo.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {personas.map((persona) => {
            const isActive = personaId === persona.id;
            return (
              <div key={persona.id} className="glass-card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none" aria-hidden>
                        {persona.emoji}
                      </span>
                      <span className="truncate text-sm font-medium">{persona.name}</span>
                      {isActive && (
                        <Badge
                          variant="outline"
                          className="rounded-sm border-emerald-500/30 px-1.5 text-[9px] font-normal text-emerald-400"
                        >
                          activa
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {persona.prompt || 'Sin instrucciones.'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant={isActive ? 'secondary' : 'outline'}
                      className="h-8 gap-1.5 px-2.5 text-xs"
                      onClick={() => {
                        if (isActive) {
                          setPersonaId(null);
                          toast.info('Persona desactivada: se usará el prompt por defecto.');
                        } else {
                          setPersonaId(persona.id);
                          toast.success(`Persona «${persona.name}» activada`);
                        }
                      }}
                    >
                      {isActive ? 'Quitar' : 'Usar'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Editar persona ${persona.name}`}
                      onClick={() =>
                        setDraft({
                          id: persona.id,
                          emoji: persona.emoji,
                          name: persona.name,
                          prompt: persona.prompt,
                        })
                      }
                    >
                      <Pencil className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-8 text-muted-foreground hover:text-destructive',
                        armedDeleteId === persona.id &&
                          'bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive',
                      )}
                      aria-label={
                        armedDeleteId === persona.id
                          ? `Confirmar eliminación de ${persona.name}`
                          : `Eliminar persona ${persona.name}`
                      }
                      title={
                        armedDeleteId === persona.id
                          ? 'Pulsa de nuevo para confirmar'
                          : 'Eliminar (2 clics)'
                      }
                      onClick={() => handleDeletePersona(persona)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prompt personalizado sin persona */}
      <div className="glass-card rounded-xl p-4">
        <Label htmlFor="custom-system-prompt" className="text-sm">
          Prompt personalizado (sin persona)
        </Label>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Solo se aplica cuando no hay ninguna persona activa.
        </p>
        <Textarea
          id="custom-system-prompt"
          value={customSystemPrompt}
          onChange={(event) => setCustomSystemPrompt(event.target.value)}
          rows={4}
          placeholder="Ej.: Responde siempre en español neutro y sé conciso."
          className="mt-2 min-h-20 resize-y text-xs"
        />
      </div>

      {/* Diálogo crear/editar persona */}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Editar persona' : 'Nueva persona'}</DialogTitle>
            <DialogDescription>
              Define un rol fijo: se enviará como prompt de sistema en cada mensaje del chat.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-1">
            <div className="grid grid-cols-[5rem_1fr] gap-2">
              <div>
                <Label htmlFor="persona-emoji" className="mb-1 block text-xs text-muted-foreground">
                  Emoji
                </Label>
                <Input
                  id="persona-emoji"
                  value={draft?.emoji ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => (prev ? { ...prev, emoji: event.target.value } : prev))
                  }
                  maxLength={4}
                  className="h-9 text-center text-lg"
                  aria-label="Emoji de la persona"
                />
              </div>
              <div>
                <Label htmlFor="persona-name" className="mb-1 block text-xs text-muted-foreground">
                  Nombre
                </Label>
                <Input
                  id="persona-name"
                  value={draft?.name ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                  }
                  placeholder="Ej.: Revisor de código"
                  autoComplete="off"
                  className="h-9"
                  aria-label="Nombre de la persona"
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="persona-prompt"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Instrucciones
              </Label>
              <Textarea
                id="persona-prompt"
                value={draft?.prompt ?? ''}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, prompt: event.target.value } : prev))
                }
                rows={5}
                placeholder="Describe cómo debe comportarse el modelo…"
                className="resize-y text-xs"
                aria-label="Instrucciones de sistema de la persona"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSavePersona}>
              Guardar persona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
