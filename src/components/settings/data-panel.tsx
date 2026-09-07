'use client';

/**
 * DataPanel — exportar / importar copia local y zona de peligro.
 *
 * - Exportar: descarga un JSON completo (sin secretos).
 * - Importar: restaura conversaciones y preferencias (merge, sin borrar).
 * - Zona de peligro: vaciar historial, borrar claves y restablecer prefs.
 */

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Download,
  KeyRound,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clearAllConversations } from '@/lib/db/conversations';
import { exportAllData, importAllData } from '@/lib/export';
import { persistSecret } from '@/lib/store/use-settings-store';
import type { ProviderId } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Proveedores con clave cifrada en IndexedDB. */
const KEY_PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'google', 'custom'];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Botón de confirmación destructivo reutilizable. */
function DangerAction(props: {
  title: string;
  description: string;
  confirmLabel: string;
  actionLabel: string;
  icon: ReactNode;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
        >
          {props.icon}
          {props.actionLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
            {props.title}
          </AlertDialogTitle>
          <AlertDialogDescription>{props.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void props.onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {props.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DataPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllData();
      toast.success('Copia descargada', {
        description: 'Las API Keys cifradas nunca se incluyen en la copia.',
      });
    } catch (error) {
      toast.error('No se pudo generar la copia', { description: errorMessage(error) });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Selecciona primero un archivo JSON.');
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const result = await importAllData(text);
      toast.success(`${result.conversations} conversaciones importadas`, {
        description: 'Las preferencias se fusionaron sin borrar lo existente.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error('No se pudo importar el archivo', { description: errorMessage(error) });
    } finally {
      setImporting(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearAllConversations();
      toast.success('Historial vaciado', {
        description: 'Todas las conversaciones locales fueron eliminadas.',
      });
    } catch (error) {
      toast.error('No se pudo vaciar el historial', { description: errorMessage(error) });
    }
  };

  const handleClearKeys = async () => {
    try {
      for (const provider of KEY_PROVIDERS) {
        await persistSecret(provider, '');
      }
      toast.success('Claves API eliminadas', {
        description: 'Se borraron los registros cifrados de este navegador.',
      });
    } catch (error) {
      toast.error('No se pudieron borrar las claves', { description: errorMessage(error) });
    }
  };

  const handleResetPreferences = () => {
    try {
      window.localStorage.removeItem('omniai-app');
      window.localStorage.removeItem('omniai-settings');
      window.location.reload();
    } catch (error) {
      toast.error('No se pudieron restablecer las preferencias', {
        description: errorMessage(error),
      });
    }
  };

  return (
    <div className="grid gap-4">
      {/* ── Exportar ──────────────────────────────────────────────────────── */}
      <section className="glass-card rounded-xl p-4" aria-labelledby="data-export-title">
        <div className="mb-2 flex items-center gap-2">
          <Download className="size-4 text-muted-foreground" aria-hidden />
          <h2 id="data-export-title" className="text-sm font-medium">
            Exportar
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Descarga todas tus conversaciones y preferencias en un único archivo JSON para guardar
          una copia de seguridad o trasladarla a otro dispositivo.
        </p>
        <Button onClick={handleExport} disabled={exporting} className="mt-3 gap-1.5">
          {exporting && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Descargar copia completa (JSON)
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground/70">
          Las API Keys cifradas nunca se incluyen en la copia.
        </p>
      </section>

      {/* ── Importar ──────────────────────────────────────────────────────── */}
      <section className="glass-card rounded-xl p-4" aria-labelledby="data-import-title">
        <div className="mb-2 flex items-center gap-2">
          <Upload className="size-4 text-muted-foreground" aria-hidden />
          <h2 id="data-import-title" className="text-sm font-medium">
            Importar
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Restaura una copia previamente exportada. La importación es incremental (merge): no
          borra nada de lo que ya existe en este navegador.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Archivo de copia de seguridad JSON"
            className="h-9 flex-1 file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground"
          />
          <Button onClick={handleImport} disabled={importing} className="gap-1.5">
            {importing && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Importar
          </Button>
        </div>
      </section>

      {/* ── Zona de peligro ───────────────────────────────────────────────── */}
      <section
        className={cn('glass-card rounded-xl border-destructive/40 p-4')}
        aria-labelledby="data-danger-title"
      >
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" aria-hidden />
          <h2 id="data-danger-title" className="text-sm font-medium text-destructive">
            Zona de peligro
          </h2>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          Acciones destructivas sobre los datos guardados en este navegador. No afectan a otros
          dispositivos y no se pueden deshacer.
        </p>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div>
              <h3 className="text-xs font-medium">Vaciar historial</h3>
              <p className="text-[11px] text-muted-foreground">
                Elimina todas las conversaciones guardadas localmente.
              </p>
            </div>
            <DangerAction
              title="¿Vaciar todo el historial?"
              description="Se eliminarán todas las conversaciones de este navegador. Esta acción no se puede deshacer."
              confirmLabel="Sí, vaciar historial"
              actionLabel="Vaciar historial"
              icon={<Trash2 className="size-3.5" aria-hidden />}
              onConfirm={handleClearHistory}
            />
          </div>

          <div className="grid gap-2">
            <div>
              <h3 className="text-xs font-medium">Borrar claves API guardadas</h3>
              <p className="text-[11px] text-muted-foreground">
                Elimina los registros cifrados de OpenAI, Anthropic, Google y endpoint propio.
              </p>
            </div>
            <DangerAction
              title="¿Borrar todas las claves API?"
              description="Tendrás que volver a introducirlas en Ajustes. Los registros cifrados de este navegador se eliminarán."
              confirmLabel="Sí, borrar claves"
              actionLabel="Borrar claves API guardadas"
              icon={<KeyRound className="size-3.5" aria-hidden />}
              onConfirm={handleClearKeys}
            />
          </div>

          <div className="grid gap-2">
            <div>
              <h3 className="text-xs font-medium">Restablecer preferencias</h3>
              <p className="text-[11px] text-muted-foreground">
                Vuelve a los valores de fábrica: apariencia, parámetros de chat, personas, skills,
                MCP y prompts. La recarga es automática.
              </p>
            </div>
            <DangerAction
              title="¿Restablecer preferencias?"
              description="Se borrarán 'omniai-app' y 'omniai-settings' de este navegador y la página se recargará con los valores de fábrica."
              confirmLabel="Sí, restablecer"
              actionLabel="Restablecer preferencias"
              icon={<RotateCcw className="size-3.5" aria-hidden />}
              onConfirm={handleResetPreferences}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
