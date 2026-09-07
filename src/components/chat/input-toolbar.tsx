'use client';

/**
 * InputToolbar — barra de herramientas del input de chat.
 * - Skills: popover con interruptores de las skills integradas.
 * - Persona: desplegable para cambiar la persona activa al instante.
 * - Prompts: abre la biblioteca de prompts guardados.
 */

import {
  BookMarked,
  Drama,
  Paperclip,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { BUILTIN_SKILLS } from '@/lib/skills/registry';
import { useAppStore } from '@/lib/store/use-app-store';
import { cn } from '@/lib/utils';

interface InputToolbarProps {
  onOpenPrompts: () => void;
}

export function InputToolbar({ onOpenPrompts }: InputToolbarProps) {
  const builtinSkillIds = useAppStore((s) => s.builtinSkillIds);
  const toggleBuiltinSkill = useAppStore((s) => s.toggleBuiltinSkill);
  const personas = useAppStore((s) => s.personas);
  const personaId = useAppStore((s) => s.personaId);
  const setPersonaId = useAppStore((s) => s.setPersonaId);

  const activeSkills = builtinSkillIds.length;
  const activePersona = personas.find((p) => p.id === personaId) ?? null;

  return (
    <div className="flex shrink-0 items-center gap-0.5 self-start pb-1.5 pl-0.5">
      {/* Skills rápidas */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground',
              activeSkills > 0 && 'text-emerald-500/90',
            )}
            aria-label={`Herramientas activas: ${activeSkills}`}
            title="Skills del modelo"
          >
            <Zap className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">
              {activeSkills > 0 ? `${activeSkills} skill${activeSkills === 1 ? '' : 's'}` : 'Skills'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <p className="px-2 pb-1.5 pt-1 text-xs font-medium">Skills del modelo</p>
          <p className="px-2 pb-2 text-[11px] text-muted-foreground">
            Se ejecutan como herramientas reales en el servidor.
          </p>
          <div className="grid gap-0.5">
            {BUILTIN_SKILLS.map((skill) => {
              const active = builtinSkillIds.includes(skill.id);
              return (
                <label
                  key={skill.id}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">{skill.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {skill.description}
                    </span>
                  </span>
                  <Switch
                    checked={active}
                    onCheckedChange={() => toggleBuiltinSkill(skill.id)}
                    aria-label={`Activar ${skill.name}`}
                  />
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Persona rápida */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Persona activa"
          >
            <Drama className="size-3.5" aria-hidden />
            <span className="hidden max-w-28 truncate sm:inline">
              {activePersona ? activePersona.name : 'Sin persona'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Persona
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setPersonaId(null)}>
            <Paperclip className="size-3.5" aria-hidden />
            Sin persona (prompt por defecto)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {personas.map((persona) => (
            <DropdownMenuItem
              key={persona.id}
              onSelect={() => setPersonaId(persona.id)}
              className="gap-2"
            >
              <span aria-hidden>{persona.emoji}</span>
              <span className="min-w-0 flex-1 truncate">{persona.name}</span>
              {persona.id === personaId && (
                <span className="text-[10px] text-emerald-500">activa</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-0.5 h-4" />

      {/* Biblioteca de prompts */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onOpenPrompts}
        title="Biblioteca de prompts"
      >
        <BookMarked className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Prompts</span>
      </Button>
    </div>
  );
}
