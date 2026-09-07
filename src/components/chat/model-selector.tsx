'use client';

/**
 * ModelSelector — desplegable dinámico de proveedor/modelo.
 * Agrupa por proveedor, muestra el precio por 1M de tokens y deshabilita
 * los proveedores sin configurar (con acceso directo al modal de claves).
 */

import { useMemo } from 'react';
import {
  BrainCircuit,
  Check,
  ChevronsUpDown,
  Cpu,
  Gem,
  KeyRound,
  Plug,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PROVIDERS,
  isProviderReady,
  modelsForProvider,
  type ReadinessContext,
} from '@/lib/ai/catalog';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import type { PanelSelection, ProviderId } from '@/lib/types';
import { cn } from '@/lib/utils';

export const PROVIDER_ICON: Record<ProviderId, LucideIcon> = {
  openai: Zap,
  anthropic: BrainCircuit,
  google: Gem,
  ollama: Cpu,
  custom: Plug,
  demo: Sparkles,
};

const PROVIDER_ORDER: ProviderId[] = ['demo', 'openai', 'anthropic', 'google', 'ollama', 'custom'];

interface ModelSelectorProps {
  value: PanelSelection;
  onChange: (selection: PanelSelection) => void;
  onOpenSettings: () => void;
  align?: 'start' | 'end';
  compact?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  onOpenSettings,
  align = 'start',
  compact,
}: ModelSelectorProps) {
  // Suscripciones finas para re-renderizar solo cuando cambia lo necesario.
  const keys = useSettingsStore((s) => s.keys);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const customBaseUrl = useSettingsStore((s) => s.customBaseUrl);
  const customModel = useSettingsStore((s) => s.customModel);
  const ollamaModelsCsv = useSettingsStore((s) => s.ollamaModelsCsv);

  const ctx: ReadinessContext = useMemo(
    () => ({ keys, ollamaUrl, customBaseUrl, customModel, ollamaModelsCsv }),
    [keys, ollamaUrl, customBaseUrl, customModel, ollamaModelsCsv],
  );

  const CurrentIcon = PROVIDER_ICON[value.provider];
  const currentModels = modelsForProvider(value.provider, ctx);
  const currentLabel =
    currentModels.find((m) => m.id === value.model)?.label ?? value.model;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-label="Seleccionar modelo de IA"
          className={cn('gap-2 font-normal', compact ? 'max-w-[170px]' : 'max-w-[240px]')}
        >
          <CurrentIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{currentLabel}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-72">
        {PROVIDER_ORDER.map((providerId) => {
          const provider = PROVIDERS[providerId];
          const Icon = PROVIDER_ICON[providerId];
          const ready = isProviderReady(providerId, ctx);
          const models = modelsForProvider(providerId, ctx);
          return (
            <DropdownMenuGroup key={providerId}>
              <DropdownMenuLabel className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Icon className="size-3.5" aria-hidden />
                  {provider.label}
                </span>
                {!ready && <span className="text-[10px] font-normal">sin configurar</span>}
              </DropdownMenuLabel>
              {models.map((model) => {
                const active = value.provider === providerId && value.model === model.id;
                const free = model.priceIn === 0 && model.priceOut === 0;
                return (
                  <DropdownMenuItem
                    key={`${providerId}-${model.id}`}
                    disabled={!ready}
                    onSelect={() => onChange({ provider: providerId, model: model.id })}
                    className="gap-2"
                  >
                    <Check className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-0')} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{model.label}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {free ? 'local/demo' : `$${model.priceIn}/$${model.priceOut} · 1M`}
                    </span>
                  </DropdownMenuItem>
                );
              })}
              {models.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Añade modelos en Ajustes para usar este proveedor.
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenSettings} className="gap-2">
          <KeyRound className="size-3.5" aria-hidden />
          Configurar API Keys…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
