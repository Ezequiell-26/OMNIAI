import { openDB } from 'idb';
import type { AgentToolDefinition, ToolExecutionContext } from '../types';
import { computeFileDiff, type FileDiff } from '@/lib/diff/compute-diff';
import { getWorkspaceRoot, listWorkspaceFiles, readWorkspaceFile, writeWorkspaceFile, deleteWorkspaceFile, workspaceFileExists, WorkspaceFsError } from '@/lib/fs/workspace-fs';

const DB = 'omniai-agent'; const VERSION = 1; const STORE = 'pending-edits';
interface PendingFileEdit { id: string; path: string; diff: FileDiff; newContent: string; createdAt: string; }
async function database() { return openDB(DB, VERSION, { upgrade(db) { if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); } }); }
async function requireRoot() { const root = await getWorkspaceRoot(); if (!root) throw new WorkspaceFsError('Abre una carpeta de proyecto para que OmniAI pueda trabajar sobre ella.', 'no-workspace'); return root; }
async function savePending(edit: PendingFileEdit) { await (await database()).put(STORE, edit); }
async function loadPending(id: string) { return await (await database()).get(STORE, id) as PendingFileEdit | undefined; }
async function removePending(id: string) { await (await database()).delete(STORE, id); }

export const readFileTool: AgentToolDefinition<{ path: string }, { content: string }> = { name: 'read_file', description: 'Lee un archivo de texto del workspace autorizado.', permissions: ['read_files'], execute: async (input) => ({ content: await readWorkspaceFile(await requireRoot(), input.path) }) };

export const searchFilesTool: AgentToolDefinition<{ query?: string; extensions?: string[]; maxResults?: number }, { matches: string[] }> = {
  name: 'search_files', description: 'Busca rutas dentro del workspace sin leer todo el contenido al modelo.', permissions: ['read_files'],
  execute: async (input) => { const files = await listWorkspaceFiles(await requireRoot(), { extensions: input.extensions, maxFiles: 10000 }); const q = input.query?.trim().toLowerCase(); const limit = Math.min(input.maxResults ?? 200, 500); return { matches: (q ? files.filter((f) => f.path.toLowerCase().includes(q)) : files).slice(0, limit).map((f) => f.path) }; },
};

export const writeFileTool: AgentToolDefinition<{ path: string; content: string }, { pendingEditId: string; diff: FileDiff }> = {
  name: 'write_file', description: 'Propone crear o reemplazar un archivo. Nunca escribe directamente: devuelve un diff pendiente de aprobación.', permissions: ['write_files'],
  execute: async (input, ctx) => { const root = await requireRoot(); const exists = await workspaceFileExists(root, input.path); const oldContent = exists ? await readWorkspaceFile(root, input.path) : null; const diff = computeFileDiff(input.path, oldContent, input.content); const id = crypto.randomUUID(); await savePending({ id, path: input.path, diff, newContent: input.content, createdAt: new Date().toISOString() }); ctx.emit({ type: 'file.changed', taskId: ctx.projectId, path: input.path, action: exists ? 'modified' : 'created', ts: new Date().toISOString() }); return { pendingEditId: id, diff }; },
};

export const editFileTool: AgentToolDefinition<{ path: string; find: string; replace: string }, { pendingEditId: string; diff: FileDiff }> = {
  name: 'edit_file', description: 'Propone un reemplazo exacto de texto y devuelve un diff pendiente.', permissions: ['write_files'],
  execute: async (input, ctx) => { const root = await requireRoot(); const oldContent = await readWorkspaceFile(root, input.path); const index = oldContent.indexOf(input.find); if (index < 0) throw new Error(`No se encontró el texto solicitado en "${input.path}".`); const newContent = `${oldContent.slice(0, index)}${input.replace}${oldContent.slice(index + input.find.length)}`; const diff = computeFileDiff(input.path, oldContent, newContent); const id = crypto.randomUUID(); await savePending({ id, path: input.path, diff, newContent, createdAt: new Date().toISOString() }); ctx.emit({ type: 'file.changed', taskId: ctx.projectId, path: input.path, action: 'modified', ts: new Date().toISOString() }); return { pendingEditId: id, diff }; },
};

export const deleteFileTool: AgentToolDefinition<{ path: string }, { pendingEditId: string; diff: FileDiff }> = {
  name: 'delete_file', description: 'Propone eliminar un archivo. La eliminación real requiere aprobación explícita.', permissions: ['delete_files'],
  execute: async (input) => { const root = await requireRoot(); const oldContent = await readWorkspaceFile(root, input.path); const diff = computeFileDiff(input.path, oldContent, ''); const id = crypto.randomUUID(); await savePending({ id, path: input.path, diff, newContent: '', createdAt: new Date().toISOString() }); return { pendingEditId: id, diff }; },
};

export async function applyPendingEdit(id: string) { const edit = await loadPending(id); if (!edit) throw new Error('La propuesta de edición ya no existe.'); const root = await requireRoot(); if (edit.diff.isNew && edit.newContent.length === 0) throw new Error('No se puede aplicar una creación vacía.'); if (edit.newContent.length === 0 && !edit.diff.isNew) await deleteWorkspaceFile(root, edit.path); else await writeWorkspaceFile(root, edit.path, edit.newContent); await removePending(id); }
export async function discardPendingEdit(id: string) { await removePending(id); }
export async function getPendingEdit(id: string) { return await loadPending(id); }
export const FILE_TOOLS: AgentToolDefinition[] = [readFileTool, searchFilesTool, writeFileTool, editFileTool, deleteFileTool];
