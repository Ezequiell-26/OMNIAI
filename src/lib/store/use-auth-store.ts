/**
 * useAuthStore — estado de la cuenta opcional (cliente).
 *
 * OmniAI Studio es Local-First: la app funciona sin cuenta. Registrarse solo
 * activa la sincronización del historial entre dispositivos (las API Keys
 * BYOK jamás se suben: permanecen cifradas en el navegador).
 */

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;

  /** Comprueba la sesión actual contra el servidor (cookie httpOnly). */
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

interface AuthResponse {
  user?: AuthUser;
  error?: string;
}

async function postJson(url: string, body: unknown): Promise<{ res: Response; data: AuthResponse }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: AuthResponse = {};
  try {
    data = (await res.json()) as AuthResponse;
  } catch {
    data = { error: 'Respuesta inválida del servidor.' };
  }
  return { res, data };
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'idle',
  error: null,

  refresh: async () => {
    set({ status: 'loading' });
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = (await res.json()) as AuthResponse;
      if (res.ok && data.user) {
        set({ user: data.user, status: 'authenticated', error: null });
      } else {
        set({ user: null, status: 'unauthenticated' });
      }
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (email, password) => {
    set({ status: 'loading', error: null });
    const { res, data } = await postJson('/api/auth/login', { email, password });
    if (res.ok && data.user) {
      set({ user: data.user, status: 'authenticated', error: null });
      return true;
    }
    set({ status: 'unauthenticated', error: data.error ?? 'No se pudo iniciar sesión.' });
    return false;
  },

  register: async (name, email, password) => {
    set({ status: 'loading', error: null });
    const { res, data } = await postJson('/api/auth/register', { name, email, password });
    if (res.ok && data.user) {
      set({ user: data.user, status: 'authenticated', error: null });
      return true;
    }
    set({ status: 'unauthenticated', error: data.error ?? 'No se pudo crear la cuenta.' });
    return false;
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      set({ user: null, status: 'unauthenticated', error: null });
    }
  },
}));
