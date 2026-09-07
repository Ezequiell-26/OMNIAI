import { openDB } from 'idb';

const DB_NAME = 'omniai-workspace'; const DB_VERSION = 1; const STORE = 'handles'; const ROOT_KEY = 'root';
const IGNORED = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.turbo', '.cache', 'coverage', '.vercel', '.idea', '.vscode']);
const MAX_READABLE_BYTES = 2 * 1024 * 1024;

type PermissionState = 'granted' | 'denied' | 'prompt';
type ExtendedWindow = Window & { showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle> };
type ExtendedDir = FileSystemDirectoryHandle & { queryPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>; requestPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState> };

export interface WorkspaceFile { path: string; size: number; }
export class WorkspaceFsError extends Error { constructor(message: string, readonly code: 'unsupported'|'no-workspace'|'permission-denied'|'not-found'|'too-large') { super(message); this.name = 'WorkspaceFsError'; } }

async function db() { return openDB(DB_NAME, DB_VERSION, { upgrade(database) { if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE); } }); }
export const isWorkspaceFsSupported = () => typeof window !== 'undefined' && typeof (window as ExtendedWindow).showDirectoryPicker === 'function';

export async function pickWorkspaceRoot(): Promise<FileSystemDirectoryHandle> {
  if (!isWorkspaceFsSupported()) throw new WorkspaceFsError('Este navegador no soporta acceso a carpetas locales.', 'unsupported');
  const handle = await (window as ExtendedWindow).showDirectoryPicker!({ mode: 'readwrite' });
  await (await db()).put(STORE, handle, ROOT_KEY); return handle;
}

export async function getWorkspaceRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (!isWorkspaceFsSupported()) return null;
  const handle = await (await db()).get(STORE, ROOT_KEY) as FileSystemDirectoryHandle | undefined; if (!handle) return null;
  const extended = handle as ExtendedDir;
  try {
    const state = await extended.queryPermission?.({ mode: 'readwrite' });
    if (state === 'granted' || !state) return handle;
    const requested = await extended.requestPermission?.({ mode: 'readwrite' });
    return requested === 'granted' ? handle : null;
  } catch { return null; }
}
export async function forgetWorkspaceRoot() { await (await db()).delete(STORE, ROOT_KEY); }

function splitPath(path: string) { const parts = path.split('/').filter(Boolean); const file = parts.pop(); if (!file || file === '.' || file === '..' || parts.some((p) => p === '.' || p === '..')) throw new WorkspaceFsError(`Ruta inválida: "${path}"`, 'not-found'); return { dirs: parts, file }; }
async function resolveDirectory(root: FileSystemDirectoryHandle, dirs: string[], create: boolean) { let dir = root; for (const segment of dirs) dir = await dir.getDirectoryHandle(segment, { create }); return dir; }

export async function listWorkspaceFiles(root: FileSystemDirectoryHandle, opts: { maxFiles?: number; extensions?: string[] } = {}): Promise<WorkspaceFile[]> {
  const results: WorkspaceFile[] = []; const maxFiles = Math.min(opts.maxFiles ?? 5000, 20000); const exts = opts.extensions?.map((x) => x.toLowerCase());
  async function walk(dir: FileSystemDirectoryHandle, prefix: string): Promise<void> {
    if (results.length >= maxFiles) return;
    for await (const [name, handle] of dir.entries()) {
      if (results.length >= maxFiles) return; const path = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === 'directory') { if (IGNORED.has(name) || name.startsWith('.')) continue; await walk(handle as FileSystemDirectoryHandle, path); }
      else if (!exts || exts.some((ext) => name.toLowerCase().endsWith(ext))) { results.push({ path, size: (await (handle as FileSystemFileHandle).getFile()).size }); }
    }
  }
  await walk(root, ''); return results;
}

export async function readWorkspaceFile(root: FileSystemDirectoryHandle, path: string) { const { dirs, file } = splitPath(path); try { const f = await (await resolveDirectory(root, dirs, false)).getFileHandle(file).then((h) => h.getFile()); if (f.size > MAX_READABLE_BYTES) throw new WorkspaceFsError(`"${path}" supera el límite de 2MB.`, 'too-large'); return await f.text(); } catch (e) { if (e instanceof WorkspaceFsError) throw e; throw new WorkspaceFsError(`No se pudo leer "${path}".`, 'not-found'); } }
export async function writeWorkspaceFile(root: FileSystemDirectoryHandle, path: string, content: string) { const { dirs, file } = splitPath(path); const handle = await (await resolveDirectory(root, dirs, true)).getFileHandle(file, { create: true }); const writable = await handle.createWritable(); try { await writable.write(content); } finally { await writable.close(); } }
export async function deleteWorkspaceFile(root: FileSystemDirectoryHandle, path: string) { const { dirs, file } = splitPath(path); await (await resolveDirectory(root, dirs, false)).removeEntry(file); }
export async function workspaceFileExists(root: FileSystemDirectoryHandle, path: string) { try { await readWorkspaceFile(root, path); return true; } catch { return false; } }
