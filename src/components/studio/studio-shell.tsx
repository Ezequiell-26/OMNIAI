'use client';

/**
 * StudioShell — orquestador principal de OmniAI Studio (v2).
 *
 * Responsabilidades:
 * - Hidratar secretos (IndexedDB → memoria), historial y sesión al arrancar.
 * - Aplicar apariencia (tema/acento/tipografía) al DOM.
 * - Historial local: abrir/crear/renombrar/eliminar/exportar.
 * - Persistencia con debounce + títulos automáticos con IA.
 * - Registro de uso (tokens/coste) para el panel de estadísticas.
 * - Sincronización opcional con la cuenta (push+pull tras login).
 * - Paleta de comandos (Ctrl/Cmd+K) y centro de ajustes por pestañas.
 * - Componer: Header + Sidebar (desktop & Sheet móvil) + ChatBox(es) +
 *   footer sticky + SettingsDialog.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import { CloudUpload, LogIn, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CommandPalette } from '@/components/chat/command-palette';
import { ChatBox } from '@/components/chat/chat-box';
import { HistorySidebar } from '@/components/chat/history-sidebar';
import { StudioHeader } from '@/components/studio/studio-header';
import { SettingsDialog, type SettingsTab } from '@/components/settings/settings-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { composeModelTag, findModel, type ModelInfo } from '@/lib/ai/catalog';
import { deriveTitle, messageText } from '@/lib/ai/messages';
import { applyAppearance } from '@/lib/appearance';
import { deleteConversation, listConversations, saveConversation } from '@/lib/db/conversations';
import { addUsageRecord } from '@/lib/db/usage';
import { estimateTokens, formatCost, formatTokens } from '@/lib/tokens';
import { syncNow } from '@/lib/sync';
import { loadSecretsIntoStore, readinessFromState, useSettingsStore } from '@/lib/store/use-settings-store';
import { useAppStore } from '@/lib/store/use-app-store';
import { useAuthStore } from '@/lib/store/use-auth-store';
import type { Conversation, SessionTotals } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Splash mínimo mientras se hidratan IndexedDB y preferencias. */
function Splash() {
  return (
    <div className="bg-grid flex h-dvh flex-col items-center justify-center gap-3">
      <div className="glass-card flex size-12 items-center justify-center rounded-2xl shadow-lg">
        <Sparkles className="size-6 animate-pulse" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">Cargando OmniAI Studio…</p>
    </div>
  );
}

/** Footer sticky: licencia + totales aproximados de la sesión. */
function StudioFooter({ totals }: { totals: SessionTotals }) {
  return (
    <footer className="mt-auto flex h-9 shrink-0 items-center justify-between gap-4 border-t border-border/40 bg-background/80 px-3 text-[11px] text-muted-foreground/70 backdrop-blur md:px-4">
      <p className="truncate">
        © {new Date().getFullYear()} OmniAI Studio · MIT License · Local-First · BYOK
      </p>
      <p className="hidden shrink-0 font-mono sm:block" aria-live="off">
        sesión: ≈{formatTokens(totals.tokens)} tok · ≈{formatCost(totals.costUsd)}
      </p>
    </footer>
  );
}

