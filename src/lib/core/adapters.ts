export interface GitStatus {
  currentBranch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  unstaged: string[];
  conflicts: string[];
}

export interface GitAdapter {
  status(): Promise<GitStatus>;
  diff(path?: string): Promise<string>;
  log(limit?: number): Promise<Array<{ hash: string; subject: string; author?: string; date?: string }>>;
  branches(): Promise<string[]>;
  createBranch(name: string): Promise<void>;
  checkout(name: string): Promise<void>;
  stage(paths: string[]): Promise<void>;
  unstage(paths: string[]): Promise<void>;
  commit(message: string): Promise<{ hash: string }>;
  merge(branch: string): Promise<void>;
  stash(message?: string): Promise<void>;
  push(): Promise<void>;
}

export interface TerminalRequest {
  command: string;
  cwd: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  network?: 'off' | 'restricted' | 'full';
}

export interface TerminalResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface TerminalAdapter {
  run(request: TerminalRequest, signal?: AbortSignal): Promise<TerminalResult>;
  stream?(request: TerminalRequest, signal?: AbortSignal): AsyncIterable<{ type: 'stdout' | 'stderr' | 'exit'; text?: string; exitCode?: number }>;
}

export interface TestRequest {
  command: string;
  cwd: string;
  timeoutMs?: number;
}

export interface TestResult extends TerminalResult {
  passed: boolean;
  command: string;
}

export interface TestRunner {
  detect(candidates: { scripts?: Record<string, string>; files?: string[] }): string[];
  run(request: TestRequest, signal?: AbortSignal): Promise<TestResult>;
}
