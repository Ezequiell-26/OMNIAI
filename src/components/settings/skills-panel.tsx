'use client';

/**
 * SkillsPanel — activación de skills integradas y gestión de skills personalizadas.
 *
 * - Skills integradas: herramientas reales ejecutadas en el servidor
 *   (web_search, page_reader, image_gen, clock, calculator).
 * - Skills personalizadas: instrucciones que se inyectan en el prompt del sistema.
 */

import { useState } from 'react';
import {
  Calculator,
  Clock,
  Globe,
  Image as ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BUILTIN_SKILLS, type BuiltinSkillDef } from '@/lib/skills/registry';
import { useAppStore, type CustomSkill } from '@/lib/store/use-app-store';
import { cn } from '@/lib/utils';

/** Mapa de iconos declarado en el registro de skills integradas. */
const SKILL_ICONS: Record<BuiltinSkillDef['icon'], LucideIcon> = {
  Search,
  Globe,
  ImageIcon,
  Clock,
  Calculator,
};

/** Borrador del formulario (id = null → nueva skill). */
interface SkillDraft {
  id: string | null;
  name: string;
  description: string;
  instructions: string;
}

const EMPTY_DRAFT: SkillDraft = { id: null, name: '', description: '', instructions: '' };

export function SkillsPanel() {
  const builtinSkillIds = useAppStore((s) => s.builtinSkillIds);
  const toggleBuiltinSkill = useAppStore((s) => s.toggleBuiltinSkill);
  const customSkills = useAppStore((s) => s.customSkills);
  const toggleCustomSkill = useAppStore((s) => s.toggleCustomSkill);
  const upsertCustomSkill = useAppStore((s) => s.upsertCustomSkill);
  const deleteCustomSkill = useAppStore((s) => s.deleteCustomSkill);

  /** Skill en edición/creación (null = diálogo cerrado). */
  const [draft, setDraft] = useState<SkillDraft | null>(null);
  /** Id de skill marcada para borrar (confirmación por doble clic). */
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);

  const handleSaveSkill = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast.error('Ponle un nombre a la skill');
      return;
    }
    const skill: CustomSkill = {
      id: draft.id ?? crypto.randomUUID(),
      name,
      description: draft.description.trim(),
      instructions: draft.instructions.trim(),
      enabled: draft.id ? (customSkills.find((s) => s.id === draft.id)?.enabled ?? true) : true,
    };
    upsertCustomSkill(skill);
    toast.success('Skill guardada');
    setDraft(null);
  };

  /** Primer clic arma el borrado; el segundo confirma. Se desarma solo a los 3 s. */
  const handleDeleteSkill = (skill: CustomSkill) => {
    if (armedDeleteId === skill.id) {
      deleteCustomSkill(skill.id);
      setArmedDeleteId(null);
      toast.info(`Skill «${skill.name}» eliminada`);
      return;
    }
    setArmedDeleteId(skill.id);
    window.setTimeout(() => {
      setArmedDeleteId((current) => (current === skill.id ? null : current));
    }, 3000);
  };

  return (
    <div className="grid gap-4">
      {/* ── Skills integradas ─────────────────────────────────────────────── */}
      <div className="grid gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Wand2 className="size-4 text-muted-foreground" aria-hidden />
            Skills integradas
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Herramientas reales que el modelo puede invocar durante la conversación.
          </p>
        </div>

        {BUILTIN_SKILLS.map((skill) => {
          const Icon = SKILL_ICONS[skill.icon];
          const checked = builtinSkillIds.includes(skill.id);
          return (
            <div
              key={skill.id}
              className="glass-card flex items-center justify-between gap-3 rounded-xl p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/60">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{skill.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {skill.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={checked}
                onCheckedChange={() => toggleBuiltinSkill(skill.id)}
                aria-label={`${checked ? 'Desactivar' : 'Activar'} skill ${skill.name}`}
              />
            </div>
          );
        })}
      </div>

      <Separator className="bg-border/40" />

      {/* ── Skills personalizadas ─────────────────────────────────────────── */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">Skills personalizadas</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Instrucciones propias que se añaden al prompt del sistema.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setDraft({ ...EMPTY_DRAFT })}
          >
            <Plus className="size-3.5" aria-hidden />
            Nueva skill
          </Button>
        </div>

        {customSkills.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Todavía no hay skills personalizadas. Crea una para enseñar al modelo un hábito
              o formato propio.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {customSkills.map((skill) => (
              <div key={skill.id} className="glass-card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{skill.name}</span>
                      {skill.enabled && (
                        <Badge
                          variant="outline"
                          className="rounded-sm border-emerald-500/30 px-1.5 text-[9px] font-normal text-emerald-400"
                        >
                          activa
                        </Badge>
                      )}
                    </div>
                    {skill.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {skill.description}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/70">
                      {skill.instructions || 'Sin instrucciones.'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={skill.enabled}
                      onCheckedChange={() => toggleCustomSkill(skill.id)}
                      aria-label={`${skill.enabled ? 'Desactivar' : 'Activar'} skill ${skill.name}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Editar skill ${skill.name}`}
                      onClick={() =>
                        setDraft({
                          id: skill.id,
                          name: skill.name,
                          description: skill.description,
                          instructions: skill.instructions,
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
                        armedDeleteId === skill.id &&
                          'bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive',
                      )}
                      aria-label={
                        armedDeleteId === skill.id
                          ? `Confirmar eliminación de ${skill.name}`
                          : `Eliminar skill ${skill.name}`
                      }
                      title={
                        armedDeleteId === skill.id
                          ? 'Pulsa de nuevo para confirmar'
                          : 'Eliminar (2 clics)'
                      }
                      onClick={() => handleDeleteSkill(skill)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground/70">
        Las skills integradas se ejecutan como herramientas reales en el servidor. Las
        personalizadas inyectan instrucciones en el prompt del sistema.
      </p>

      {/* Diálogo crear/editar skill */}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Editar skill' : 'Nueva skill'}</DialogTitle>
            <DialogDescription>
              Las instrucciones se inyectarán en el prompt del sistema cuando la skill esté
              activa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-1">
            <div>
              <Label htmlFor="skill-name" className="mb-1 block text-xs text-muted-foreground">
                Nombre
              </Label>
              <Input
                id="skill-name"
                value={draft?.name ?? ''}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
                placeholder="Ej.: Estilo telegráfico"
                autoComplete="off"
                className="h-9"
                aria-label="Nombre de la skill"
              />
            </div>
            <div>
              <Label
                htmlFor="skill-description"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Descripción
              </Label>
              <Input
                id="skill-description"
                value={draft?.description ?? ''}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                }
                placeholder="Ej.: Respuestas ultracortas, sin adornos"
                autoComplete="off"
                className="h-9"
                aria-label="Descripción de la skill"
              />
            </div>
            <div>
              <Label
                htmlFor="skill-instructions"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Instrucciones
              </Label>
              <Textarea
                id="skill-instructions"
                value={draft?.instructions ?? ''}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))
                }
                rows={5}
                placeholder="Estas instrucciones se inyectarán en el prompt del sistema cuando la skill esté activa. Ej.: «Usa frases de máximo 12 palabras y evita adjetivos»."
                className="resize-y text-xs"
                aria-label="Instrucciones de la skill"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveSkill}>
              Guardar skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
