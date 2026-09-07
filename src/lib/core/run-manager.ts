import { assertTransition } from './state-machine';
import type {
  AgentEvent,
  AgentRunRecord,
  AgentStatus,
  ExecutionMode,
  RoutingPolicy,
  RunError,
  RunPersistence,
  RunUsage,
} from './contracts';

const now = () => new Date().toISOString();

export interface RunManagerOptions {
  persistence?: RunPersistence;
  emit?: (event: AgentEvent) => void;
  limits?: {
    maxSteps?: number;
    maxRuntimeMs?: number;
    maxCost?: number;
  };
}

export class InMemoryRunPersistence implements RunPersistence {
  private readonly runs = new Map<string, AgentRunRecord>();

  async create(run: AgentRunRecord): Promise<void> {
    this.runs.set(run.id, structuredClone(run));
  }

  async get(runId: string): Promise<AgentRunRecord | null> {
    const run = this.runs.get(runId);
    return run ? structuredClone(run) : null;
  }

  async save(run: AgentRunRecord): Promise<void> {
    if (!this.runs.has(run.id)) throw new Error(`Unknown run: ${run.id}`);
    this.runs.set(run.id, structuredClone(run));
  }

  async listByProject(projectId: string): Promise<AgentRunRecord[]> {
    return [...this.runs.values()]
      .filter((run) => run.projectId === projectId)
      .map((run) => structuredClone(run));
  }
}

export class RunManager {
  private readonly persistence: RunPersistence;
  private readonly emit?: (event: AgentEvent) => void;
  private readonly limits: NonNullable<RunManagerOptions['limits']>;

  constructor(options: RunManagerOptions = {}) {
    this.persistence = options.persistence ?? new InMemoryRunPersistence();
    this.emit = options.emit;
    this.limits = {
      maxSteps: 100,
      maxRuntimeMs: 30 * 60_000,
      maxCost: Number.POSITIVE_INFINITY,
      ...options.limits,
    };
  }

  async create(input: {
    id: string;
    taskId: string;
    projectId: string;
    agentId: string;
    goal: string;
    mode: ExecutionMode;
    routingPolicy: RoutingPolicy;
    provider?: string;
    model?: string;
  }): Promise<AgentRunRecord> {
    const run: AgentRunRecord = {
      ...input,
      status: 'idle',
      createdAt: now(),
      usage: {},
      steps: [],
      toolCalls: 0,
      filesChanged: [],
      errors: [],
    };
    await this.persistence.create(run);
    return run;
  }

  async get(runId: string): Promise<AgentRunRecord | null> {
    return this.persistence.get(runId);
  }

  async listByProject(projectId: string): Promise<AgentRunRecord[]> {
    return this.persistence.listByProject(projectId);
  }

  async setStatus(runId: string, next: AgentStatus, detail?: string): Promise<AgentRunRecord> {
    const run = await this.require(runId);
    assertTransition(run.status, next);
    run.status = next;
    if (!run.startedAt && next !== 'idle') run.startedAt = now();
    if (['completed', 'failed', 'cancelled'].includes(next)) run.completedAt = now();
    await this.persistence.save(run);
    this.emit?.({ type: 'agent.status', agentId: run.agentId, taskId: run.taskId, runId, status: next, ts: now(), detail });
    this.emit?.({ type: 'run.updated', taskId: run.taskId, runId, ts: now() });
    return run;
  }

  async updateUsage(runId: string, usage: Partial<RunUsage>): Promise<AgentRunRecord> {
    const run = await this.require(runId);
    const previous = run.usage;
    const inputTokens = usage.inputTokens ?? previous.inputTokens;
    const outputTokens = usage.outputTokens ?? previous.outputTokens;
    const totalTokens = usage.totalTokens ?? (inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : previous.totalTokens);
    run.usage = { ...previous, ...usage, ...(totalTokens !== undefined ? { totalTokens } : {}) };
    await this.persistence.save(run);
    this.emit?.({ type: 'run.updated', taskId: run.taskId, runId, ts: now() });
    return run;
  }

  async incrementToolCalls(runId: string): Promise<AgentRunRecord> {
    const run = await this.require(runId);
    run.toolCalls += 1;
    if (run.toolCalls > this.limits.maxSteps!) {
      throw new Error(`Run exceeded max steps (${this.limits.maxSteps})`);
    }
    await this.persistence.save(run);
    return run;
  }

  async recordFileChange(runId: string, path: string, action: 'created' | 'modified' | 'deleted' = 'modified'): Promise<AgentRunRecord> {
    const run = await this.require(runId);
    if (!run.filesChanged.includes(path)) run.filesChanged.push(path);
    await this.persistence.save(run);
    this.emit?.({ type: 'file.changed', taskId: run.taskId, runId, path, action, ts: now() });
    return run;
  }

  async recordError(runId: string, error: RunError): Promise<AgentRunRecord> {
    const run = await this.require(runId);
    run.errors.push(error);
    await this.persistence.save(run);
    this.emit?.({ type: 'task.failed', taskId: run.taskId, runId, ts: now(), error: error.message });
    return run;
  }

  async result(runId: string, result: string): Promise<AgentRunRecord> {
    const run = await this.require(runId);
    run.result = result;
    await this.persistence.save(run);
    return run;
  }

  private async require(runId: string): Promise<AgentRunRecord> {
    const run = await this.persistence.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    return run;
  }
}
