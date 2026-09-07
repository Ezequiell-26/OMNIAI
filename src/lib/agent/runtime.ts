import { RunManager } from '../core';
import type { AgentPlan, AgentRunRecord, AgentStatus, ExecutionMode, RoutingPolicy } from '../core';
import { createStarterPlan } from './orchestrator';

export { type ExecutionMode, type RoutingPolicy } from '../core';

export interface AgentRunRequest {
  taskId: string;
  projectId: string;
  goal: string;
  mode: ExecutionMode;
  routingPolicy?: RoutingPolicy;
  provider?: string;
  model?: string;
  agentId?: string;
}

export interface AgentRunSnapshot {
  taskId: string;
  projectId: string;
  mode: ExecutionMode;
  routingPolicy: RoutingPolicy;
  status: AgentStatus;
  plan: AgentPlan;
  activeAgent: string | null;
  runId: string;
}

export class AgentOrchestrator {
  constructor(private readonly runs = new RunManager()) {}

  plan(goal: string): AgentPlan {
    return createStarterPlan(goal);
  }

  async start(request: AgentRunRequest): Promise<AgentRunRecord> {
    const runId = crypto.randomUUID();
    const plan = this.plan(request.goal);
    const run = await this.runs.create({
      id: runId,
      taskId: request.taskId,
      projectId: request.projectId,
      agentId: request.agentId ?? plan.steps[0]?.agent ?? 'architect',
      goal: request.goal,
      mode: request.mode,
      routingPolicy: request.routingPolicy ?? 'auto',
      provider: request.provider,
      model: request.model,
    });
    run.steps = plan.steps;
    await this.runs.setStatus(runId, 'planning');
    return (await this.runs.get(runId))!;
  }

  async transition(runId: string, status: AgentStatus, detail?: string): Promise<AgentRunRecord> {
    return this.runs.setStatus(runId, status, detail);
  }

  async snapshot(request: AgentRunRequest): Promise<AgentRunSnapshot> {
    const run = await this.start(request);
    return {
      taskId: run.taskId,
      projectId: run.projectId,
      mode: run.mode,
      routingPolicy: run.routingPolicy,
      status: run.status,
      plan: { ...this.plan(run.goal), id: `${run.id}-plan` },
      activeAgent: run.agentId,
      runId: run.id,
    };
  }
}
