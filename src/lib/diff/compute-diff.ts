import { diffLines } from 'diff';

export type DiffLineKind = 'added' | 'removed' | 'unchanged';
export interface DiffLine { kind: DiffLineKind; text: string; oldLineNumber?: number; newLineNumber?: number; }
export interface FileDiff { path: string; lines: DiffLine[]; additions: number; deletions: number; isNew: boolean; isEmpty: boolean; }

export function computeFileDiff(path: string, oldContent: string | null, newContent: string): FileDiff {
  const parts = diffLines(oldContent ?? '', newContent);
  const lines: DiffLine[] = [];
  let oldLineNumber = 1; let newLineNumber = 1; let additions = 0; let deletions = 0;
  for (const part of parts) {
    const partLines = part.value.split('\n');
    if (partLines.at(-1) === '') partLines.pop();
    for (const text of partLines) {
      if (part.added) { lines.push({ kind: 'added', text, newLineNumber: newLineNumber++ }); additions++; }
      else if (part.removed) { lines.push({ kind: 'removed', text, oldLineNumber: oldLineNumber++ }); deletions++; }
      else { lines.push({ kind: 'unchanged', text, oldLineNumber: oldLineNumber++, newLineNumber: newLineNumber++ }); }
    }
  }
  return { path, lines, additions, deletions, isNew: oldContent === null, isEmpty: newContent.trim().length === 0 };
}

export function collapseUnchangedContext(diff: FileDiff, context = 3): (DiffLine | { kind: 'collapsed'; count: number })[] {
  const keep = new Array(diff.lines.length).fill(false) as boolean[];
  diff.lines.forEach((line, i) => { if (line.kind !== 'unchanged') for (let j = Math.max(0, i - context); j <= Math.min(diff.lines.length - 1, i + context); j++) keep[j] = true; });
  const result: (DiffLine | { kind: 'collapsed'; count: number })[] = [];
  for (let i = 0; i < diff.lines.length;) {
    if (keep[i]) { result.push(diff.lines[i]); i++; continue; }
    let count = 0; while (i < diff.lines.length && !keep[i]) { count++; i++; }
    result.push({ kind: 'collapsed', count });
  }
  return result;
}