export function StudioShell() {
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [panelMessages, setPanelMessages] = useState<{ a: UIMessage[]; b: UIMessage[] }>({
    a: [],
    b: [],
  });
  /** Bump para remontar los ChatBox (nueva conversación / abrir historial). */
  const [chatKey, setChatKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('providers');
  const [paletteOpen, setPaletteOpen] = useState(false);

  const splitMode = useSettingsStore((s) => s.splitMode);
  const panelA = useSettingsStore((s) => s.panelA);
  const panelB = useSettingsStore((s) => s.panelB);

  const user = useAuthStore((s) => s.user);
  const refreshAuth = useAuthStore((s) => s.refresh);

  const openSettings = useCallback((tab: SettingsTab = 'providers') => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  }, []);

  // ── Hidratación inicial (secretos + historial + sesión + apariencia) ────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadSecretsIntoStore();
      const app = useAppStore.getState();
      applyAppearance(app.theme, app.accent, app.fontSize);
      const list = await listConversations();
      if (cancelled) return;
      setConversations(list);
      setMounted(true);
      // Reabre automáticamente la conversación más reciente.
      const latest = list[0];
      if (latest) {
        setActive(latest);
        setPanelMessages({ a: latest.messagesA ?? [], b: latest.messagesB ?? [] });
        setChatKey((key) => key + 1);
      }
      // Sesión (cuenta opcional) + sincronización en segundo plano.
      void refreshAuth();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAuth]);

  // ── Apariencia reactiva (tema/acento/tipografía) ─────────────────────────
  const theme = useAppStore((s) => s.theme);
  const accent = useAppStore((s) => s.accent);
  const fontSize = useAppStore((s) => s.fontSize);
  const autoTitle = useAppStore((s) => s.autoTitle);

  useEffect(() => {
    applyAppearance(theme, accent, fontSize);
  }, [theme, accent, fontSize]);

  // Tema "system": sigue al sistema en vivo.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyAppearance(theme, accent, fontSize);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, accent, fontSize]);

  // ── Sincronización automática cuando hay sesión ──────────────────────────
  useEffect(() => {
    if (!user || !mounted) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await syncNow();
        if (cancelled) return;
        if (result.pulled > 0) {
          const list = await listConversations();
          setConversations(list);
          toast.success(`Sincronizado: ${result.pulled} conversación(es) recibidas.`, {
            icon: <CloudUpload className="size-4 text-emerald-400" />,
          });
        }
      } catch {
        // Silencioso: el usuario puede sincronizar manualmente desde Cuenta.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, mounted]);

  // ── Callbacks estables para onMessagesChange (evita re-efectos) ─────────
  const handleMessagesA = useCallback((messages: UIMessage[]) => {
    setPanelMessages((prev) => (prev.a === messages ? prev : { ...prev, a: messages }));
  }, []);
  const handleMessagesB = useCallback((messages: UIMessage[]) => {
    setPanelMessages((prev) => (prev.b === messages ? prev : { ...prev, b: messages }));
  }, []);

  // ── Registro de uso (tokens/coste por mensaje nuevo) ─────────────────────
  const countedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!mounted) return;
    const state = useSettingsStore.getState();
    const ctx = readinessFromState(state);

    const record = (messages: UIMessage[], panel: 'a' | 'b') => {
      const selection = panel === 'a' ? state.panelA : state.panelB;
      const modelInfo = findModel(selection.provider, selection.model, ctx);
      if (!modelInfo) return;
      const tag = composeModelTag(selection.provider, selection.model);
      for (const message of messages) {
        const key = `${panel}:${message.id}`;
        if (countedRef.current.has(key)) continue;
        const lastText = [...message.parts].reverse().find((p) => p.type === 'text');
        if (!lastText || lastText.type !== 'text' || !lastText.text.trim()) {
          // Aun sin texto lo marcamos para no re-evaluarlo en cada tick.
          countedRef.current.add(key);
          continue;
        }
        countedRef.current.add(key);
        const tokens = estimateTokens(lastText.text);
        const price = message.role === 'assistant' ? modelInfo.priceOut : modelInfo.priceIn;
        void addUsageRecord({
          id: key,
          ts: new Date().toISOString(),
          provider: selection.provider,
          model: tag,
          tokens,
          costUsd: (tokens * price) / 1_000_000,
          role: message.role === 'assistant' ? 'output' : 'input',
        });
      }
    };

    record(panelMessages.a, 'a');
    if (splitMode) record(panelMessages.b, 'b');
  }, [panelMessages, splitMode, mounted]);

  // ── Persistencia local con debounce (800 ms sin cambios) + auto-título ──
  const activeRef = useRef<Conversation | null>(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const titledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!mounted) return;
    if (panelMessages.a.length === 0 && panelMessages.b.length === 0) return;

    const timer = window.setTimeout(async () => {
      const state = useSettingsStore.getState();
      const mode = state.splitMode ? 'split' : 'single';
      const now = new Date().toISOString();
      const current = activeRef.current;
      const messagesA = panelMessages.a;
      const conversation: Conversation = {
        id: current?.id ?? crypto.randomUUID(),
        title: deriveTitle(messagesA.length > 0 ? messagesA : panelMessages.b),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
        mode,
        modelA: composeModelTag(state.panelA.provider, state.panelA.model),
        modelB:
          mode === 'split'
            ? composeModelTag(state.panelB.provider, state.panelB.model)
            : undefined,
        messagesA,
        messagesB: mode === 'split' ? panelMessages.b : undefined,
      };
      await saveConversation(conversation);
      if (!activeRef.current) setActive(conversation);
      setConversations((prev) =>
        [conversation, ...prev.filter((c) => c.id !== conversation.id)].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      );

      // Título automático con IA (una vez por conversación).
      const appState = useAppStore.getState();
      const needsTitle =
        appState.autoTitle &&
        conversation.messagesA.length >= 2 &&
        !titledRef.current.has(conversation.id) &&
        conversation.title === deriveTitle(conversation.messagesA);
      if (needsTitle) {
        titledRef.current.add(conversation.id);
        const firstUser = conversation.messagesA.find((m) => m.role === 'user');
        if (firstUser) {
          try {
            const res = await fetch('/api/title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: messageText(firstUser).slice(0, 400) }),
            });
            if (res.ok) {
              const data = (await res.json()) as { title?: string };
              if (data.title) {
                const updated = { ...conversation, title: data.title, updatedAt: new Date().toISOString() };
                await saveConversation(updated);
                setConversations((prev) =>
                  [updated, ...prev.filter((c) => c.id !== updated.id)].sort((a, b) =>
                    b.updatedAt.localeCompare(a.updatedAt),
                  ),
                );
                setActive((prevActive) => (prevActive?.id === updated.id ? updated : prevActive));
              }
            }
          } catch {
            // Título derivado se mantiene.
          }
        }
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [panelMessages, mounted]);

  // ── Acciones del historial ──────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setActive(null);
    setPanelMessages({ a: [], b: [] });
    setChatKey((key) => key + 1);
    setMenuOpen(false);
  }, []);

  const handleOpenConversation = useCallback((conversation: Conversation) => {
    setActive(conversation);
    setPanelMessages({
      a: conversation.messagesA ?? [],
      b: conversation.messagesB ?? [],
    });
    setChatKey((key) => key + 1);
    setMenuOpen(false);
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeRef.current?.id === id) {
      setActive(null);
      setPanelMessages({ a: [], b: [] });
      setChatKey((key) => key + 1);
    }
  }, []);

  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    const current = await listConversations();
    const target = current.find((c) => c.id === id);
    if (!target) return;
    const updated: Conversation = { ...target, title, updatedAt: new Date().toISOString() };
    await saveConversation(updated);
    setConversations((prev) =>
      [updated, ...prev.filter((c) => c.id !== id)].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    );
    setActive((prevActive) => (prevActive?.id === id ? updated : prevActive));
  }, []);

  // ── Atajos de teclado globales ───────────────────────────────────────────
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (mod && event.key === '.') {
        event.preventDefault();
        openSettings('providers');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openSettings]);

  // ── Totales aproximados de la sesión (footer) ───────────────────────────
  const totals: SessionTotals = useMemo(() => {
    const ctx = readinessFromState(useSettingsStore.getState());
    let tokens = 0;
    let cost = 0;

    const accumulate = (messages: UIMessage[], modelInfo: ModelInfo | undefined) => {
      if (!modelInfo) return;
      for (const message of messages) {
        const lastText = [...message.parts].reverse().find((p) => p.type === 'text');
        if (!lastText || lastText.type !== 'text') continue;
        const count = estimateTokens(lastText.text);
        tokens += count;
        const price = message.role === 'assistant' ? modelInfo.priceOut : modelInfo.priceIn;
        cost += (count * price) / 1_000_000;
      }
    };

    accumulate(panelMessages.a, findModel(panelA.provider, panelA.model, ctx));
    if (splitMode) {
      accumulate(panelMessages.b, findModel(panelB.provider, panelB.model, ctx));
    }
    return { tokens, costUsd: cost };
  }, [panelMessages, splitMode, panelA, panelB]);

  if (!mounted) return <Splash />;

  const sidebar = (
    <HistorySidebar
      conversations={conversations}
      activeId={active?.id ?? null}
      onOpen={handleOpenConversation}
      onDelete={(id) => void handleDeleteConversation(id)}
      onNewChat={handleNewChat}
      onRename={(id, title) => void handleRenameConversation(id, title)}
    />
  );

  const accountChip = (
    <div className="border-t border-border/40 p-3">
      {user ? (
        <div className="glass-card flex items-center gap-2 rounded-xl p-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/90 text-[11px] font-semibold text-primary-foreground">
            {(user.name ?? user.email).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user.name ?? user.email}</p>
            <p className="truncate text-[10px] text-muted-foreground">sincronización activa</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            aria-label="Gestionar cuenta"
            onClick={() => openSettings('account')}
          >
            <CloudUpload className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-xs"
          onClick={() => openSettings('account')}
        >
          <LogIn className="size-3.5" aria-hidden />
          Crear cuenta o iniciar sesión
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-dvh flex-col">
      <StudioHeader
        onMenuClick={() => setMenuOpen(true)}
        onOpenSettings={() => openSettings('providers')}
        onOpenAccount={() => openSettings('account')}
        onOpenPalette={() => setPaletteOpen(true)}
        onNewChat={handleNewChat}
      />

      <div className="flex min-h-0 flex-1">
        {/* Historial — escritorio */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border/40 bg-sidebar md:flex">
          {sidebar}
          {accountChip}
        </aside>

        {/* Historial — móvil (Sheet) */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="border-b border-border/40">
              <SheetTitle>Historial local</SheetTitle>
            </SheetHeader>
            <div className={cn('flex flex-col')} style={{ height: 'calc(100dvh - 4rem)' }}>
              {sidebar}
              {accountChip}
            </div>
          </SheetContent>
        </Sheet>

        {/* Área de chat */}
        <main className="flex min-w-0 flex-1 flex-col">
          {splitMode ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-border/40 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <ChatBox
                key={`a-${chatKey}`}
                panelId="a"
                initialMessages={panelMessages.a}
                onMessagesChange={handleMessagesA}
                onOpenSettings={() => openSettings('providers')}
                showPanelHeader
                className="min-h-0"
              />
              <ChatBox
                key={`b-${chatKey}`}
                panelId="b"
                initialMessages={panelMessages.b}
                onMessagesChange={handleMessagesB}
                onOpenSettings={() => openSettings('providers')}
                showPanelHeader
                className="min-h-0"
              />
            </div>
          ) : (
            <ChatBox
              key={`a-${chatKey}`}
              panelId="a"
              initialMessages={panelMessages.a}
              onMessagesChange={handleMessagesA}
              onOpenSettings={() => openSettings('providers')}
              className="min-h-0"
            />
          )}
        </main>
      </div>

      <StudioFooter totals={totals} />

      <SettingsDialog
        key={settingsTab}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialTab={settingsTab}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        conversations={conversations}
        onNewChat={handleNewChat}
        onOpenConversation={handleOpenConversation}
        onOpenSettings={openSettings}
      />
    </div>
  );
}
