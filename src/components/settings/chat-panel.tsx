'use client';

/**
 * ChatPanel — parámetros de generación y prompt de sistema por defecto.
 * Los valores se envían al backend en cada petición (ver lib/chat-payload).
 */

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store/use-app-store';

export function ChatPanel() {
  const temperature = useAppStore((s) => s.temperature);
  const setTemperature = useAppStore((s) => s.setTemperature);
  const topP = useAppStore((s) => s.topP);
  const setTopP = useAppStore((s) => s.setTopP);
  const maxTokens = useAppStore((s) => s.maxTokens);
  const setMaxTokens = useAppStore((s) => s.setMaxTokens);
  const autoTitle = useAppStore((s) => s.autoTitle);
  const setAutoTitle = useAppStore((s) => s.setAutoTitle);
  const customSystemPrompt = useAppStore((s) => s.customSystemPrompt);
  const setCustomSystemPrompt = useAppStore((s) => s.setCustomSystemPrompt);

  return (
    <div className="grid gap-4">
      {/* Parámetros de muestreo */}
      <div className="glass-card grid gap-5 rounded-xl p-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="opt-temp" className="text-sm">
              Temperatura
            </Label>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {temperature.toFixed(2)}
            </Badge>
          </div>
          <Slider
            id="opt-temp"
            min={0}
            max={2}
            step={0.05}
            value={[temperature]}
            onValueChange={([v]) => setTemperature(v)}
            aria-label="Temperatura del modelo"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Baja = respuestas precisas y estables · alta = más creativas.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="opt-topp" className="text-sm">
              Top P
            </Label>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {topP.toFixed(2)}
            </Badge>
          </div>
          <Slider
            id="opt-topp"
            min={0.05}
            max={1}
            step={0.05}
            value={[topP]}
            onValueChange={([v]) => setTopP(v)}
            aria-label="Top P del modelo"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Limita el muestreo al conjunto de tokens más probables.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="opt-maxtok" className="text-sm">
              Tokens máximos de salida
            </Label>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {maxTokens === 0 ? 'auto' : maxTokens}
            </Badge>
          </div>
          <Slider
            id="opt-maxtok"
            min={0}
            max={16384}
            step={256}
            value={[maxTokens]}
            onValueChange={([v]) => setMaxTokens(v)}
            aria-label="Tokens máximos de salida"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            0 = el proveedor decide (recomendado).
          </p>
        </div>
      </div>

      {/* Prompt de sistema por defecto */}
      <div className="glass-card rounded-xl p-4">
        <Label htmlFor="opt-sysprompt" className="text-sm">
          Prompt de sistema personalizado
        </Label>
        <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
          Se aplica cuando no hay ninguna persona activa. Para instrucciones reutilizables, crea
          personas en su pestaña.
        </p>
        <Textarea
          id="opt-sysprompt"
          value={customSystemPrompt}
          onChange={(event) => setCustomSystemPrompt(event.target.value)}
          placeholder="Eres un asistente que…"
          rows={5}
          className="text-sm"
          maxLength={8000}
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {customSystemPrompt.length}/8000
        </p>
      </div>

      {/* Títulos automáticos */}
      <div className="glass-card flex items-center justify-between gap-4 rounded-xl p-4">
        <div>
          <Label htmlFor="opt-autotitle" className="text-sm">
            Títulos automáticos
          </Label>
          <p className="text-xs text-muted-foreground">
            Genera un título breve con IA para cada conversación nueva.
          </p>
        </div>
        <Switch id="opt-autotitle" checked={autoTitle} onCheckedChange={setAutoTitle} />
      </div>
    </div>
  );
}
