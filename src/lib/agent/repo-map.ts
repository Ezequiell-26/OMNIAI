import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export interface RepoNode {
  path: string;
  kind: 'file' | 'directory';
  size?: number;
  extension?: string;
}

const ignored = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage', '.turbo']);
const importantFiles = new Set(['package.json', 'bun.lock', 'pnpm-lock.yaml', 'yarn.lock', 'tsconfig.json', 'next.config.ts', 'next.config.js', 'README.md', 'AGENTS.md']);

export async function createRepoMap(root: string, maxFiles = 2500): Promise<RepoNode[]> {
  const result: RepoNode[] = [];
  const walk = async (current: string): Promise<void> => {
    if (result.length >= maxFiles) return;
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => Number(b.name === 'src') - Number(a.name === 'src') || a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
      if (entry.isDirectory()) {
        result.push({ path: relative, kind: 'directory' });
        await walk(absolute);
      } else {
        const info = await stat(absolute);
        result.push({ path: relative, kind: 'file', size: info.size, extension: path.extname(entry.name).slice(1) || undefined });
      }
      if (result.length >= maxFiles) return;
    }
  };
  await walk(root);
  return result;
}

export async function buildRepoContext(root: string): Promise<string> {
  const map = await createRepoMap(root);
  const important: string[] = [];
  for (const node of map) {
    if (node.kind === 'file' && importantFiles.has(path.basename(node.path))) {
      try {
        const content = await readFile(path.join(root, node.path), 'utf8');
        important.push(`\n### ${node.path}\n${content.slice(0, 8000)}`);
      } catch {
        // File may disappear during an active agent run; map remains usable.
      }
    }
  }
  return [`## Repository map\n${map.map((n) => `${n.kind === 'directory' ? 'D' : 'F'} ${n.path}`).join('\n')}`, important.join('\n')].filter(Boolean).join('\n');
}
