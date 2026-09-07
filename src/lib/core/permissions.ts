import type {
  AgentPermission,
  ApprovalDecision,
  RiskLevel,
} from './contracts';

export interface PermissionRequest {
  permission: AgentPermission;
  risk: RiskLevel;
  tool: string;
  reason: string;
  destructive?: boolean;
}

export interface PermissionPolicy {
  defaultReadOnly: 'allow' | 'deny';
  write: 'allow' | 'ask' | 'deny';
  delete: 'allow' | 'ask' | 'deny';
  terminal: 'allow' | 'ask' | 'deny';
  network: 'allow' | 'ask' | 'deny';
  gitCommit: 'allow' | 'ask' | 'deny';
  gitPush: 'allow' | 'ask' | 'deny';
  browser: 'allow' | 'ask' | 'deny';
}

export const DEFAULT_PERMISSION_POLICY: PermissionPolicy = {
  defaultReadOnly: 'allow',
  write: 'ask',
  delete: 'ask',
  terminal: 'ask',
  network: 'ask',
  gitCommit: 'ask',
  gitPush: 'ask',
  browser: 'ask',
};

const SESSION_APPROVALS = new Set<string>();
const ALWAYS_DENIED = new Set<string>();

const policyFor = (permission: AgentPermission, policy: PermissionPolicy) => {
  switch (permission) {
    case 'read_files': return policy.defaultReadOnly;
    case 'write_files': return policy.write;
    case 'delete_files': return policy.delete;
    case 'run_commands': return policy.terminal;
    case 'network': return policy.network;
    case 'git': return policy.gitCommit;
    case 'browser': return policy.browser;
  }
};

export class PermissionManager {
  constructor(private readonly policy: PermissionPolicy = DEFAULT_PERMISSION_POLICY) {}

  evaluate(request: PermissionRequest): 'allow' | 'ask' | 'deny' {
    const key = this.key(request);
    if (ALWAYS_DENIED.has(key)) return 'deny';
    if (SESSION_APPROVALS.has(key)) return 'allow';
    if (request.risk === 'DESTRUCTIVE' || request.destructive) return 'ask';
    if (request.permission === 'git' && request.tool === 'git_push') return 'ask';
    return policyFor(request.permission, this.policy);
  }

  remember(decision: ApprovalDecision, request: PermissionRequest): void {
    const key = this.key(request);
    if (decision === 'approve_session') SESSION_APPROVALS.add(key);
    if (decision === 'always_deny') ALWAYS_DENIED.add(key);
  }

  clearSession(): void {
    SESSION_APPROVALS.clear();
  }

  private key(request: PermissionRequest): string {
    return `${request.permission}:${request.tool}`;
  }
}
