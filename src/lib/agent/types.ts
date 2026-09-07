export type AgentStatus = 'idle' | 'planning' | 'running' | 'approval_required' | 'testing' | 'reviewing' | 'completed' | 'failed' | 'cancelled';

export type AgentPermission =
  | 'read_files'
  | 'write_files'
  | 'delete_files'
  | 'run_commands'
  | 'network'
  | 'git'
  | 'browser';

export interface AgentToolDefinition<TInput = unknown, TResult = unknown> {
  name: string;
  description: string;
  permissions: AgentPermission[];
  inputSchema?: unknown;
  execute(input: TInput, ctx: ToolExecutionContext): Promise<TResult>;
}

export interface ToolExecutionContext {
  projectId: string;
  workspaceRoot?: string;
  signal?: AbortSignal;
  requestApproval(permission: AgentPermission, reason: string): Promise<boolean>;
  emit(event: AgentEvent): void;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  defaultModel?: { provider: string; model: string };
  permissions: AgentPermission[];
  tools: string[];
}

export interface AgentPlanStep {
  id: string;
  title: string;
  description: string;
  agent: string;
  dependencies: string[];
  status: 'pending' | 'running' | 'done' | 'blocked' | 'failed';
}

export interface AgentPlan {
  id: string;
  goal: string;
  steps: AgentPlanStep[];
  risk: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

export type AgentEvent =
  | { type: 'agent.started'; agentId: string; taskId: string; ts: string }
  | { type: 'agent.status'; agentId: string; taskId: string; status: AgentStatus; ts: string; detail?: string }
  | { type: 'tool.started'; agentId: string; taskId: string; tool: string; ts: string }
  | { type: 'tool.completed'; agentId: string; taskId: string; tool: string; ts: string; ok: boolean }
  | { type: 'approval.requested'; agentId: string; taskId: string; permission: AgentPermission; reason: string; ts: string }
  | { type: 'file.changed'; taskId: string; path: string; action: 'created' | 'modified' | 'deleted'; ts: string }
  | { type: 'task.completed'; taskId: string; ts: string }
  | { type: 'task.failed'; taskId: string; ts: string; error: string };
