import { createStarterPlan } from './orchestrator';
import type { AgentPlan, AgentStatus } from './types';

export type ExecutionMode = 'cloud' | 'private' | 'local';

export interface AgentRunRequest {
  taskId: string;
  projectId: string;
  goal: string;
  mode: ExecutionMode;
  provider?: string;
  model?: string;
}

export interface AgentRunSnapshot {
  taskId: string;
  projectId: string;
  mode: ExecutionMode;
  status: AgentStatus;
  plan: AgentPlan;
  activeAgent: string | null;
}

export class AgentOrchestrator {
  plan(goal: string): AgentPlan {
    return createStarterPlan(goal);
  }

  initialSnapshot(request: AgentRunRequest): AgentRunSnapshot {
    return {
      taskId: request.taskId,
      projectId: request.projectId,
      mode: request.mode,
      status: 'planning',
      plan: this.plan(request.goal),
      activeAgent: 'architect',
    };
  }
}
