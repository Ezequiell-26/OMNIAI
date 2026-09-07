'use client';

import { useMemo, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collapseUnchangedContext, type DiffLine, type FileDiff } from '@/lib/diff/compute-diff';

function LineRow({ line }: { line: DiffLine }) {
  const prefix = line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' ';
  return (
    <div className={cn('flex font-mono text-[12px] leading-relaxed', line.kind === 'added' && 'bg-emerald-500/10', line.kind === 'removed' && 'bg-red-500/10')}>
      <span className="w-9 shrink-0 select-none border-r border-white/5 pr-2 text-right text-muted-foreground/45">{line.oldLineNumber ?? ''}</span>
      <span className="w-9 shrink-0 select-none border-r border-white/5 pr-2 text-right text-muted-foreground/45">{line.newLineNumber ?? ''}</span>
      <span className={cn('w-5 shrink-0 select-none text-center', line.kind === 'added' ? 'text-emerald-400' : line.kind === 'removed' ? 'text-red-400' : 'text-muted-foreground/50')}>{prefix}</span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap break-all pr-3 text-foreground/90">{line.text || '\u00a0'}</span>
    </div>
  );
}

export function DiffView({ diff, context = 3 }: { diff: FileDiff; context?: number }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const entries = useMemo(() => collapseUnchangedContext(diff, context), [diff, context]);
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-[#0b0e14]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <span className="truncate font-mono text-[11px] text-muted-foreground">{diff.path}{diff.isNew && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-400">nuevo</span>}</span>
        <span className="font-mono text-[11px]"><span className="text-emerald-400">+{diff.additions}</span>{' '}<span className="text-red-400">−{diff.deletions}</span></span>
      </div>
      <div className="max-h-96 overflow-auto py-1">
        {entries.map((entry, index) => entry.kind === 'collapsed' ? (
          expanded.has(index) ? null : (
            <button key={index} type="button" onClick={() => setExpanded((prev) => new Set(prev).add(index))} className="flex w-full items-center gap-1.5 border-y border-white/5 px-3 py-1 font-mono text-[11px] text-muted-foreground/70 hover:bg-white/5">
              <ChevronsUpDown className="size-3" /> {entry.count} {entry.count === 1 ? 'línea sin cambios' : 'líneas sin cambios'}
            </button>
          )
        ) : <LineRow key={index} line={entry} />)}
      </div>
    </div>
  );
}
