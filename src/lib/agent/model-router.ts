import type { ExecutionMode } from './runtime';
export type RoutingPolicy = 'auto'|'best'|'fastest'|'cheapest'|'private'|'local';
export interface ModelCandidate { provider: string; model: string; capabilities: string[]; local?: boolean; score?: number; latencyMs?: number; costPerMillion?: number; available?: boolean; }
export interface RoutingRequest { policy: RoutingPolicy; mode: ExecutionMode; task: 'planning'|'coding'|'testing'|'review'|'research'|'general'; candidates: ModelCandidate[]; }
export function routeModel(r: RoutingRequest) {
  const eligible = r.candidates.filter((c) => (c.available ?? true) && !(r.mode === 'local' || r.policy === 'local') || c.local === true).filter((c) => !(r.mode === 'local' || r.policy === 'local') || c.local === true);
  if (!eligible.length) return null;
  if (r.policy === 'fastest') return [...eligible].sort((a,b)=>(a.latencyMs??1e9)-(b.latencyMs??1e9))[0];
  if (r.policy === 'cheapest') return [...eligible].sort((a,b)=>(a.costPerMillion??0)-(b.costPerMillion??0))[0];
  const preferred = r.task === 'coding' ? ['code','reasoning','tools'] : r.task === 'planning' ? ['reasoning','long-context'] : r.task === 'research' ? ['web','long-context'] : ['general'];
  return [...eligible].sort((a,b)=>score(b,preferred)-score(a,preferred))[0];
}
function score(c: ModelCandidate, preferred: string[]) { return preferred.reduce((n,p)=>n+(c.capabilities.includes(p)?10:0),0)+(c.score??0); }
