import type { AgentPlan, AgentPlanStep, AgentStatus } from './types';

export interface RunState {
  status: AgentStatus;
  currentStepId: string | null;
  completedSteps: string[];
  attempts: number;
  maxAttempts: number;
}

export function createRunState(plan: AgentPlan, maxAttempts = 3): RunState {
  return {
    status: 'planning',
    currentStepId: plan.steps[0]?.id ?? null,
    completedSteps: [],
    attempts: 0,
    maxAttempts,
  };
}

export function nextExecutableStep(plan: AgentPlan, state: RunState): AgentPlanStep | null {
  return plan.steps.find((step) =>
    step.status === 'pending' && step.dependencies.every((id) => state.completedSteps.includes(id)),
  ) ?? null;
}

export function canRetry(state: RunState): boolean {
  return state.attempts < state.maxAttempts;
}

export function markStepRunning(state: RunState, step: AgentPlanStep): RunState {
  return { ...state, status: 'running', currentStepId: step.id, attempts: state.attempts + 1 };
}

export function markStepCompleted(state: RunState, stepId: string, plan: AgentPlan): RunState {
  const completedSteps = state.completedSteps.includes(stepId) ? state.completedSteps : [...state.completedSteps, stepId];
  const remaining = plan.steps.some((step) => !completedSteps.includes(step.id));
  return {
    ...state,
    status: remaining ? 'running' : 'completed',
    currentStepId: remaining ? nextExecutableStep(plan, { ...state, completedSteps })?.id ?? null : null,
    attempts: 0,
    completedSteps,
  };
}

export function markRunFailed(state: RunState): RunState {
  return { ...state, status: 'failed', currentStepId: null };
}
