'use client';

/**
 * AppearancePanel — personalización visual: tema, acento, tipografía,
 * anchura del chat e interruptores de comportamiento visual.
 */

import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ACCENTS } from '@/lib/appearance';
import {
  useAppStore,
  type AccentChoice,
  type ChatWidth,
  type FontSize,
  type ThemeChoice,
} from '@/lib/store/use-app-store';
import { cn } from '@/lib/utils';

const THEMES: Array<{ id: ThemeChoice; label: string; icon: typeof Sun }> = [
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'system', label: 'Sistema', icon: Monitor },
];

const FONT_SIZES: Array<{ id: FontSize; label: string }> = [
  { id: 'sm', label: 'Pequeño' },
  { id: 'md', label: 'Medio' },
  { id: 'lg', label: 'Grande' },
];

const WIDTHS: Array<{ id: ChatWidth; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'wide', label: 'Amplia' },
  { id: 'full', label: 'Completa' },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: T; label: string; icon?: typeof Sun }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.id;
        return (
          <Button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            onClick={() => onChange(option.id)}
            className={cn(
              'h-8 gap-1.5 border border-border/50 text-xs',
              active && 'border-primary/50',
            )}
          >
            {Icon && <Icon className="size-3.5" aria-hidden />}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export function AppearancePanel() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const accent = useAppStore((s) => s.accent);
  const setAccent = useAppStore((s) => s.setAccent);
  const fontSize = useAppStore((s) => s.fontSize);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const chatWidth = useAppStore((s) => s.chatWidth);
  const setChatWidth = useAppStore((s) => s.setChatWidth);
  const showTokenBadges = useAppStore((s) => s.showTokenBadges);
  const setShowTokenBadges = useAppStore((s) => s.setShowTokenBadges);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const setAnimationsEnabled = useAppStore((s) => s.setAnimationsEnabled);
  const sendOnEnter = useAppStore((s) => s.sendOnEnter);
  const setSendOnEnter = useAppStore((s) => s.setSendOnEnter);

  return (
    <div className="grid gap-4">
      {/* Tema */}
      <div className="glass-card rounded-xl p-4">
        <Label className="text-sm">Tema</Label>
        <p className="mb-2.5 mt-0.5 text-xs text-muted-foreground">
          El modo oscuro es el estilo por defecto de OmniAI Studio.
        </p>
        <Segmented options={THEMES} value={theme} onChange={setTheme} ariaLabel="Elegir tema" />
      </div>

      {/* Acento */}
      <div className="glass-card rounded-xl p-4">
        <Label className="text-sm">Color de acento</Label>
        <p className="mb-2.5 mt-0.5 text-xs text-muted-foreground">
          Personaliza botones, enlaces y detalles de la interfaz.
        </p>
        <div role="radiogroup" aria-label="Elegir color de acento" className="flex flex-wrap gap-2">
          {ACCENTS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={accent === option.id}
              aria-label={`Acento ${option.label}`}
              title={option.label}
              onClick={() => setAccent(option.id)}
              className={cn(
                'size-8 rounded-full border-2 transition-transform hover:scale-110',
                accent === option.id ? 'border-foreground' : 'border-transparent',
              )}
              style={{ background: option.dark.primary }}
            />
          ))}
        </div>
      </div>

      {/* Tipografía y anchura */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-xl p-4">
          <Label className="text-sm">Tamaño de letra</Label>
          <div className="mt-2.5">
            <Segmented
              options={FONT_SIZES}
              value={fontSize}
              onChange={setFontSize}
              ariaLabel="Elegir tamaño de letra"
            />
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <Label className="text-sm">Anchura del chat</Label>
          <div className="mt-2.5">
            <Segmented
              options={WIDTHS}
              value={chatWidth}
              onChange={setChatWidth}
              ariaLabel="Elegir anchura del chat"
            />
          </div>
        </div>
      </div>

      {/* Interruptores */}
      <div className="glass-card grid gap-3 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="opt-badges" className="text-sm">
              Insignias de tokens y coste
            </Label>
            <p className="text-xs text-muted-foreground">
              Muestra la estimación bajo cada mensaje.
            </p>
          </div>
          <Switch
            id="opt-badges"
            checked={showTokenBadges}
            onCheckedChange={setShowTokenBadges}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="opt-anim" className="text-sm">
              Animaciones
            </Label>
            <p className="text-xs text-muted-foreground">
              Transiciones suaves al aparecer mensajes (Framer Motion).
            </p>
          </div>
          <Switch id="opt-anim" checked={animationsEnabled} onCheckedChange={setAnimationsEnabled} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="opt-enter" className="text-sm">
              Enter para enviar
            </Label>
            <p className="text-xs text-muted-foreground">
              Si lo desactivas, usa el botón o Ctrl+Enter para enviar.
            </p>
          </div>
          <Switch id="opt-enter" checked={sendOnEnter} onCheckedChange={setSendOnEnter} />
        </div>
      </div>
    </div>
  );
}
