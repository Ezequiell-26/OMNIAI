'use client';

/**
 * AccountPanel — cuenta opcional (Local-First).
 *
 * - Sin cuenta: explicación + formularios de inicio de sesión / registro.
 * - Con cuenta: perfil, sincronización manual del historial y cierre de sesión.
 * - Las API Keys BYOK jamás se sincronizan: solo viaja el historial.
 */

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CloudUpload,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/store/use-auth-store';
import { getLastSyncAt, syncNow } from '@/lib/sync';

/** Iniciales para el Avatar a partir del nombre o del email. */
function initialsFrom(email: string, name: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    const result = parts.map((p) => p.charAt(0).toUpperCase()).join('');
    if (result) return result;
  }
  const local = email.split('@')[0] ?? '';
  return local.slice(0, 2).toUpperCase() || '··';
}

/** Etiqueta legible para "última sincronización". */
function syncLabel(): string {
  const at = getLastSyncAt();
  if (!at) return 'nunca';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return 'nunca';
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function AccountPanel() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const refresh = useAuthStore((s) => s.refresh);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('nunca');

  // Comprueba la sesión (cookie httpOnly) y la etiqueta de última sincronización.
  useEffect(() => {
    void refresh();
    setLastSync(syncLabel());
  }, [refresh]);

  const busy = status === 'loading';

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { pulled, pushed } = await syncNow();
      toast.success(`Sincronizado — ${pulled} recibidas, ${pushed} enviadas`);
      setLastSync(syncLabel());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada', {
        description: 'Tu historial local permanece en este navegador.',
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      if (mode === 'login') {
        const ok = await login(email.trim(), password);
        if (ok) toast.success('Sesión iniciada');
      } else {
        const ok = await register(name.trim(), email.trim(), password);
        if (ok) {
          toast.success('Cuenta creada');
          // Primera sincronización inicial (silenciosa si falla).
          try {
            await syncNow();
            toast.success('Historial sincronizado');
          } catch {
            /* el usuario ya está dentro; podrá sincronizar manualmente */
          }
        }
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  /* ── Sin sesión: explicación + formularios ─────────────────────────────── */

  if (!user) {
    return (
      <div className="grid gap-4">
        <section className="glass-card rounded-xl p-4" aria-labelledby="account-signup-title">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" aria-hidden />
            <h2 id="account-signup-title" className="text-sm font-medium">
              Crea tu cuenta (opcional)
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            OmniAI Studio es <span className="font-medium text-foreground">Local-First</span>: la
            app funciona sin cuenta. Una cuenta solo sincroniza el historial entre dispositivos;
            las API Keys jamás se suben — permanecen cifradas en tu navegador.
          </p>

          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as 'login' | 'register')}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3" noValidate>
            {mode === 'register' && (
              <div className="grid gap-1.5">
                <Label htmlFor="account-name" className="text-xs text-muted-foreground">
                  Nombre (opcional)
                </Label>
                <Input
                  id="account-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  className="h-9"
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="account-email" className="text-xs text-muted-foreground">
                Email
              </Label>
              <Input
                id="account-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                className="h-9"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="account-password" className="text-xs text-muted-foreground">
                Contraseña
              </Label>
              <Input
                id="account-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="h-9"
                aria-describedby="account-password-hint"
              />
              <p id="account-password-hint" className="text-[11px] text-muted-foreground/70">
                Mínimo 6 caracteres.
              </p>
            </div>

            {error && <p className="text-destructive text-xs">{error}</p>}

            <Button type="submit" disabled={busy} className="mt-1 gap-1.5">
              {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
          </form>
        </section>
      </div>
    );
  }

  /* ── Con sesión: perfil + sincronización ───────────────────────────────── */

  return (
    <div className="grid gap-4">
      <section className="glass-card rounded-xl p-4" aria-labelledby="account-profile-title">
        <div className="flex items-start gap-3">
          <Avatar className="size-10 border border-border/60">
            <AvatarFallback className="bg-muted/60 text-xs font-medium">
              {initialsFrom(user.email, user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 id="account-profile-title" className="truncate text-sm font-medium">
              {user.name || '—'}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Sesión activa en este navegador. Tus claves API nunca abandonan tu dispositivo.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleSync} disabled={syncing} className="gap-1.5">
            {syncing ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <CloudUpload className="size-3.5" aria-hidden />
            )}
            Sincronizar ahora
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-1.5 hover:text-destructive"
          >
            <LogOut className="size-3.5" aria-hidden />
            Cerrar sesión
          </Button>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <RefreshCw className="size-3" aria-hidden />
          Última sincronización: {lastSync}
        </p>
      </section>

      <section className="glass-card rounded-xl p-4" aria-labelledby="account-privacy-title">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-400" aria-hidden />
          <h3 id="account-privacy-title" className="text-sm font-medium">
            Privacidad
          </h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          La sincronización solo incluye conversaciones (títulos y mensajes). Las API Keys
          cifradas, las URLs de MCP con tokens y las preferencias sensibles se quedan siempre en
          este navegador.
        </p>
      </section>
    </div>
  );
}
