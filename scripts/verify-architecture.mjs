import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const required = [
  'src/lib/core/contracts.ts',
  'src/lib/core/runtime.ts',
  'src/lib/core/state-machine.ts',
  'src/lib/core/run-manager.ts',
  'src/lib/core/permissions.ts',
  'src/lib/core/ai-gateway.ts',
  'src/lib/core/project-context.ts',
  'src/lib/core/adapters.ts',
  'src/lib/core/index.ts',
  'src/lib/agent/types.ts',
  'src/lib/agent/runtime.ts',
  'src/lib/agent/executor.ts',
  'docs/architecture/unified-core.md',
  'docs/open-source/mit-agent-references.md',
];

const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error(`Architecture check failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}

const agentTypes = readFileSync(join(root, 'src/lib/agent/types.ts'), 'utf8');
if (!agentTypes.includes("from '../core'")) {
  console.error('Architecture check failed. Agent contracts must come from src/lib/core.');
  process.exit(1);
}

const coreContracts = readFileSync(join(root, 'src/lib/core/contracts.ts'), 'utf8');
if (!coreContracts.includes("export const OMNIAI_CORE_VERSION")) {
  console.error('Architecture check failed. Core version marker is missing.');
  process.exit(1);
}

const agentRuntime = readFileSync(join(root, 'src/lib/agent/runtime.ts'), 'utf8');
if (agentRuntime.includes("export type ExecutionMode = 'cloud'|'private'|'local'")) {
  console.error('Architecture check failed. ExecutionMode must not be redeclared in agent runtime.');
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (packageJson.scripts?.typecheck !== 'tsc --noEmit') {
  console.error('Architecture check failed. Explicit typecheck script is required.');
  process.exit(1);
}

console.log('OMNIAI architecture check passed.');
