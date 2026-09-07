export interface SandboxLimits {
  timeoutMs: number;
  maxOutputBytes: number;
  maxFilesChanged: number;
  allowNetwork: boolean;
}

export interface SandboxCommand {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  limits: SandboxLimits;
}

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Execution adapter contract. Implement with Docker/isolated process on desktop/self-hosted. */
export interface SandboxAdapter {
  run(command: SandboxCommand, signal?: AbortSignal): Promise<SandboxResult>;
}

export function defaultSandboxLimits(): SandboxLimits {
  return { timeoutMs: 60_000, maxOutputBytes: 1_000_000, maxFilesChanged: 200, allowNetwork: false };
}
