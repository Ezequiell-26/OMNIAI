'use client';

/**
 * StudioShell — orquestador principal de OmniAI Studio.
 *
 * Responsabilidades:
 * - Hidratar secretos (IndexedDB → memoria) y el historial al arrancar.
 * - Gestionar el historial local (abrir / crear / eliminar conversaciones).
 * - Persistir con debounce las conversaciones activas en IndexedDB.
 * - Componer: Header + Sidebar (desktop & Sheet móvil) + ChatBox(es) +
 *   footer sticky + ApiKeyModal.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import { Sparkles } from 'lucide-react';
import { ApiKeyModal } from '@/components/settings/api-key-modal';
import { ChatBox } from '@/components/chat/chat-box';
import { HistorySidebar } from '@/components/chat/history-sidebar';
import { StudioHeader } from '@/components/studio/studio-header';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { composeModelTag, findModel, type ModelInfo } from '@/lib/ai/catalog';
import { deriveTitle } from '@/lib/ai/messages';
import { deleteConversation, listConversations, saveConversation } from '@/lib/db/conversations';
import { estimateTokens, formatCost, formatTokens } from '@/lib/tokens';
import {
  loadSecretsIntoStore,
  readinessFromState,
  useSettingsStore,
} from '@/lib/store/use-settings-store';
import type { Conversation, SessionTotals } from '@/lib/types';

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

  const splitMode = useSettingsStore((s) => s.splitMode);
  const panelA = useSettingsStore((s) => s.panelA);
  const panelB = useSettingsStore((s) => s.panelB);

  // ── Hidratación inicial (secretos + historial) ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadSecretsIntoStore();
      const list = await listConversations();
      if (cancelled) return;
      setConversations(list);
      setMounted(true);
      // Reabre automáticamente la conversación más reciente (como haría
      // cualquier cliente de chat; todo sale de IndexedDB local).
      const latest = list[0];
      if (latest) {
        setActive(latest);
        setPanelMessages({
          a: latest.messagesA ?? [],
          b: latest.messagesB ?? [],
        });
        setChatKey((key) => key + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Callbacks estables para onMessagesChange (evita re-efectos) ─────────
  const handleMessagesA = useCallback((messages: UIMessage[]) => {
    setPanelMessages((prev) => (prev.a === messages ? prev : { ...prev, a: messages }));
  }, []);
  const handleMessagesB = useCallback((messages: UIMessage[]) => {
    setPanelMessages((prev) => (prev.b === messages ? prev : { ...prev, b: messages }));
  }, []);

  // ── Persistencia local con debounce (800 ms sin cambios) ────────────────
  const activeRef = useRef<Conversation | null>(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!mounted) return;
    if (panelMessages.a.length === 0 && panelMessages.b.length === 0) return;

    const timer = window.setTimeout(async () => {
      const state = useSettingsStore.getState();
      const mode = state.splitMode ? 'split' : 'single';
      const now = new Date().toISOString();
      const current = activeRef.current;
      const conversation: Conversation = {
        id: current?.id ?? crypto.randomUUID(),
        title: deriveTitle(panelMessages.a.length > 0 ? panelMessages.a : panelMessages.b),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
        mode,
        modelA: composeModelTag(state.panelA.provider, state.panelA.model),
        modelB:
          mode === 'split'
            ? composeModelTag(state.panelB.provider, state.panelB.model)
            : undefined,
        messagesA: panelMessages.a,
        messagesB: mode === 'split' ? panelMessages.b : undefined,
      };
      await saveConversation(conversation);
      if (!activeRef.current) setActive(conversation);
      setConversations((prev) =>
        [conversation, ...prev.filter((c) => c.id !== conversation.id)].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      );
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

  // ── Totales aproximados de la sesión (footer) ───────────────────────────
  const totals: SessionTotals = useMemo(() => {
    const ctx = readinessFromState(useSettingsStore.getState());
    let tokens = 0;
    let cost = 0;

    const accumulate = (messages: UIMessage[], modelInfo: ModelInfo | undefined) => {
      if (!modelInfo) return;
      for (const message of messages) {
        // Solo se tokeniza la última parte de texto (las anteriores no cambian).
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

  return (
    <div className="flex h-dvh flex-col">
      <StudioHeader
        onMenuClick={() => setMenuOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onNewChat={handleNewChat}
      />

      <div className="flex min-h-0 flex-1">
        {/* Historial — escritorio */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border/40 bg-sidebar md:flex">
          <HistorySidebar
            conversations={conversations}
            activeId={active?.id ?? null}
            onOpen={handleOpenConversation}
            onDelete={handleDeleteConversation}
            onNewChat={handleNewChat}
          />
        </aside>

        {/* Historial — móvil (Sheet) */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="border-b border-border/40">
              <SheetTitle>Historial local</SheetTitle>
            </SheetHeader>
            <div className="flex h-[calc(100%-4rem)] flex-col">
              <HistorySidebar
                conversations={conversations}
                activeId={active?.id ?? null}
                onOpen={handleOpenConversation}
                onDelete={handleDeleteConversation}
                onNewChat={handleNewChat}
              />
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
                onOpenSettings={() => setSettingsOpen(true)}
                showPanelHeader
                className="min-h-0"
              />
              <ChatBox
                key={`b-${chatKey}`}
                panelId="b"
                initialMessages={panelMessages.b}
                onMessagesChange={handleMessagesB}
                onOpenSettings={() => setSettingsOpen(true)}
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
              onOpenSettings={() => setSettingsOpen(true)}
              className="min-h-0"
            />
          )}
        </main>
      </div>

      <StudioFooter totals={totals} />

      <ApiKeyModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
