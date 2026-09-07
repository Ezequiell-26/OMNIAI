import { describe, expect, test } from 'bun:test';
import { ToolRegistry } from '../tool-registry';
import type { AgentToolDefinition, ToolExecutionContext } from '../../core';

const makeContext = (onApproval: () => Promise<boolean>): ToolExecutionContext => ({
  projectId: 'project-test',
  taskId: 'task-test',
  runId: 'run-test',
  agentId: 'agent-test',
  requestApproval: async () => onApproval(),
  emit: () => undefined,
});

describe('ToolRegistry', () => {
  test('does not require approval for read-only file tools by default', async () => {
    let approvals = 0;
    const registry = new ToolRegistry();
    const tool: AgentToolDefinition = {
      name: 'read_file',
      description: 'Read a file',
      permissions: ['read_files'],
      execute: async () => 'ok',
    };

    registry.register(tool);
    const result = await registry.execute('read_file', {}, makeContext(async () => {
      approvals += 1;
      return true;
    }));

    expect(result).toBe('ok');
    expect(approvals).toBe(0);
  });

  test('requires approval for mutating tools', async () => {
    let approvals = 0;
    const registry = new ToolRegistry();
    const tool: AgentToolDefinition = {
      name: 'write_file',
      description: 'Write a file',
      permissions: ['write_files'],
      execute: async () => 'written',
    };

    registry.register(tool);
    await registry.execute('write_file', {}, makeContext(async () => {
      approvals += 1;
      return true;
    }));

    expect(approvals).toBe(1);
  });

  test('enforces a registered timeout and aborts the tool signal', async () => {
    let aborted = false;
    const registry = new ToolRegistry();
    const tool: AgentToolDefinition = {
      name: 'slow_tool',
      description: 'Slow test tool',
      permissions: ['read_files'],
      timeoutMs: 10,
      execute: async (_input, ctx) => {
        await new Promise<void>((resolve) => {
          const onAbort = () => {
            aborted = true;
            resolve();
          };
          if (ctx.signal?.aborted) return onAbort();
          ctx.signal?.addEventListener('abort', onAbort, { once: true });
        });
        return 'never-returned';
      },
    };

    registry.register(tool);
    await expect(registry.execute('slow_tool', {}, makeContext(async () => true))).rejects.toThrow('timed out');
    expect(aborted).toBe(true);
  });
});
