import {
  AIGateway,
  RunManager,
  type AIMessage,
  type AIRequest,
  type AgentEvent,
  type AgentRunRecord,
  type ToolExecutionContext,
} from '../core';
import type { ToolRegistry } from './tool-registry';

export interface AgentExecutionInput {
  runId: string;
  taskId: string;
  projectId: string;
  agentId: string;
  provider: string;
  model: string;
  mode: AgentRunRecord['mode'];
  messages: AIMessage[];
  maxTurns?: number;
  signal?: AbortSignal;
  requestApproval: ToolExecutionContext['requestApproval'];
  emit?: (event: AgentEvent) => void;
}

export interface AgentExecutionResult {
  run: AgentRunRecord;
  messages: AIMessage[];
  finalText: string;
  turns: number;
}

export class AgentExecutionEngine {
  constructor(
    private readonly gateway: AIGateway,
    private readonly tools: ToolRegistry,
    private readonly runs: RunManager,
  ) {}

  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const run = await this.runs.get(input.runId);
    if (!run) throw new Error(`Unknown run: ${input.runId}`);

    const maxTurns = Math.max(1, Math.min(input.maxTurns ?? 20, 100));
    const messages = [...input.messages];
    let finalText = '';
    let turns = 0;

    await this.runs.setStatus(input.runId, 'running');

    while (turns < maxTurns) {
      if (input.signal?.aborted) {
        await this.runs.setStatus(input.runId, 'cancelled');
        break;
      }

      turns += 1;
      const request: AIRequest = {
        provider: input.provider,
        model: input.model,
        mode: input.mode,
        messages,
        tools: this.tools.list().map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
        signal: input.signal,
      };

      let response;
      try {
        response = await this.gateway.generate(request);
        if (response.usage) await this.runs.updateUsage(input.runId, response.usage);
        input.emit?.({ type: 'agent.thinking', taskId: input.taskId, runId: input.runId, agentId: input.agentId, ts: new Date().toISOString() });
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Provider error';
        await this.runs.recordError(input.runId, {
          code: 'AI_PROVIDER_ERROR',
          message: detail,
          recoverable: true,
          ts: new Date().toISOString(),
        });
        await this.runs.setStatus(input.runId, 'recovering', detail);
        throw error;
      }

      if (response.text) {
        finalText += response.text;
        messages.push({ role: 'assistant', content: response.text });
        input.emit?.({ type: 'agent.message', taskId: input.taskId, runId: input.runId, agentId: input.agentId, detail: response.text, ts: new Date().toISOString() });
      }

      if (!response.toolCalls.length) {
        await this.runs.result(input.runId, finalText);
        await this.runs.setStatus(input.runId, 'completed');
        input.emit?.({ type: 'run.completed', taskId: input.taskId, runId: input.runId, ts: new Date().toISOString() });
        return { run: (await this.runs.get(input.runId))!, messages, finalText, turns };
      }

      await this.runs.setStatus(input.runId, 'waiting_tool');

      for (const call of response.toolCalls) {
        await this.runs.incrementToolCalls(input.runId);
        const ctx: ToolExecutionContext = {
          projectId: input.projectId,
          taskId: input.taskId,
          runId: input.runId,
          agentId: input.agentId,
          signal: input.signal,
          requestApproval: input.requestApproval,
          emit: (event) => input.emit?.(event),
        };

        try {
          const result = await this.tools.execute(call.name, call.input, ctx);
          messages.push({ role: 'tool', content: JSON.stringify({ callId: call.id, name: call.name, result }) });
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Tool error';
          messages.push({ role: 'tool', content: JSON.stringify({ callId: call.id, name: call.name, error: detail }) });
          await this.runs.recordError(input.runId, {
            code: 'TOOL_ERROR',
            message: detail,
            recoverable: true,
            ts: new Date().toISOString(),
          });
        }
      }

      await this.runs.setStatus(input.runId, 'running');
    }

    if (turns >= maxTurns) {
      await this.runs.recordError(input.runId, {
        code: 'MAX_TURNS',
        message: `Agent reached maximum turns (${maxTurns})`,
        recoverable: false,
        ts: new Date().toISOString(),
      });
      await this.runs.setStatus(input.runId, 'failed', 'Maximum turns reached');
    }

    return { run: (await this.runs.get(input.runId))!, messages, finalText, turns };
  }
}
