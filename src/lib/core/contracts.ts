export const OMNIAI_CORE_VERSION = '1.1.0';

export type AgentStatus =
  | 'idle'
  | 'planning'
  | 'context_building'
  | 'running'
  | 'waiting_tool'
  | 'waiting_approval'
  | 'editing'
  | 'testing'
  | 'reviewing'
  | 'recovering'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentPermission =
  | 'read_files'
  | 'write_files'
  | 'delete_files'
  | 'run_commands'
  | 'network'
  | 'git'
  | 'browser';

export type RiskLevel = 'READ_ONLY' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'DESTRUCTIVE';
export type ApprovalDecision = 'approve_once' | 'approve_session' | 'deny' | 'always_deny';
export type ExecutionMode = 'cloud' | 'private' | 'local';
export type RoutingPolicy = 'auto' | 'best' | 'fastest' | 'cheapest' | 'private' | 'local';
export type RunAction = 'start' | 'pause' | 'resume' | 'cancel' | 'retry' | 'continue';

export interface AgentToolDefinition<TInput = unknown, TResult = unknown> {
  name: string;
  description: string;
  permissions: AgentPermission[];
  riskLevel?: RiskLevel;
  timeoutMs?: number;
  supportsStreaming?: boolean;
  platforms?: Array<'web' | 'windows' | 'server' | 'any'>;
  capabilities?: string[];
  inputSchema?: unknown;
  outputSchema?: unknown;
  execute(input: TInput, ctx: ToolExecutionContext): Promise<TResult>;
}

export interface ToolExecutionContext {
  projectId: string;
  taskId?: string;
  runId?: string;
  agentId?: string;
  workspaceRoot?: string;
  signal?: AbortSignal;
  requestApproval(permission: AgentPermission, reason: string, risk?: RiskLevel): Promise<boolean>;
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
  capabilities?: string[];
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

export interface CoreCapabilityMap {
  web: boolean;
  windows: boolean;
  localFiles: boolean;
  git: boolean;
  sandbox: boolean;
  mcp: boolean;
  multiAgent: boolean;
}

export interface RunError {
  code: string;
  message: string;
  recoverable: boolean;
  ts: string;
}

export interface RunUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  latencyMs?: number;
}

export interface AgentRunRecord {
  id: string;
  taskId: string;
  projectId: string;
  agentId: string;
  status: AgentStatus;
  goal: string;
  mode: ExecutionMode;
  routingPolicy: RoutingPolicy;
  provider?: string;
  model?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  usage: RunUsage;
  steps: AgentPlanStep[];
  toolCalls: number;
  filesChanged: string[];
  testsPassed?: boolean;
  errors: RunError[];
  result?: string;
}

export interface RunPersistence {
  create(run: AgentRunRecord): Promise<void>;
  get(runId: string): Promise<AgentRunRecord | null>;
  save(run: AgentRunRecord): Promise<void>;
  listByProject(projectId: string): Promise<AgentRunRecord[]>;
}

export interface AgentEventBase {
  taskId: string;
  runId?: string;
  ts: string;
}

export type AgentEvent =
  | (AgentEventBase & { type: 'run.started' | 'run.updated' | 'run.paused' | 'run.resumed' | 'run.completed' | 'run.failed' | 'run.cancelled' })
  | (AgentEventBase & { type: 'agent.started' | 'agent.thinking' | 'agent.message'; agentId: string; detail?: string })
  | (AgentEventBase & { type: 'agent.status'; agentId: string; status: AgentStatus; detail?: string })
  | (AgentEventBase & { type: 'tool.started' | 'tool.completed' | 'tool.failed'; agentId?: string; tool: string; ok?: boolean; detail?: string })
  | (AgentEventBase & { type: 'approval.requested' | 'approval.granted' | 'approval.denied'; agentId?: string; permission: AgentPermission; reason?: string; decision?: ApprovalDecision })
  | (AgentEventBase & { type: 'file.read' | 'file.changed' | 'file.deleted'; path: string; action?: 'created' | 'modified' | 'deleted' })
  | (AgentEventBase & { type: 'git.status' | 'git.diff' | 'git.commit' | 'git.push'; detail?: string })
  | (AgentEventBase & { type: 'terminal.started' | 'terminal.completed' | 'terminal.failed'; command?: string; exitCode?: number; detail?: string })
  | (AgentEventBase & { type: 'test.started' | 'test.completed' | 'test.failed'; command?: string; passed?: boolean; detail?: string })
  | (AgentEventBase & { type: 'review.started' | 'review.completed'; detail?: string })
  | (AgentEventBase & { type: 'task.completed' | 'task.failed'; error?: string });

export interface CoreEventSink {
  emit(event: AgentEvent): void;
  subscribe(listener: (event: AgentEvent) => void): () => void;
}

export interface CoreConfig {
  version?: string;
  mode?: ExecutionMode;
  routingPolicy?: RoutingPolicy;
  capabilities?: Partial<CoreCapabilityMap>;
}
