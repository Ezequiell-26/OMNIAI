'use client';

/**
 * ApiKeyModal — modal BYOK (Bring Your Own Key).
 *
 * - Acepta claves de OpenAI, Anthropic, Google AI Studio, un endpoint
 *   OpenAI-compatible y la URL de Ollama local.
 * - Valida el formato con regex soft (avisa pero permite guardar).
 * - Al guardar: cifra con AES-GCM (clave maestra no extraíble en IndexedDB)
 *   y persiste SOLO el payload cifrado en el navegador del usuario.
 * - Muestra máscaras (password) con toggle de visibilidad.
 */

import { useEffect, useState } from 'react';
import {
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PROVIDER_ICON } from '@/components/chat/model-selector';
import { PROVIDERS, isProviderReady, type ReadinessContext } from '@/lib/ai/catalog';
import { persistSecret, useSettingsStore } from '@/lib/store/use-settings-store';
import type { ProviderId } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Proveedores que guardan una API Key cifrada. */
const SECRET_PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'google', 'custom'];

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const keys = useSettingsStore((s) => s.keys);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const setOllamaUrl = useSettingsStore((s) => s.setOllamaUrl);
  const ollamaModelsCsv = useSettingsStore((s) => s.ollamaModelsCsv);
  const setOllamaModelsCsv = useSettingsStore((s) => s.setOllamaModelsCsv);
  const customBaseUrl = useSettingsStore((s) => s.customBaseUrl);
  const setCustomBaseUrl = useSettingsStore((s) => s.setCustomBaseUrl);
  const customModel = useSettingsStore((s) => s.customModel);
  const setCustomModel = useSettingsStore((s) => s.setCustomModel);

  /** Borradores locales; vacío = "no tocar" la clave ya guardada. */
  const [drafts, setDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [visible, setVisible] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [saving, setSaving] = useState(false);

  // Cada vez que se abre, se parte de un estado limpio (sin editar).
  useEffect(() => {
    if (!open) return;
    setDrafts({});
    setVisible({});
  }, [open]);

  const readiness: ReadinessContext = {
    keys,
    ollamaUrl,
    customBaseUrl,
    customModel,
    ollamaModelsCsv,
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const provider of SECRET_PROVIDERS) {
        const draft = drafts[provider];
        if (draft === undefined) continue; // sin cambios
        await persistSecret(provider, draft);
      }
      toast.success('Claves cifradas y guardadas en este navegador', {
        description: 'AES-GCM · IndexedDB local. Nunca se envían a ningún servidor.',
        icon: <ShieldCheck className="size-4 text-emerald-400" />,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error('No se pudieron guardar las claves', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleWipeAll = async () => {
    try {
      for (const provider of SECRET_PROVIDERS) {
        await persistSecret(provider, '');
      }
      setDrafts({});
      toast.info('Todas las claves se eliminaron de este navegador.');
    } catch (error) {
      toast.error('No se pudieron eliminar las claves', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Ajustes · Bring Your Own Key
          </DialogTitle>
          <DialogDescription>
            Introduce tus propias claves. Se cifran con AES-GCM y se guardan únicamente en la
            base de datos local de tu navegador (IndexedDB). El servidor las usa en memoria
            durante cada petición y nunca las almacena.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          {SECRET_PROVIDERS.map((provider) => {
            const info = PROVIDERS[provider];
            const Icon = PROVIDER_ICON[provider];
            const draft = drafts[provider] ?? '';
            const stored = Boolean(keys[provider]);
            const formatValid = !draft || !info.keyRegex || info.keyRegex.test(draft);
            const shown = visible[provider] ?? false;
            const isCustom = provider === 'custom';
            const ready = isProviderReady(provider, readiness);

            return (
              <div key={provider} className="glass-card rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    {info.label}
                    {stored && draft === '' && (
                      <Badge variant="outline" className="rounded-sm px-1.5 text-[9px] font-normal text-muted-foreground">
                        guardada
                      </Badge>
                    )}
                    {ready && (
                      <Badge
                        variant="outline"
                        className="rounded-sm border-emerald-500/30 px-1.5 text-[9px] font-normal text-emerald-400"
                      >
                        activa
                      </Badge>
                    )}
                  </Label>
                  {info.docsUrl && (
                    <a
                      href={info.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                      tabIndex={0}
                    >
                      Obtener clave
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                </div>

                <div className="relative">
                  <Input
                    type={shown ? 'text' : 'password'}
                    value={draft}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [provider]: event.target.value }))
                    }
                    placeholder={isCustom ? 'Opcional para endpoints públicos' : info.keyHint ?? 'API Key'}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label={`API Key de ${info.label}`}
                    className={cn(
                      'pr-10 font-mono text-xs',
                      !formatValid && 'border-destructive/60 focus-visible:ring-destructive/20',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((prev) => ({ ...prev, [provider]: !shown }))}
                    aria-label={shown ? 'Ocultar clave' : 'Mostrar clave'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>

                {!formatValid && (
                  <p className="mt-1.5 text-[11px] text-destructive/90">
                    El formato no coincide con lo esperado ({info.keyHint}) — se guardará de todas formas.
                  </p>
                )}

                {isCustom && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1 block text-xs text-muted-foreground">Base URL</Label>
                      <Input
                        value={customBaseUrl}
                        onChange={(event) => setCustomBaseUrl(event.target.value)}
                        placeholder="https://mi-endpoint.com/v1"
                        autoComplete="off"
                        spellCheck={false}
                        className="h-9 font-mono text-xs"
                        aria-label="URL base del endpoint compatible con OpenAI"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-muted-foreground">Modelo</Label>
                      <Input
                        value={customModel}
                        onChange={(event) => setCustomModel(event.target.value)}
                        placeholder="meta-llama/Llama-3-70B"
                        autoComplete="off"
                        spellCheck={false}
                        className="h-9 font-mono text-xs"
                        aria-label="Identificador del modelo del endpoint propio"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Ollama — sin clave, URL local + lista de modelos */}
          <div className="glass-card rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="flex items-center gap-2 text-sm">
                {(() => {
                  const Icon = PROVIDER_ICON.ollama;
                  return <Icon className="size-4 text-muted-foreground" aria-hidden />;
                })()}
                Ollama (100 % local)
              </Label>
              <a
                href={PROVIDERS.ollama.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Descargar
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Servidor</Label>
                <Input
                  value={ollamaUrl}
                  onChange={(event) => setOllamaUrl(event.target.value)}
                  placeholder="http://localhost:11434"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 font-mono text-xs"
                  aria-label="URL del servidor Ollama"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Modelos (separados por comas)
                </Label>
                <Input
                  value={ollamaModelsCsv}
                  onChange={(event) => setOllamaModelsCsv(event.target.value)}
                  placeholder="llama3.2, qwen2.5, mistral"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 font-mono text-xs"
                  aria-label="Lista de modelos de Ollama"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
              El servidor debe poder alcanzar esa URL: si usas OmniAI Studio en local, tu Ollama
              de <span className="font-mono">localhost</span> funcionará tal cual.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={handleWipeAll}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Borrar todas las claves
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Guardar claves
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
