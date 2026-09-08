import { describe, expect, test } from 'bun:test';
import {
  ChangeSetApplyError,
  ChangeSetConflictError,
  applyChangeSet,
  contentHash,
  createChangeSet,
  detectConflicts,
  previewChangeSet,
  type WorkspaceAdapter,
} from '../change-set';

class MemoryWorkspace implements WorkspaceAdapter {
  constructor(private readonly files: Map<string, string>, private readonly failOnWrite?: string) {}

  async read(path: string): Promise<string | null> {
    return this.files.has(path) ? this.files.get(path)! : null;
  }

  async write(path: string, content: string): Promise<void> {
    if (path === this.failOnWrite) throw new Error(`write failed: ${path}`);
    this.files.set(path, content);
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }
}

describe('ChangeSet engine', () => {
  test('captures before/after hashes and deterministic preview', async () => {
    const workspace = new MemoryWorkspace(new Map([['a.ts', 'old']]));
    const changeSet = await createChangeSet(workspace, [
      { path: 'b.ts', after: 'new file' },
      { path: 'a.ts', after: 'new' },
    ]);

    expect(changeSet.changes.map((change) => change.path)).toEqual(['a.ts', 'b.ts']);
    expect(changeSet.changes[0].kind).toBe('modify');
    expect(changeSet.changes[1].kind).toBe('create');
    expect(changeSet.changes[0].beforeHash).toBe(await contentHash('old'));
    expect(previewChangeSet(changeSet)).toHaveLength(2);
  });

  test('detects stale workspace content before applying', async () => {
    const workspace = new MemoryWorkspace(new Map([['app.ts', 'v1']]));
    const changeSet = await createChangeSet(workspace, [{ path: 'app.ts', after: 'v2' }]);
    await workspace.write('app.ts', 'external edit');

    expect(await detectConflicts(changeSet, workspace)).toEqual(['app.ts']);
    await expect(applyChangeSet(changeSet, workspace)).rejects.toBeInstanceOf(ChangeSetConflictError);
    expect(await workspace.read('app.ts')).toBe('external edit');
  });

  test('rolls back already-applied files when a later write fails', async () => {
    const workspace = new MemoryWorkspace(new Map([
      ['one.ts', 'one-old'],
      ['two.ts', 'two-old'],
    ]), 'two.ts');
    const changeSet = await createChangeSet(workspace, [
      { path: 'one.ts', after: 'one-new' },
      { path: 'two.ts', after: 'two-new' },
    ]);

    await expect(applyChangeSet(changeSet, workspace)).rejects.toBeInstanceOf(ChangeSetApplyError);
    expect(await workspace.read('one.ts')).toBe('one-old');
    expect(await workspace.read('two.ts')).toBe('two-old');
  });
});
