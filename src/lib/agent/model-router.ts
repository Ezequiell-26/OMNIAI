import type { ExecutionMode } from './runtime';

export interface ModelCandidate {
  provider: string;
  model: string;
  capabilities: string[];
  local?: boolean;
  available?: boolean;
  /** Approximate input USD / 1M tokens. */
  inputCost?: number;
  /** Approximate output USD / 1M tokens. */
  outputCost?: number;
  /** Lower is better; telemetry may replace this with observed latency. */
  latencyMs?: number;
  quality?: number;
  score?: number;
}

export type RoutingPolicy = 'auto' | 'best' | 'fastest' | 'cheapest' | 'private' | 'local';
export type AgentTask = 'planning' | 'coding' | 'testing' | 'review' | 'research' | 'general';

export interface RoutingRequest {
  policy: RoutingPolicy;
  mode: ExecutionMode;
  task: AgentTask;
  candidates: ModelCandidate[];
  requiredCapabilities?: string[];
}

/** Model-agnostic router inspired by production agent frameworks: filter first, then score. */
export function routeModel(request: RoutingRequest): ModelCandidate | null {
  const required = request.requiredCapabilities ?? [];
  const eligible = request.candidates.filter((candidate) => {
    if (candidate.available === false) return false;
    if (request.mode === 'local' || request.policy === 'local') return candidate.local === true;
    if (request.mode === 'private' || request.policy === 'private') return candidate.local === true || candidate.provider !== 'public';
    return required.every((capability) => candidate.capabilities.includes(capability));
  });

  if (eligible.length === 0) return null;
  if (request.policy === 'fastest') return [...eligible].sort((a, b) => (a.latencyMs ?? 9e9) - (b.latencyMs ?? 9e9))[0];
  if (request.policy === 'cheapest') return [...eligible].sort((a, b) => unitCost(a) - unitCost(b))[0];

  const preferred = taskCapabilities(request.task);
  return [...eligible].sort((a, b) => candidateScore(b, preferred, request.policy) - candidateScore(a, preferred, request.policy))[0];
}

function taskCapabilities(task: AgentTask): string[] {
  switch (task) {
    case 'coding': return ['code', 'reasoning', 'long-context'];
    case 'planning': return ['reasoning', 'long-context'];
    case 'testing': return ['code', 'reasoning'];
    case 'review': return ['code', 'security'];
    case 'research': return ['research', 'long-context'];
    default: return ['general'];
  }
}

function candidateScore(candidate: ModelCandidate, preferred: string[], policy: RoutingPolicy): number {
  const capabilityScore = preferred.reduce((total, capability) => total + (candidate.capabilities.includes(capability) ? 12 : 0), 0);
  const qualityScore = (candidate.quality ?? 0) * (policy === 'best' ? 2 : 1);
  const latencyPenalty = (candidate.latencyMs ?? 5000) / 5000;
  const costPenalty = unitCost(candidate);
  return capabilityScore + qualityScore + (candidate.score ?? 0) - latencyPenalty - costPenalty;
}

function unitCost(candidate: ModelCandidate): number {
  return (candidate.inputCost ?? 0) + (candidate.outputCost ?? 0);
}
