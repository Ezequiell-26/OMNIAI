import type { AgentPermission, AgentToolDefinition, ToolExecutionContext } from './types';

export class ToolRegistry {
  private readonly tools = new Map<string, AgentToolDefinition>();
  register(tool: AgentToolDefinition): void { if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`); this.tools.set(tool.name, tool); }
  get(name: string): AgentToolDefinition | undefined { return this.tools.get(name); }
  list(): AgentToolDefinition[] { return [...this.tools.values()]; }
  async execute(name: string, input: unknown, ctx: ToolExecutionContext): Promise<unknown> {
    const registered = this.get(name);
    if (!registered) throw new Error(`Unknown tool: ${name}`);
    for (const permission of registered.permissions) {
      if (!await ctx.requestApproval(permission, `Agent requests ${permission} for ${name}`)) throw new Error(`Permission denied: ${permission}`);
    }
    ctx.emit({ type: 'tool.started', agentId: 'runtime', taskId: ctx.projectId, tool: name, ts: new Date().toISOString() });
    try {
      const result = await registered.execute(input, ctx);
      ctx.emit({ type: 'tool.completed', agentId: 'runtime', taskId: ctx.projectId, tool: name, ok: true, ts: new Date().toISOString() });
      return result;
    } catch (error) {
      ctx.emit({ type: 'tool.completed', agentId: 'runtime', taskId: ctx.projectId, tool: name, ok: false, ts: new Date().toISOString() });
      throw error;
    }
  }
}

export const requiresPermission = (tool: AgentToolDefinition, permission: AgentPermission) => tool.permissions.includes(permission);
