import { NextResponse } from 'next/server';
import { BUILTIN_AGENTS } from '@/lib/agent/orchestrator';
import type { AgentPermission } from '@/lib/agent/types';
import { classifyPermissionRisk } from '@/lib/agent/tool-policy';

export const runtime = 'nodejs';

const permissions: AgentPermission[] = [
  'read_files',
  'write_files',
  'delete_files',
  'run_commands',
  'network',
  'git',
  'browser',
];

export async function GET() {
  return NextResponse.json({
    agents: BUILTIN_AGENTS.map(({ id, name, description, permissions, tools }) => ({ id, name, description, permissions, tools })),
    permissions: permissions.map((permission) => ({ permission, risk: classifyPermissionRisk(permission) })),
    executionModes: ['cloud', 'private', 'local'],
    lifecycle: ['planning', 'running', 'approval_required', 'testing', 'reviewing', 'completed', 'failed', 'cancelled'],
  });
}
