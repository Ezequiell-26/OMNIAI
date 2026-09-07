import { describe, expect, test } from 'bun:test';
import { InMemoryRunPersistence, RunManager } from '../run-manager';

describe('run manager', () => {
  test('persists status and usage updates', async () => {
    const runs = new RunManager({ persistence: new InMemoryRunPersistence() });
    const run = await runs.create({
      id: 'run-1',
      taskId: 'task-1',
      projectId: 'project-1',
      agentId: 'coder',
      goal: 'fix a bug',
      mode: 'local',
      routingPolicy: 'auto',
    });

    await runs.setStatus(run.id, 'planning');
    await runs.setStatus(run.id, 'context_building');
    await runs.setStatus(run.id, 'running');
    await runs.updateUsage(run.id, { inputTokens: 10, outputTokens: 15 });

    const saved = await runs.get(run.id);
    expect(saved?.status).toBe('running');
    expect(saved?.usage.totalTokens).toBe(25);
  });

  test('tracks tool and file changes', async () => {
    const runs = new RunManager({ persistence: new InMemoryRunPersistence(), limits: { maxSteps: 2 } });
    const run = await runs.create({
      id: 'run-2',
      taskId: 'task-2',
      projectId: 'project-2',
      agentId: 'coder',
      goal: 'edit',
      mode: 'local',
      routingPolicy: 'auto',
    });

    await runs.incrementToolCalls(run.id);
    await runs.recordFileChange(run.id, 'src/app.ts', 'modified');

    const saved = await runs.get(run.id);
    expect(saved?.toolCalls).toBe(1);
    expect(saved?.filesChanged).toEqual(['src/app.ts']);
  });
});
