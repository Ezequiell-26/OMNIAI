import type { AgentStatus } from './contracts';

const TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  idle: ['planning', 'cancelled'],
  planning: ['context_building', 'waiting_approval', 'failed', 'cancelled'],
  context_building: ['running', 'waiting_approval', 'failed', 'cancelled'],
  running: ['waiting_tool', 'waiting_approval', 'editing', 'testing', 'reviewing', 'recovering', 'paused', 'completed', 'failed', 'cancelled'],
  waiting_tool: ['running', 'failed', 'cancelled'],
  waiting_approval: ['running', 'editing', 'cancelled', 'failed'],
  editing: ['running', 'testing', 'waiting_approval', 'failed', 'cancelled'],
  testing: ['running', 'recovering', 'reviewing', 'completed', 'failed', 'cancelled'],
  reviewing: ['running', 'completed', 'recovering', 'failed', 'cancelled'],
  recovering: ['planning', 'context_building', 'running', 'testing', 'failed', 'cancelled'],
  paused: ['running', 'cancelled', 'failed'],
  completed: [],
  failed: ['planning', 'recovering'],
  cancelled: [],
};

export class InvalidAgentTransitionError extends Error {
  constructor(from: AgentStatus, to: AgentStatus) {
    super(`Invalid agent transition: ${from} -> ${to}`);
    this.name = 'InvalidAgentTransitionError';
  }
}

export function canTransition(from: AgentStatus, to: AgentStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AgentStatus, to: AgentStatus): void {
  if (!canTransition(from, to)) throw new InvalidAgentTransitionError(from, to);
}

export function transition(from: AgentStatus, to: AgentStatus): AgentStatus {
  assertTransition(from, to);
  return to;
}
