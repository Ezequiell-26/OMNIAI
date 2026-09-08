export type ChangeKind = 'create' | 'modify' | 'delete';

export interface WorkspaceAdapter {
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
}

export interface FileChange {
  path: string;
  kind: ChangeKind;
  before: string | null;
  after: string | null;
  beforeHash: string;
  afterHash: string;
}

export interface ChangeSet {
  id: string;
  createdAt: string;
  changes: FileChange[];
}

export class ChangeSetConflictError extends Error {
  readonly path: string;
  readonly expectedHash: string;
  readonly actualHash: string;

  constructor(path: string, expectedHash: string, actualHash: string) {
    super(`ChangeSet conflict for ${path}: workspace changed after the proposal was created.`);
    this.name = 'ChangeSetConflictError';
    this.path = path;
    this.expectedHash = expectedHash;
    this.actualHash = actualHash;
  }
}

export class ChangeSetApplyError extends Error {
  readonly appliedPaths: string[];

  constructor(message: string, appliedPaths: string[]) {
    super(message);
    this.name = 'ChangeSetApplyError';
    this.appliedPaths = appliedPaths;
  }
}

const encoder = new TextEncoder();

export async function contentHash(content: string | null): Promise<string> {
  if (content === null) return 'missing';
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(content));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createChangeSet(
  adapter: WorkspaceAdapter,
  changes: Array<{ path: string; after: string | null }>,
): Promise<ChangeSet> {
  const normalized = [...changes].sort((a, b) => a.path.localeCompare(b.path));
  const fileChanges: FileChange[] = [];

  for (const change of normalized) {
    const before = await adapter.read(change.path);
    const kind: ChangeKind = before === null ? 'create' : change.after === null ? 'delete' : 'modify';
    if (before === change.after) continue;
    fileChanges.push({
      path: change.path,
      kind,
      before,
      after: change.after,
      beforeHash: await contentHash(before),
      afterHash: await contentHash(change.after),
    });
  }

  return {
    id: globalThis.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    changes: fileChanges,
  };
}

export async function detectConflicts(changeSet: ChangeSet, adapter: WorkspaceAdapter): Promise<string[]> {
  const conflicts: string[] = [];
  for (const change of changeSet.changes) {
    const current = await adapter.read(change.path);
    const currentHash = await contentHash(current);
    if (currentHash !== change.beforeHash) conflicts.push(change.path);
  }
  return conflicts;
}

export async function applyChangeSet(changeSet: ChangeSet, adapter: WorkspaceAdapter): Promise<void> {
  const conflicts = await detectConflicts(changeSet, adapter);
  if (conflicts.length) {
    const first = changeSet.changes.find((change) => change.path === conflicts[0]);
    const actual = await contentHash(await adapter.read(conflicts[0]));
    throw new ChangeSetConflictError(conflicts[0], first?.beforeHash ?? 'missing', actual);
  }

  const applied: FileChange[] = [];
  try {
    for (const change of changeSet.changes) {
      if (change.after === null) await adapter.delete(change.path);
      else await adapter.write(change.path, change.after);
      applied.push(change);
    }
  } catch (error) {
    for (const change of [...applied].reverse()) {
      try {
        if (change.before === null) await adapter.delete(change.path);
        else await adapter.write(change.path, change.before);
      } catch {
        // Best-effort rollback. The original error is still surfaced below.
      }
    }
    const detail = error instanceof Error ? error.message : 'Unknown ChangeSet error';
    throw new ChangeSetApplyError(detail, applied.map((change) => change.path));
  }
}

export function previewChangeSet(changeSet: ChangeSet): ReadonlyArray<Pick<FileChange, 'path' | 'kind' | 'beforeHash' | 'afterHash'>> {
  return changeSet.changes.map(({ path, kind, beforeHash, afterHash }) => ({ path, kind, beforeHash, afterHash }));
}
