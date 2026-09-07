import type {
  AgentPermission,
  AgentToolDefinition,
  RiskLevel,
  ToolExecutionContext,
} from './types';

export interface ToolRegistryPolicy {
  isAllowed?(tool: AgentToolDefinition, permission: AgentPermission, ctx: ToolExecutionContext): Promise<boolean> | boolean;
}

export class ToolRegistry {
  private readonly tools = new Map<string, AgentToolDefinition>();

  constructor(private readonly policy: ToolRegistryPolicy = {}) {}

  register(tool: AgentToolDefinition): void {
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    if (tool.timeoutMs !== undefined && (!Number.isFinite(tool.timeoutMs) || tool.timeoutMs <= 0)) {
      throw new Error(`Invalid timeoutMs for tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): AgentToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): AgentToolDefinition[] {
    return [...this.tools.values()];
  }

  validateInput(tool: AgentToolDefinition, _input: unknown): void {
    // Schema validation is intentionally adapter-driven so the Core remains
    // independent of a specific validation library. Tools may perform their
    // own runtime validation inside execute().
    if (!tool.name.trim()) throw new Error('Tool name cannot be empty');
  }

  riskLevel(tool: AgentToolDefinition): RiskLevel {
    return tool.riskLevel ?? (
      tool.permissions.includes('delete_files')
        ? 'DESTRUCTIVE'
        : tool.permissions.includes('write_files') || tool.permissions.includes('run_commands') || tool.permissions.includes('network') || tool.permissions.includes('git') || tool.permissions.includes('browser')
          ? 'MEDIUM_RISK'
          : 'READ_ONLY'
    );
  }

  async checkPermission(tool: AgentToolDefinition, ctx: ToolExecutionContext): Promise<void> {
    for (const permission of tool.permissions) {
      const allowed = await this.policy.isAllowed?.(tool, permission, ctx);
      if (allowed === false) throw new Error(`Permission denied: ${permission}`);
      if (allowed === true) continue;
      if (this.riskLevel(tool) === 'READ_ONLY' && permission === 'read_files') continue;

      const approved = await ctx.requestApproval(permission, `Agent requests ${permission} for ${tool.name}`, this.riskLevel(tool));
      if (!approved) throw new Error(`Permission denied: ${permission}`);
    }
  }

  async execute(name: string, input: unknown, ctx: ToolExecutionContext): Promise<unknown> {
    const registered = this.get(name);
    if (!registered) throw new Error(`Unknown tool: ${name}`);
    this.validateInput(registered, input);
    await this.checkPermission(registered, ctx);

    ctx.emit({ type: 'tool.started', agentId: ctx.agentId, taskId: ctx.taskId ?? ctx.projectId, runId: ctx.runId, tool: name, ts: new Date().toISOString() });
    try {
      const result = await this.executeWithTimeout(registered, input, ctx);
      ctx.emit({ type: 'tool.completed', agentId: ctx.agentId, taskId: ctx.taskId ?? ctx.projectId, runId: ctx.runId, tool: name, ok: true, ts: new Date().toISOString() });
      return result;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown tool error';
      ctx.emit({ type: 'tool.failed', agentId: ctx.agentId, taskId: ctx.taskId ?? ctx.projectId, runId: ctx.runId, tool: name, ok: false, detail, ts: new Date().toISOString() });
      throw error;
    }
  }

  private async executeWithTimeout(tool: AgentToolDefinition, input: unknown, ctx: ToolExecutionContext): Promise<unknown> {
    const parentSignal = ctx.signal;
    if (parentSignal?.aborted) throw new Error('Tool execution aborted');

    if (!tool.timeoutMs) return tool.execute(input, ctx);

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;
    const toolController = new AbortController();

    try {
      abortListener = () => toolController.abort(parentSignal?.reason);
      parentSignal?.addEventListener('abort', abortListener, { once: true });
      const toolContext = { ...ctx, signal: toolController.signal };
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          toolController.abort(new Error(`Tool timed out after ${tool.timeoutMs}ms`));
          reject(new Error(`Tool timed out after ${tool.timeoutMs}ms: ${tool.name}`));
        }, tool.timeoutMs);
      });

      return await Promise.race([tool.execute(input, toolContext), timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (parentSignal && abortListener) parentSignal.removeEventListener('abort', abortListener);
    }
  }
}

export const requiresPermission = (tool: AgentToolDefinition, permission: AgentPermission) => tool.permissions.includes(permission);
