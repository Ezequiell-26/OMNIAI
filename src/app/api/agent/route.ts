import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/agent/runtime';
import { z } from 'zod';

const schema = z.object({
  taskId: z.string().min(1).max(120),
  projectId: z.string().min(1).max(120),
  goal: z.string().min(1).max(20_000),
  mode: z.enum(['cloud', 'private', 'local']).default('cloud'),
  provider: z.string().max(80).optional(),
  model: z.string().max(160).optional(),
});

/** Agent control-plane endpoint. The execution plane stays behind explicit tool/permission adapters. */
export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const orchestrator = new AgentOrchestrator();
    return NextResponse.json(orchestrator.initialSnapshot(payload));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid agent request.', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to create agent run.' }, { status: 500 });
  }
}
