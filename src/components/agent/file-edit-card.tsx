'use client';

import { useState } from 'react';
import { Check, FileEdit, Loader2, X } from 'lucide-react';
import { DiffView } from './diff-view';
import { applyPendingEdit, discardPendingEdit } from '@/lib/agent/tools/file-tools';
import type { FileDiff } from '@/lib/diff/compute-diff';

export function FileEditCard({ pendingEditId, diff, onResolved }: { pendingEditId: string; diff: FileDiff; onResolved?: (status: 'applied'|'discarded') => void }) {
  const [status, setStatus] = useState<'pending'|'applying'|'applied'|'discarded'|'error'>('pending'); const [error, setError] = useState('');
  const apply = async () => { setStatus('applying'); try { await applyPendingEdit(pendingEditId); setStatus('applied'); onResolved?.('applied'); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo aplicar.'); setStatus('error'); } };
  const discard = async () => { await discardPendingEdit(pendingEditId); setStatus('discarded'); onResolved?.('discarded'); };
  return <div className="my-1.5 overflow-hidden rounded-xl border border-border/50 bg-card/50"><div className="flex items-center gap-2 border-b border-border/40 px-3 py-2 text-xs"><FileEdit className="size-3.5"/><span className="min-w-0 flex-1 truncate font-medium">{diff.isNew ? 'Crear' : 'Editar'}: {diff.path}</span>{status === 'pending' && <div className="flex gap-1.5"><button onClick={discard} className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground hover:bg-white/5"><X className="mr-1 inline size-3"/>Descartar</button><button onClick={apply} className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-400 hover:bg-emerald-500/25"><Check className="mr-1 inline size-3"/>Aplicar</button></div>}{status === 'applying' && <span className="text-muted-foreground"><Loader2 className="mr-1 inline size-3 animate-spin"/>aplicando…</span>}{status === 'applied' && <span className="text-emerald-400">✓ Aplicado</span>}{status === 'discarded' && <span className="text-muted-foreground">Descartado</span>}</div><div className="p-2"><DiffView diff={diff}/></div>{status === 'error' && <p className="border-t border-border/40 px-3 py-2 text-xs text-destructive">{error}</p>}</div>;
}
