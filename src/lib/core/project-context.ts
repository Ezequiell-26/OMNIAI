export interface ProjectManifest {
  framework?: string;
  languages: string[];
  packageManager?: 'bun' | 'npm' | 'pnpm' | 'yarn' | 'cargo' | 'go' | 'pip' | 'unknown';
  dependencies: string[];
  scripts: Record<string, string>;
  entryPoints: string[];
  testCommands: string[];
  buildCommand?: string;
  devCommand?: string;
}

export interface ContextCandidate {
  path: string;
  score: number;
  reasons: string[];
}

export interface ProjectContext {
  manifest: ProjectManifest;
  candidates: ContextCandidate[];
  generatedAt: string;
}

export interface ProjectFileLike {
  path: string;
  content?: string;
}

const FRAMEWORK_MARKERS: Array<[string, string]> = [
  ['next', 'Next.js'],
  ['react', 'React'],
  ['vite', 'Vite'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['angular', 'Angular'],
];

const languageFor = (path: string): string | null => {
  const extension = path.split('.').pop()?.toLowerCase();
  return ({ ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', py: 'Python', rs: 'Rust', go: 'Go', cs: 'C#' } as Record<string, string>)[extension ?? ''] ?? null;
};

export function buildProjectManifest(files: ProjectFileLike[], packageJson?: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> }): ProjectManifest {
  const dependencyMap = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
  const dependencyNames = Object.keys(dependencyMap);
  const framework = FRAMEWORK_MARKERS.find(([marker]) => dependencyNames.includes(marker))?.[1];
  const languages = [...new Set(files.map((file) => languageFor(file.path)).filter((value): value is string => Boolean(value)))];
  const packageManager = files.some((f) => f.path === 'bun.lock') ? 'bun' : files.some((f) => f.path === 'pnpm-lock.yaml') ? 'pnpm' : files.some((f) => f.path === 'yarn.lock') ? 'yarn' : files.some((f) => f.path === 'package-lock.json') ? 'npm' : 'unknown';
  const scripts = packageJson?.scripts ?? {};
  const testCommands = ['test', 'test:ci'].filter((name) => scripts[name]).map((name) => `${packageManager === 'unknown' ? 'npm' : packageManager} run ${name}`);
  const buildCommand = scripts.build ? `${packageManager === 'unknown' ? 'npm' : packageManager} run build` : undefined;
  const devCommand = scripts.dev ? `${packageManager === 'unknown' ? 'npm' : packageManager} run dev` : undefined;
  const entryPoints = files.map((f) => f.path).filter((path) => /(^|\/)(src\/)?(app\/)?(page|layout|main|index|server)\.(ts|tsx|js|jsx)$/.test(path)).slice(0, 50);

  return { framework, languages, packageManager, dependencies: dependencyNames, scripts, entryPoints, testCommands, buildCommand, devCommand };
}

export function rankContextFiles(files: ProjectFileLike[], goal: string, changedPaths: string[] = []): ContextCandidate[] {
  const terms = goal.toLowerCase().split(/[^a-z0-9_$-]+/).filter((term) => term.length >= 3);
  const changed = new Set(changedPaths);
  return files.map((file) => {
    const lower = file.path.toLowerCase();
    let score = 0;
    const reasons: string[] = [];
    if (changed.has(file.path)) { score += 50; reasons.push('changed'); }
    if (/(package\.json|tsconfig|next\.config|prisma|dockerfile|\.env\.example|readme)/i.test(file.path)) { score += 25; reasons.push('project-config'); }
    for (const term of terms) if (lower.includes(term)) { score += 15; reasons.push(`goal:${term}`); }
    if (/(test|spec)\.(ts|tsx|js|jsx|py)$/.test(lower)) { score += 10; reasons.push('test'); }
    if (/\.(ts|tsx|js|jsx|py|rs|go|cs)$/.test(lower)) score += 5;
    return { path: file.path, score, reasons: [...new Set(reasons)] };
  }).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

export function buildProjectContext(files: ProjectFileLike[], goal: string, packageJson?: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> }, changedPaths: string[] = []): ProjectContext {
  return { manifest: buildProjectManifest(files, packageJson), candidates: rankContextFiles(files, goal, changedPaths).slice(0, 100), generatedAt: new Date().toISOString() };
}
