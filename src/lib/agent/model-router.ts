import type { ExecutionMode, RoutingPolicy } from '../core';

export { type ExecutionMode, type RoutingPolicy } from '../core';

export interface ModelCandidate {
  provider: string;
  model: string;
  capabilities: string[];
  local?: boolean;
  score?: number;
  latencyMs?: number;
  costPerMillion?: number;
  available?: boolean;
}

export interface RoutingRequest {
  policy: RoutingPolicy;
  mode: ExecutionMode;
  task: 'planning' | 'coding' | 'testing' | 'review' | 'research' | 'general';
  candidates: ModelCandidate[];
}

export function routeModel(request: RoutingRequest): ModelCandidate | null {
  const localOnly = request.mode === 'local' || request.policy === 'local';
  const privateOnly = request.mode === 'private' || request.policy === 'private';

  const eligible = request.candidates.filter((candidate) => {
    if (candidate.available === false) return false;
    if (localOnly && candidate.local !== true) return false;
    if (privateOnly && candidate.provider === 'public') return false;
    return true;
  });

  if (!eligible.length) return null;

  if (request.policy === 'fastest') {
    return [...eligible].sort((a, b) => (a.latencyMs ?? Number.POSITIVE_INFINITY) - (b.latencyMs ?? Number.POSITIVE_INFINITY))[0];
  }

  if (request.policy === 'cheapest') {
    return [...eligible].sort((a, b) => (a.costPerMillion ?? Number.POSITIVE_INFINITY) - (b.costPerMillion ?? Number.POSITIVE_INFINITY))[0];
  }

  const preferred =
    request.task === 'coding'
      ? ['code', 'reasoning', 'tools']
      : request.task === 'planning'
        ? ['reasoning', 'long-context']
        : request.task === 'research'
          ? ['web', 'long-context']
          : ['general'];

  return [...eligible].sort((a, b) => score(b, preferred) - score(a, preferred))[0];
}

function score(candidate: ModelCandidate, preferred: string[]) {
  return preferred.reduce((total, capability) => total + (candidate.capabilities.includes(capability) ? 10 : 0), 0) + (candidate.score ?? 0);
}
