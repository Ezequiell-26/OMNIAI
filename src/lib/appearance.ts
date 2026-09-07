/**
 * Apariencia — definición de acentos y sincronización con el DOM.
 *
 * El acento sobreescribe las variables CSS `--primary`, `--primary-foreground`
 * y `--ring` con estilo inline en <html> (mayor especificidad que :root y
 * .dark). El tema alterna la clase `dark`/`light`; el tamaño de letra usa
 * `data-omni-font` (ver globals.css).
 */

import type { AccentChoice, FontSize, ThemeChoice } from '@/lib/store/use-app-store';

export interface AccentDef {
  id: AccentChoice;
  label: string;
  /** Valores para el tema oscuro. */
  dark: { primary: string; foreground: string; ring: string };
  /** Valores para el tema claro. */
  light: { primary: string; foreground: string; ring: string };
}

export const ACCENTS: AccentDef[] = [
  {
    id: 'zinc',
    label: 'Grafito',
    dark: { primary: 'oklch(0.922 0 0)', foreground: 'oklch(0.205 0 0)', ring: 'oklch(0.556 0 0)' },
    light: { primary: 'oklch(0.205 0 0)', foreground: 'oklch(0.985 0 0)', ring: 'oklch(0.708 0 0)' },
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    dark: {
      primary: 'oklch(0.696 0.17 162.48)',
      foreground: 'oklch(0.145 0 0)',
      ring: 'oklch(0.6 0.15 162.48)',
    },
    light: {
      primary: 'oklch(0.508 0.118 165.612)',
      foreground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.55 0.12 165)',
    },
  },
  {
    id: 'violet',
    label: 'Violeta',
    dark: {
      primary: 'oklch(0.606 0.25 292.72)',
      foreground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.55 0.22 292.72)',
    },
    light: {
      primary: 'oklch(0.541 0.281 293.009)',
      foreground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.5 0.24 293)',
    },
  },
  {
    id: 'amber',
    label: 'Ámbar',
    dark: {
      primary: 'oklch(0.769 0.188 70.08)',
      foreground: 'oklch(0.205 0 0)',
      ring: 'oklch(0.7 0.17 70.08)',
    },
    light: {
      primary: 'oklch(0.666 0.179 58.318)',
      foreground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.6 0.16 60)',
    },
  },
  {
    id: 'rose',
    label: 'Rosa',
    dark: {
      primary: 'oklch(0.645 0.246 16.439)',
      foreground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.586 0.253 17.585)',
    },
    light: {
      primary: 'oklch(0.586 0.253 17.585)',
      foreground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.55 0.22 17.585)',
    },
  },
  {
    id: 'cyan',
    label: 'Cian',
    dark: {
      primary: 'oklch(0.715 0.143 215.22)',
      foreground: 'oklch(0.145 0 0)',
      ring: 'oklch(0.6 0.13 215.22)',
    },
    light: {
      primary: 'oklch(0.601 0.126 221.723)',
      foreground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.55 0.11 221)',
    },
  },
  {
    id: 'orange',
    label: 'Naranja',
    dark: {
      primary: 'oklch(0.705 0.213 47.604)',
      foreground: 'oklch(0.145 0 0)',
      ring: 'oklch(0.646 0.222 41.116)',
    },
    light: {
      primary: 'oklch(0.646 0.222 41.116)',
      foreground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.6 0.2 45)',
    },
  },
];

export function accentById(id: AccentChoice): AccentDef {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

function resolveIsDark(theme: ThemeChoice): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Aplica tema + acento + tamaño de letra al elemento <html>. */
export function applyAppearance(theme: ThemeChoice, accent: AccentChoice, font: FontSize): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Tema (clase) — el html de layout.tsx ya trae "dark" por defecto.
  root.classList.remove('dark', 'light');
  root.classList.add(resolveIsDark(theme) ? 'dark' : 'light');
  root.style.colorScheme = resolveIsDark(theme) ? 'dark' : 'light';

  // Acento (variables inline).
  const def = accentById(accent);
  const values = resolveIsDark(theme) ? def.dark : def.light;
  root.style.setProperty('--primary', values.primary);
  root.style.setProperty('--primary-foreground', values.foreground);
  root.style.setProperty('--ring', values.ring);

  // Tamaño de letra global.
  root.dataset.omniFont = font;
}
