'use client';

import { useMemo, useState } from 'react';
import { Bot, Check, ChevronRight, CircleDot, FileCode2, GitBranch, Play, ShieldCheck, Terminal, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createStarterPlan } from '@/lib/agent/orchestrator';
import type { AgentPlan, AgentStatus } from '@/lib/agent/types';

const agentMeta: Record<string, { icon: typeof Bot; label: string }> = {
  architect: { icon: WandSparkles, label: 'Architect' },
  coder: { icon: FileCode2, label: 'Coder' },
  tester: { icon: Terminal, label: 'Tester' },
  reviewer: { icon: ShieldCheck, label: 'Reviewer' },
};

const sampleFiles = ['src/app', 'src/components', 'src/lib', 'prisma', 'package.json', '.env.example'];

export function AgentWorkspace() {
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [mode, setMode] = useState<'auto' | 'private' | 'local'>('auto');

  const summary = useMemo(() => plan?.steps.filter((s) => s.status === 'done').length ?? 0, [plan]);

  const start = () => {
    const value = goal.trim() || 'Analiza este proyecto y propone las mejoras prioritarias.';
    setPlan(createStarterPlan(value));
    setStatus('planning');
  };

  const advance = () => {
    if (!plan) return;
    const nextIndex = plan.steps.findIndex((step) => step.status === 'pending');
    if (nextIndex < 0) {
      setStatus('completed');
      return;
    }
    const next = plan.steps[nextIndex];
    const updated = plan.steps.map((step, i) => ({ ...step, status: i === nextIndex ? 'done' : step.status }));
    setPlan({ ...plan, steps: updated });
    setStatus(nextIndex === plan.steps.length - 1 ? 'completed' : 'running');
  };

  return (
    <main className="flex h-dvh min-h-0 bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/30 md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border/50 px-4">
          <div className="grid size-7 place-items-center rounded-lg bg-foreground text-background"><Bot className="size-4" /></div>
          <span className="font-semibold tracking-tight">OmniAI Agent</span>
        </div>
        <div className="p-3">
          <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
          <button className="flex w-full items-center gap-2 rounded-lg bg-accent px-3 py-2 text-left text-sm"><FileCode2 className="size-4" /> OMNIAI <ChevronRight className="ml-auto size-3.5 opacity-50" /></button>
          <div className="mt-4 space-y-1 px-1 text-sm text-muted-foreground">
            {['Agent Runs', 'Conversations', 'Models', 'Git', 'Automations'].map((item) => <div key={item} className="rounded-md px-2.5 py-2 hover:bg-accent hover:text-foreground">{item}</div>)}
          </div>
        </div>
        <div className="mt-auto border-t border-border/50 p-3 text-xs text-muted-foreground">MIT · Local-first · BYOK</div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4 md:px-5">
          <div className="flex items-center gap-2 text-sm"><GitBranch className="size-4 text-muted-foreground" /> web <span className="text-muted-foreground">/</span> Agent Workspace</div>
          <div className="flex items-center gap-2">
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
              <option value="auto">AUTO</option><option value="private">PRIVATE</option><option value="local">LOCAL</option>
            </select>
            <Button size="sm" onClick={start}><Play className="mr-1.5 size-3.5" />Run agent</Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_minmax(0,1fr)_330px]">
          <div className="hidden border-r border-border/60 p-3 lg:block">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Project</div>
            <div className="space-y-1 text-sm">
              {sampleFiles.map((file) => <div key={file} className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">{file}</div>)}
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="border-b border-border/60 p-4">
              <div className="mx-auto max-w-3xl">
                <div className="mb-2 text-sm font-medium">What should OmniAI build?</div>
                <div className="relative">
                  <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Create, fix, refactor, test or deploy…" className="min-h-28 resize-none pr-20" />
                  <Button size="icon" className="absolute bottom-3 right-3" onClick={start} aria-label="Run agent"><Play className="size-4" /></Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                  {['Build feature', 'Fix bug', 'Refactor', 'Review security'].map((x) => <button key={x} onClick={() => setGoal(x)} className="rounded-full border border-border px-2.5 py-1 hover:bg-accent">{x}</button>)}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
              <div className="mx-auto max-w-3xl space-y-4">
                {!plan ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <Bot className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <h1 className="text-lg font-semibold">Autonomous development workspace</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Plan → Execute → Test → Review. Use your configured AI provider or a local endpoint.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
                    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                      <div><div className="text-sm font-semibold">{plan.goal}</div><div className="mt-1 text-xs text-muted-foreground">Mode: {mode.toUpperCase()} · {summary}/{plan.steps.length} steps complete</div></div>
                      <div className={cn('rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider', status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-accent text-muted-foreground')}>{status.replace('_', ' ')}</div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {plan.steps.map((step) => {
                        const meta = agentMeta[step.agent];
                        const Icon = meta?.icon ?? CircleDot;
                        return <div key={step.id} className="flex gap-3 px-4 py-4">
                          <div className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border', step.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-border bg-background text-muted-foreground')}><Icon className="size-4" /></div>
                          <div className="min-w-0"><div className="flex items-center gap-2 text-sm font-medium">{step.title}<span className="text-[10px] uppercase tracking-wider text-muted-foreground">{meta?.label ?? step.agent}</span>{step.status === 'done' && <Check className="size-3.5 text-emerald-500" />}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p></div>
                        </div>;
                      })}
                    </div>
                    {status !== 'completed' && <div className="border-t border-border/60 p-3"><Button variant="outline" className="w-full" onClick={advance}>Advance agent simulation</Button></div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="hidden border-l border-border/60 bg-card/20 lg:flex lg:flex-col">
            <div className="border-b border-border/60 px-4 py-3 text-xs font-semibold">Agent activity</div>
            <div className="flex-1 space-y-3 overflow-auto p-4 text-xs">
              <div className="flex gap-2"><span className="mt-1 size-1.5 rounded-full bg-emerald-500" /><div><div className="font-medium">Workspace ready</div><div className="text-muted-foreground">Repository context available</div></div></div>
              <div className="flex gap-2"><span className="mt-1 size-1.5 rounded-full bg-muted-foreground" /><div><div className="font-medium">Model router</div><div className="text-muted-foreground">Provider selection: {mode.toUpperCase()}</div></div></div>
              {plan && <div className="flex gap-2"><span className="mt-1 size-1.5 rounded-full bg-amber-500" /><div><div className="font-medium">Plan generated</div><div className="text-muted-foreground">{plan.steps.length} agent steps · risk {plan.risk}</div></div></div>}
            </div>
            <div className="border-t border-border/60 p-4 text-[11px] text-muted-foreground">Execution tools, filesystem sandbox and Git adapters plug into the same Agent Core contract.</div>
          </aside>
        </div>
      </section>
    </main>
  );
}
