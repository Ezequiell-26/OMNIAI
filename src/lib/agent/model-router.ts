import type { ExecutionMode } from './runtime';

export interface ModelCandidate {
  provider: string;
  model: string;
  capabilities: string[];
  local?: boolean;
  score?: number;
}

export type RoutingPolicy = 'auto' | 'best' | 'fastest' | 'cheapest' | 'private' | 'local';

export interface RoutingRequest {
  policy: RoutingPolicy;
  mode: ExecutionMode;
  task: 'planning' | 'coding' | 'testing' | 'review' | 'research' | 'general';
  candidates: ModelCandidate[];
}

/** Provider-agnostic model router. Selection policy can later use latency/cost telemetry. */
export function routeModel(request: RoutingRequest): ModelCandidate | null {
  const eligible = request.candidates.filter((candidate) => {
    if (request.mode === 'local' || request.policy === 'local') return candidate.local === true;
    if (request.mode === 'private' || request.policy === 'private') return candidate.provider !== 'public';
    return true;
  });
  if (eligible.length === 0) return null;
  if (request.policy === 'fastest') return eligible[0];
  if (request.policy === 'cheapest') return eligible[eligible.length - 1];
  const preferred = request.task === 'coding' ? ['code', 'reasoning'] : request.task === 'planning' ? ['reasoning'] : ['general'];
  return [...eligible].sort((a, b) => score(b, preferred) - score(a, preferred))[0];
}

function score(candidate: ModelCandidate, preferred: string[]): number {
  const capabilityScore = preferred.reduce((total, capability) => total + (candidate.capabilities.includes(capability) ? 10 : 0), 0);
  return capabilityScore + (candidate.score ?? 0);
}
