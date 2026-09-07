import type { AgentPermission } from './types';

export type PermissionDecision = 'allow-once' | 'allow-session' | 'deny';

export interface ToolPolicyRequest {
  tool: string;
  permission: AgentPermission;
  risk: 'low' | 'medium' | 'high';
  reason: string;
}

const destructivePermissions = new Set<AgentPermission>(['delete_files', 'git']);
const privilegedPermissions = new Set<AgentPermission>(['run_commands', 'network', 'browser']);

export function classifyPermissionRisk(permission: AgentPermission): 'low' | 'medium' | 'high' {
  if (destructivePermissions.has(permission)) return 'high';
  if (privilegedPermissions.has(permission)) return 'medium';
  return 'low';
}

export function defaultDecision(request: ToolPolicyRequest): PermissionDecision {
  if (request.risk === 'high') return 'allow-once';
  if (request.permission === 'read_files') return 'allow-session';
  return 'allow-once';
}

export class SessionPermissionStore {
  private readonly decisions = new Map<string, PermissionDecision>();

  key(tool: string, permission: AgentPermission): string {
    return `${tool}:${permission}`;
  }

  set(tool: string, permission: AgentPermission, decision: PermissionDecision): void {
    this.decisions.set(this.key(tool, permission), decision);
  }

  get(tool: string, permission: AgentPermission): PermissionDecision | undefined {
    return this.decisions.get(this.key(tool, permission));
  }

  clear(): void {
    this.decisions.clear();
  }
}

export function buildPolicyRequest(tool: string, permission: AgentPermission, reason: string): ToolPolicyRequest {
  return { tool, permission, reason, risk: classifyPermissionRisk(permission) };
}
